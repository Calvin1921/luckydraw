/**
 * Load Test: Lucky Draw — triggerDraw hot path
 *
 * Simulates the peak draw scenario: an operator pressing DRAW repeatedly
 * during a live event with 300 participants. The triggerDraw mutation is
 * the most expensive server-side operation (5 DB reads per invocation when
 * allowRepeat=false).
 *
 * Target SLAs:
 *   - p95 mutation latency < 200ms
 *   - p99 mutation latency < 500ms
 *   - error rate < 5%
 *
 * Prerequisites:
 *   - Set CONVEX_URL env var to your deployment URL
 *   - Seed a drawEvent with 300 participants, 1 tier (allowRepeat=false), 50 prizes
 *   - Export SESSION_ID and REMOTE_TOKEN as env vars from the seed step
 *
 * Run: k6 run tests/performance/load-test-draw.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const drawLatency = new Trend("draw_mutation_latency_ms", true);
const drawErrors = new Rate("draw_mutation_errors");

export const options = {
  stages: [
    { duration: "1m", target: 10 },  // ramp up: 10 concurrent operators
    { duration: "5m", target: 10 },  // steady state
    { duration: "1m", target: 0 },   // ramp down
  ],
  thresholds: {
    // triggerDraw p95 < 200ms, p99 < 500ms (SLA)
    "draw_mutation_latency_ms": ["p(95)<200", "p(99)<500"],
    "draw_mutation_errors": ["rate<0.05"],
    // Overall HTTP-level failures
    http_req_failed: ["rate<0.05"],
  },
};

const CONVEX_URL = __ENV.CONVEX_URL || "https://YOUR_DEPLOYMENT.convex.cloud";
const SESSION_ID = __ENV.SESSION_ID || "YOUR_SESSION_ID";
const REMOTE_TOKEN = __ENV.REMOTE_TOKEN || "YOUR_REMOTE_TOKEN";

/**
 * Convex mutations are invoked via HTTP POST to /api/mutation.
 * The body is a JSON-RPC-style envelope.
 */
function callMutation(fnPath, args) {
  const payload = JSON.stringify({
    path: fnPath,
    args: args,
    format: "convex",
  });

  const start = Date.now();
  const res = http.post(`${CONVEX_URL}/api/mutation`, payload, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: "10s",
  });
  const elapsed = Date.now() - start;

  drawLatency.add(elapsed);

  const ok =
    res.status === 200 &&
    !res.json("error");

  if (!ok) {
    drawErrors.add(1);
  } else {
    drawErrors.add(0);
  }

  return { res, elapsed, ok };
}

export default function () {
  // triggerDraw: the primary hot path — 5 DB reads at 300 participants, allowRepeat=false
  const { ok } = callMutation("draw:triggerDraw", {
    sessionId: SESSION_ID,
    remoteToken: REMOTE_TOKEN,
  });

  check(ok, { "triggerDraw succeeded or rate-limited": (v) => v === true });

  // Minimum 3s between draws enforced by the server (MIN_DRAW_INTERVAL_MS).
  // Sleep matches the real operator cadence: one draw every 4–6 seconds.
  sleep(4 + Math.random() * 2);
}
