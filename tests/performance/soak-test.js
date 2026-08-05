/**
 * Soak Test: Lucky Draw — 30-minute sustained load
 *
 * Runs at 60% of the stress breaking-point load for 30 minutes to surface:
 *   - Memory leaks in the Next.js server (participants.list re-allocation)
 *   - Convex function execution time drift over repeated draws
 *   - GSAP animation timeline accumulation (client-side — monitor DevTools)
 *
 * Breaking point estimate (from stress test): ~200 concurrent audience subscribers.
 * Soak target: 120 concurrent subscribers + continuous draw cadence.
 *
 * Run: k6 run tests/performance/soak-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const soakLatency = new Trend("soak_latency_ms", true);
const soakErrors = new Rate("soak_errors");

export const options = {
  stages: [
    { duration: "2m", target: 120 },  // ramp up to soak target
    { duration: "30m", target: 120 }, // soak: sustained load
    { duration: "2m", target: 0 },    // ramp down
  ],
  thresholds: {
    "soak_latency_ms": ["p(95)<200", "p(99)<500"],
    "soak_errors": ["rate<0.05"],
    http_req_failed: ["rate<0.05"],
  },
};

const CONVEX_URL = __ENV.CONVEX_URL || "https://YOUR_DEPLOYMENT.convex.cloud";
const EVENT_ID = __ENV.EVENT_ID || "YOUR_EVENT_ID";

function callQuery(fnPath, args) {
  const start = Date.now();
  const res = http.post(
    `${CONVEX_URL}/api/query`,
    JSON.stringify({ path: fnPath, args, format: "convex" }),
    { headers: { "Content-Type": "application/json" }, timeout: "10s" }
  );
  soakLatency.add(Date.now() - start);
  soakErrors.add(res.status === 200 ? 0 : 1);
  return res;
}

export default function () {
  // Mix of query types to represent real audience + event list traffic
  const scenario = __VU % 3;

  if (scenario === 0) {
    // Heavy query: 300-participant list — watch for payload size growth over time
    const res = callQuery("participants:list", { eventId: EVENT_ID });
    check(res, { "participants.list 200": (r) => r.status === 200 });
  } else if (scenario === 1) {
    // Reactive query: re-pushes on every triggerDraw
    const res = callQuery("draw:getActiveSession", { eventId: EVENT_ID });
    check(res, { "getActiveSession 200": (r) => r.status === 200 });
  } else {
    // listTiers: N+1 pattern — 1 + T DB reads (T = number of prize tiers)
    const res = callQuery("prizes:listTiers", { eventId: EVENT_ID });
    check(res, { "listTiers 200": (r) => r.status === 200 });
  }

  sleep(2);
}
