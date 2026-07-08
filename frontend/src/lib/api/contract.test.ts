import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Contract-drift guardrail: every endpoint the frontend calls must exist in
 * the backend router with the same method. This is exactly the class of bug
 * that shipped a teacher dashboard calling GET /teacher/class (404 for
 * months) and a kid onboarding calling an adult-gated POST /children — e2e
 * mocks can't catch it, this test does.
 *
 * Client side:  apiClient.METHOD("/api/...") in client.ts + raw fetch("/api/...")
 *               calls in auth.ts.
 * Backend side: .route("...", method(...)) entries in crates/api/src/lib.rs.
 * The /api prefix is stripped by the Next rewrite; {param} ≙ :param.
 */

const FRONTEND_ROOT = path.resolve(__dirname, '../../..');
const BACKEND_LIB = path.resolve(FRONTEND_ROOT, '../backend/crates/api/src/lib.rs');

function clientCalls(): Array<{ method: string; path: string }> {
  const calls: Array<{ method: string; path: string }> = [];
  const client = readFileSync(path.join(__dirname, 'client.ts'), 'utf8');
  for (const m of client.matchAll(/apiClient\.(GET|POST|PUT|PATCH|DELETE)\(\s*["'`](\/[^"'`]+)["'`]/g)) {
    calls.push({ method: m[1], path: m[2] });
  }
  const auth = readFileSync(path.join(__dirname, 'auth.ts'), 'utf8');
  for (const m of auth.matchAll(/fetch\(\s*[`"'](\/api\/[^`"']+)[`"'][\s\S]*?method:\s*["'](\w+)["']/g)) {
    calls.push({ method: m[2].toUpperCase(), path: m[1] });
  }
  return calls;
}

function backendRoutes(): Set<string> {
  const lib = readFileSync(BACKEND_LIB, 'utf8');
  const routes = new Set<string>();
  // .route("/path", get(handler).put(other)) — capture path + every method.
  for (const m of lib.matchAll(/\.route\(\s*"([^"]+)"\s*,\s*(?:axum::routing::)?([a-z_]+)\(([\s\S]*?)\)\s*(?:\.([a-z_]+)\([^)]*\))?\s*,?\s*\)/g)) {
    const [, routePath, firstMethod, , chained] = m;
    routes.add(`${firstMethod.toUpperCase()} ${routePath}`);
    if (chained) routes.add(`${chained.toUpperCase()} ${routePath}`);
  }
  return routes;
}

function normalize(clientPath: string): string {
  return clientPath
    .replace(/^\/api/, '')
    .replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Known, deliberate drift — each entry needs a product decision, not a
 * silent fix. Anything NOT on this list fails the build.
 *
 * - POST /consents/grant + /consents/revoke: the parent-dashboard sharing
 *   toggles call these with {child_id, scope}, but the backend only has the
 *   token-based COPPA flow (/consents/{token}/grant emailed to the parent).
 *   An adult-authenticated grant-by-dashboard endpoint is a consent-model
 *   decision — tracked for the next auth/consent PR.
 */
const KNOWN_DRIFT = new Set(['POST /consents/grant', 'POST /consents/revoke']);

describe('frontend↔backend API contract', () => {
  it('every client call has a matching backend route (method + path)', () => {
    const routes = backendRoutes();
    expect(routes.size).toBeGreaterThan(20); // parser sanity — never pass vacuously

    const calls = clientCalls();
    expect(calls.length).toBeGreaterThan(20);

    const missing = calls
      .map((c) => ({ ...c, normalized: `${c.method} ${normalize(c.path)}` }))
      .filter((c) => !routes.has(c.normalized) && !KNOWN_DRIFT.has(c.normalized));

    expect(
      missing.map((c) => `${c.method} ${c.path} → no backend route ${c.normalized}`),
    ).toEqual([]);
  });
});
