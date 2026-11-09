import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Load guest.ts fresh (the live site also has the public preview switched on).
async function loadGuest() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_PUBLIC_PREVIEW', '1');
  return import('./guest');
}

const MAX = '11111111-1111-4111-8111-111111111111';
const req = (path: string, init?: RequestInit) => new Request(`http://localhost:3000/api${path}`, init);
const post = (path: string, body: unknown) =>
  req(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

describe('guest play on the public preview', () => {
  let network: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.cookie = 'ideapop_persona=; path=/; max-age=0';
    network = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', network);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('also works on localhost (no preview switch) for a visitor who is not signed in', async () => {
    vi.resetModules();
    const { guestFetch, isGuest } = await import('./guest');
    expect(isGuest()).toBe(true);
    const res = await guestFetch(post(`/challenges/${MAX}/mission-badge`, { key: 'clue' }));
    expect(res?.status).toBe(200);
    expect(network).not.toHaveBeenCalled();
  });

  it('asks first, then keeps an idea in this tab only, never on the server', async () => {
    const { guestFetch, GUEST_SAVE_EVENT } = await loadGuest();
    const asked = vi.fn((e: Event) => {
      e.preventDefault();
      (e as CustomEvent<{ done: () => void }>).detail.done();
    });
    window.addEventListener(GUEST_SAVE_EVENT, asked);
    const res = await guestFetch(post(`/challenges/${MAX}/hero-ideas`, { text: 'A wide flat boat', hero_index: 0, lang: 'en' }));
    window.removeEventListener(GUEST_SAVE_EVENT, asked);

    expect(asked).toHaveBeenCalledTimes(1);
    expect(res?.status).toBe(200);
    expect((await res!.json()).version).toBe(1);
    expect(network).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('ideapop:guest')).toContain('A wide flat boat');
    expect(JSON.stringify(localStorage)).not.toContain('A wide flat boat');

    const mine = await guestFetch(req('/children/me/hero-ideas'));
    expect((await mine!.json())[0].text).toBe('A wide flat boat');
  });

  it('gives each XP bonus once, like the server', async () => {
    const { guestFetch } = await loadGuest();
    const first = await guestFetch(post(`/challenges/${MAX}/mission-badge`, { key: 'clue' }));
    const again = await guestFetch(post(`/challenges/${MAX}/mission-badge`, { key: 'clue' }));
    expect((await first!.json()).xp_earned).toBe(5);
    expect((await again!.json()).xp_earned).toBe(0);
  });

  it('reads the missions from the guest-only preview endpoints', async () => {
    const { guestFetch } = await loadGuest();
    await guestFetch(req(`/challenges/${MAX}?lang=fa`));
    expect(String(network.mock.calls[0][0])).toContain(`/api/preview/challenges/${MAX}?lang=fa`);
  });

  it('steps aside once someone is signed in', async () => {
    const { guestFetch } = await loadGuest();
    document.cookie = 'ideapop_persona=kid; path=/';
    expect(await guestFetch(post(`/challenges/${MAX}/hero-ideas`, { text: 'x' }))).toBeNull();
  });
});
