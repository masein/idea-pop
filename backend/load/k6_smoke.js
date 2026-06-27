/**
 * Idea Pop — k6 load test (smoke + realistic concurrency)
 *
 * Targets: content endpoints (explore, challenges) + progress.
 * Does NOT require a running backend with data — exercise structure,
 * auth plumbing, and error-handling at realistic concurrency.
 *
 * Usage (local Docker Compose stack running):
 *   BASE_URL=http://localhost:8080 k6 run backend/load/k6_smoke.js
 *
 * Thresholds (p95 < 500 ms, error rate < 1 %) are enforced.
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ─────────────────────────────────────────────────────────────

const errorRate = new Rate('custom_errors');
const contentLatency = new Trend('content_latency_ms');
const authLatency = new Trend('auth_latency_ms');

// ── Test options ───────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Ramp up
    { duration: '30s', target: 20 },  // Hold at 20 VUs (realistic peak)
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],          // 95th percentile < 500 ms
    http_req_failed: ['rate<0.01'],            // < 1 % errors
    custom_errors: ['rate<0.05'],
    content_latency_ms: ['p(95)<300'],
    auth_latency_ms: ['p(95)<400'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// ── Shared setup: register a test user and get a token ────────────────────────

let sharedToken = null;

export function setup() {
  const email = `loadtest_${Date.now()}@example.com`;
  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email, password: 'loadtest-pw-123' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status !== 201) {
    console.error(`Setup failed: register returned ${res.status}`);
    return { token: null };
  }
  const body = JSON.parse(res.body);
  return { token: body.access_token };
}

// ── Main scenario ─────────────────────────────────────────────────────────────

export default function (data) {
  const token = data.token;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // ── Health probes ─────────────────────────────────────────────────────────

  group('health', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'health 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  // ── Content: Explore ─────────────────────────────────────────────────────

  group('explore', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/explore`, { headers: authHeader });
    contentLatency.add(Date.now() - start);
    const ok = check(res, {
      'explore status not 5xx': (r) => r.status < 500,
    });
    errorRate.add(!ok);
  });

  // ── Content: Challenges list ──────────────────────────────────────────────

  group('challenges', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/challenges`, { headers: authHeader });
    contentLatency.add(Date.now() - start);
    const ok = check(res, {
      'challenges status not 5xx': (r) => r.status < 500,
    });
    errorRate.add(!ok);
  });

  // ── Content: Library studios ──────────────────────────────────────────────

  group('library', () => {
    const res = http.get(`${BASE_URL}/library/studios`, { headers: authHeader });
    check(res, { 'studios status not 5xx': (r) => r.status < 500 });
  });

  // ── Auth: verify token round-trip ─────────────────────────────────────────

  if (token) {
    group('me', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/me`, { headers: authHeader });
      authLatency.add(Date.now() - start);
      check(res, { 'me 200': (r) => r.status === 200 });
    });
  }

  sleep(1);
}

// ── Teardown: report summary ──────────────────────────────────────────────────

export function teardown(data) {
  console.log(`Load test complete. Token obtained: ${!!data.token}`);
}
