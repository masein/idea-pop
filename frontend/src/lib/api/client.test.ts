import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClass } from './client';
import { setAccessToken } from './auth';

/**
 * Regression: a POST that starts with a stale/absent access token must be
 * replayed after a successful refresh WITH ITS BODY INTACT. The old
 * middleware cloned the request after its body stream was consumed, so the
 * replay went out empty and class creation failed after a page reload.
 */
describe('auth middleware 401→refresh→replay', () => {
  const realFetch = global.fetch;
  let calls: Array<{ url: string; method: string; body: string | null; auth: string | null }>;

  beforeEach(() => {
    setAccessToken(null); // simulate a fresh page load: memory token gone
    calls = [];
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      // The app fetches relative URLs (same-origin by design); resolve them
      // like a browser would so Node's Request accepts them.
      const req =
        input instanceof Request
          ? input
          : new Request(new URL(String(input), 'http://localhost:3000'), init);
      const body = req.method === 'POST' ? await req.clone().text() : null;
      calls.push({
        url: new URL(req.url, 'http://localhost').pathname,
        method: req.method,
        body,
        auth: req.headers.get('authorization'),
      });

      if (req.url.includes('/auth/refresh')) {
        return new Response(JSON.stringify({ access_token: 'fresh-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (req.url.includes('/classes')) {
        // First attempt (no/stale token) → 401; replay with the fresh token → 201.
        if (req.headers.get('authorization') === 'Bearer fresh-token') {
          return new Response(
            JSON.stringify({ class_id: 'cls-1', name: 'Room 7', class_code: 'ABC123' }),
            { status: 201, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ title: 'unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
    setAccessToken(null);
  });

  it('createClass() succeeds with no in-memory token but a valid refresh cookie', async () => {
    const result = await createClass('Room 7');
    expect(result.class_code).toBe('ABC123');

    const classCalls = calls.filter((c) => c.url.endsWith('/classes'));
    expect(classCalls).toHaveLength(2);
    // The replay must carry BOTH the fresh token and the original body.
    expect(classCalls[1].auth).toBe('Bearer fresh-token');
    expect(JSON.parse(classCalls[1].body ?? '{}')).toEqual({ name: 'Room 7' });
    // And a refresh happened in between.
    expect(calls.some((c) => c.url.endsWith('/auth/refresh'))).toBe(true);
  });
});
