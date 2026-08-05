/**
 * Load Test: Lucky Draw — Audience page reactive query subscriptions
 *
 * Simulates many audience members opening /draw/[eventId]/audience simultaneously.
 * Each subscriber opens a WebSocket connection to Convex and receives:
 *   - api.events.get        (small, stable)
 *   - api.draw.getActiveSession  (re-pushes on every draw)
 *   - api.participants.list      (300 participants — ~18–24 KB payload per subscriber)
 *
 * The concern: when triggerDraw fires, Convex must fan-out the updated session
 * to ALL active subscribers. At 200 audience members, that is 200 simultaneous
 * reactive pushes of the session document.
 *
 * This test uses HTTP polling (k6 does not natively support WebSockets for
 * Convex's sync protocol). Use the Convex dashboard "Function Latency" panel
 * for true WebSocket fan-out metrics during this test.
 *
 * Run: k6 run tests/performance/load-test-audience.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const queryLatency = new Trend("audience_query_latency_ms", true);
const participantPayloadBytes = new Trend("participants_payload_bytes");
const queryErrors = new Rate("audience_query_errors");

export const options = {
  stages: [
    { duration: "2m", target: 50 },   // ramp to 50 simulated audience browsers
    { duration: "5m", target: 200 },  // stress: 200 concurrent audience members
    { duration: "2m", target: 0 },    // ramp down
  ],
  thresholds: {
    "audience_query_latency_ms": ["p(95)<200", "p(99)<500"],
    "audience_query_errors": ["rate<0.05"],
    http_req_failed: ["rate<0.05"],
  },
};

const CONVEX_URL = __ENV.CONVEX_URL || "https://YOUR_DEPLOYMENT.convex.cloud";
const EVENT_ID = __ENV.EVENT_ID || "YOUR_EVENT_ID";

function callQuery(fnPath, args) {
  const payload = JSON.stringify({
    path: fnPath,
    args: args,
    format: "convex",
  });

  const start = Date.now();
  const res = http.post(`${CONVEX_URL}/api/query`, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: "10s",
  });
  const elapsed = Date.now() - start;

  queryLatency.add(elapsed);

  const ok = res.status === 200;
  queryErrors.add(ok ? 0 : 1);

  return { res, elapsed, ok };
}

export default function () {
  // Simulate what the audience page loads on first render
  const { res: participantsRes, ok: pOk } = callQuery("participants:list", {
    eventId: EVENT_ID,
  });

  if (pOk && participantsRes.body) {
    participantPayloadBytes.add(participantsRes.body.length);
  }

  check(pOk, { "participants.list returned 200": (v) => v === true });

  // Also query active session — this is what re-fires on every draw
  const { ok: sOk } = callQuery("draw:getActiveSession", {
    eventId: EVENT_ID,
  });

  check(sOk, { "getActiveSession returned 200": (v) => v === true });

  // Audience members do not poll — they hold a WebSocket subscription.
  // This sleep simulates a realistic "check every 2s" polling approximation.
  sleep(2);
}
