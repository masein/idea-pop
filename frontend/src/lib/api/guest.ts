"use client";

/**
 * Guest play on the public preview: a visitor without an account can play Max, and
 * everything they make stays in THIS browser tab (sessionStorage + memory). Nothing a
 * guest makes is sent to the server: the mission itself is read from the guest-only
 * preview endpoints, every save, star, badge and photo is answered here.
 *
 * Only active on the public preview (never on localhost), and only while nobody is
 * signed in.
 */

import { PUBLIC_PREVIEW } from "@/lib/publicPreview";
import { getAccessToken } from "./auth";
import { getPersona } from "@/lib/auth/persona";
import { MISSION_BADGES, MISSION_XP_MAX, PHOTO_KINDS } from "@/components/challenge/story/missionBadges";

export function isGuest(): boolean {
  if (!PUBLIC_PREVIEW || typeof window === "undefined") return false;
  return !getAccessToken() && !getPersona();
}

/** The game's own progress store: this tab only for guests, the device otherwise. */
export function missionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return isGuest() ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

// ── The "kept for this session only" notice ──────────────────────────────────

export const GUEST_SAVE_EVENT = "ideapop:guest-save";
let pendingNotice: Promise<void> | null = null;
let lastAck = 0;

/** Shows the session-only notice (GuestSaveNotice) and waits until the visitor taps OK.
 *  Saves that happen right after an OK (one action can save twice) don't ask again. */
function confirmSessionOnly(): Promise<void> {
  if (Date.now() - lastAck < 4000) return Promise.resolve();
  if (pendingNotice) return pendingNotice;
  pendingNotice = new Promise<void>((resolve) => {
    const done = () => {
      lastAck = Date.now();
      pendingNotice = null;
      resolve();
    };
    // Nobody listening (the notice isn't mounted): never block the save.
    const ev = new CustomEvent(GUEST_SAVE_EVENT, { detail: { done }, cancelable: true });
    if (window.dispatchEvent(ev)) done();
  });
  return pendingNotice;
}

// ── This tab's store ─────────────────────────────────────────────────────────

type GuestIdea = { id: string; challenge_id: string; text: string; hero_index: number; version: number; project_id: string | null; created_at: string };
type GuestProject = {
  id: string; origin_type: string; origin_id: string; title: string; description: string; materials: string;
  what_was_hard: string; what_to_improve: string; photo_keys: string[]; step_type: string | null;
  requested_visibility: string; effective_visibility: string; created_at: string;
};
type GuestState = {
  steps: Record<string, number>;
  xp: Record<string, number>; // ledger: source key -> xp
  stars: Record<string, number[]>;
  ideas: GuestIdea[];
  projects: GuestProject[];
  photos: Record<string, string>; // project id -> data URL (small photos only)
};

const KEY = "ideapop:guest";
const memoryPhotos = new Map<string, Blob>();

function load(): GuestState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as GuestState;
  } catch {
    /* private mode: memory only */
  }
  return { steps: {}, xp: {}, stars: {}, ideas: [], projects: [], photos: {} };
}

function save(s: GuestState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Full (a big photo): keep going without the photos in storage.
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ ...s, photos: {} }));
    } catch {
      /* memory only */
    }
  }
}

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `g-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const problem = (status: number, slug: string) =>
  new Response(JSON.stringify({ type: slug, title: slug, status }), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });

function totalXp(s: GuestState) {
  return Object.values(s.xp).reduce((a, b) => a + b, 0);
}

/** Give XP once per source (like the server's ledger); returns what was given now. */
function award(s: GuestState, key: string, xp: number): number {
  if (key in s.xp) return 0;
  s.xp[key] = xp;
  return xp;
}

function xpAward(s: GuestState, earned: number) {
  return { xp_earned: earned, xp_total: totalXp(s), level: 1, rank: "Explorer", is_new: earned > 0, cycle_bonus_earned: false };
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

// ── The guest "server" ───────────────────────────────────────────────────────

/** Answers a guest's API call, or returns null to let it go to the network. */
export async function guestFetch(request: Request): Promise<Response | null> {
  if (!isGuest()) return null;
  const url = new URL(request.url, window.location.origin);
  if (!url.pathname.startsWith("/api/")) return null;
  const path = url.pathname.slice(4); // keep the leading "/"
  const parts = path.split("/").filter(Boolean);
  const method = request.method.toUpperCase();
  const body = async () => {
    try {
      return (await request.clone().json()) as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  };

  // Sign-in, sign-up and the preview endpoints themselves go out as usual.
  if (parts[0] === "auth" || parts[0] === "preview" || (parts[0] === "children" && (parts[1] === "login" || parts.length === 1))) return null;

  // The mission list and Max come from the guest-only preview endpoints.
  if (method === "GET" && parts[0] === "challenges" && parts.length <= 2) {
    const to = new URL(`/api/preview${path}${url.search}`, window.location.origin);
    return fetch(to.toString(), { headers: { Accept: "application/json" } });
  }

  // Explore and Library sit faded behind Coming Soon: empty lists keep their layout
  // (instead of a "something went wrong" behind the panel).
  if (method === "GET") {
    const empty = { items: [], total: 0, page: 1, per_page: 20 };
    if (path === "/explore" || path === "/library/quick-makes") return json(empty);
    if (path === "/library/studios" || path === "/library/courses") return json([]);
  }

  const s = load();
  const cid = parts[0] === "challenges" ? parts[1] : "";

  // Missions: attempts and steps (progress only lives in this tab).
  if (method === "POST" && parts[0] === "challenges" && parts[2] === "attempts") {
    return json({ attempt_id: `guest-${cid}`, challenge_id: cid, current_step: s.steps[cid] ?? 1, status: "in_progress" });
  }
  if (method === "PATCH" && parts[0] === "attempts" && parts[2] === "step") {
    const id = parts[1].replace(/^guest-/, "");
    const step = Number((await body()).step) || 1;
    s.steps[id] = Math.max(s.steps[id] ?? 1, step);
    const done = step >= 8;
    const earned = done ? award(s, `solve:${id}`, 20) : 0;
    save(s);
    return json({ attempt_id: parts[1], current_step: step, status: done ? "completed" : "in_progress", xp_earned: earned, cycle_bonus_earned: false });
  }

  // XP, badges, photos and stars, each given once (as the server would).
  if (method === "POST" && parts[2] === "define-bonus") {
    const e = award(s, `define:${cid}`, 5);
    save(s);
    return json(xpAward(s, e));
  }
  if (method === "POST" && parts[2] === "sketch-bonus") {
    const e = award(s, `sketch:${cid}`, 10);
    save(s);
    return json(xpAward(s, e));
  }
  if (method === "POST" && parts[2] === "mission-badge") {
    const key = String((await body()).key ?? "");
    const e = award(s, `badge:${cid}:${key}`, 5);
    save(s);
    return json({ xp_earned: e });
  }
  if (method === "POST" && parts[2] === "photo-bonus") {
    const key = String((await body()).key ?? "");
    const e = award(s, `photo:${cid}:${key}`, 10);
    save(s);
    return json({ xp_earned: e });
  }
  if (method === "GET" && parts[2] === "mission-rewards") {
    const badges = MISSION_BADGES.map((key) => ({ key, xp: s.xp[`badge:${cid}:${key}`] ?? 0, available: 5 }));
    const photos = PHOTO_KINDS.map((key) => ({ key, xp: s.xp[`photo:${cid}:${key}`] ?? 0, available: 10 }));
    const earned = [...badges, ...photos].reduce((a, b) => a + b.xp, 0);
    return json({ badges, photos, xp_earned: earned, xp_max: MISSION_XP_MAX });
  }
  if (method === "POST" && parts[2] === "star") {
    const star = Number((await body()).star);
    const had = s.stars[cid] ?? [];
    const is_new = !had.includes(star);
    s.stars[cid] = is_new ? [...had, star].sort() : had;
    save(s);
    return json({ stars: s.stars[cid], is_new });
  }
  if (method === "GET" && path === "/children/me/challenge-progress") {
    const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
    return json(
      ids.map((id) => ({
        challenge_id: id,
        stars: s.stars[id] ?? [],
        badges: MISSION_BADGES.filter((k) => `badge:${id}:${k}` in s.xp),
        xp: Object.entries(s.xp).filter(([k]) => k.includes(id)).reduce((a, [, v]) => a + v, 0),
        improved_idea: null,
      })),
    );
  }

  // Ideas: kept in this tab, after the "session only" notice.
  if (method === "POST" && parts[2] === "hero-ideas" && parts.length === 3) {
    const b = await body();
    await confirmSessionOnly();
    const version = s.ideas.filter((i) => i.challenge_id === cid).length + 1;
    const idea: GuestIdea = {
      id: uid(), challenge_id: cid, text: String(b.text ?? ""), hero_index: Number(b.hero_index ?? 0),
      version, project_id: null, created_at: new Date().toISOString(),
    };
    s.ideas.push(idea);
    save(s);
    return json({ idea_id: idea.id, version, status: "pending_review", outcome: null, feedback: null, experiment: null, review_available: false });
  }
  if (method === "POST" && parts[2] === "hero-ideas" && parts[3] === "sketch") {
    const b = await body();
    const last = [...s.ideas].reverse().find((i) => i.challenge_id === cid);
    if (last) last.project_id = String(b.project_id ?? "");
    save(s);
    return new Response(null, { status: 204 });
  }
  if (method === "GET" && path === "/children/me/hero-ideas") {
    return json(
      [...s.ideas].reverse().map((i) => ({
        id: i.id, challenge_id: i.challenge_id, challenge_title: "", hero_name: null, text: i.text,
        version: i.version, project_id: i.project_id, created_at: i.created_at,
      })),
    );
  }

  // Projects and their photos: this tab only.
  if (method === "POST" && path === "/projects") {
    const b = await body();
    await confirmSessionOnly();
    const p: GuestProject = {
      id: uid(), origin_type: String(b.origin_type ?? "challenge"), origin_id: String(b.origin_id ?? ""),
      title: String(b.title ?? ""), description: String(b.description ?? ""), materials: String(b.materials ?? ""),
      what_was_hard: String(b.what_was_hard ?? ""), what_to_improve: String(b.what_to_improve ?? ""),
      photo_keys: [], step_type: (b.step_type as string | undefined) ?? null,
      requested_visibility: "private", effective_visibility: "private", created_at: new Date().toISOString(),
    };
    s.projects.push(p);
    save(s);
    return json(p, 201);
  }
  if (method === "POST" && parts[0] === "projects" && parts[2] === "photos" && parts.length === 3) {
    const p = s.projects.find((x) => x.id === parts[1]);
    if (!p) return problem(404, "not-found");
    const blob = await request.clone().blob();
    memoryPhotos.set(p.id, blob);
    p.photo_keys = [`guest/${p.id}`];
    if (blob.size < 1_500_000) {
      try {
        s.photos[p.id] = await blobToDataUrl(blob);
      } catch {
        /* memory only */
      }
    }
    save(s);
    return json(p);
  }
  if (method === "GET" && parts[0] === "projects" && parts[2] === "photo") {
    const mem = memoryPhotos.get(parts[1]);
    if (mem) return new Response(mem, { status: 200, headers: { "Content-Type": mem.type || "image/jpeg" } });
    const data = s.photos[parts[1]];
    if (data) return fetch(data);
    return problem(404, "not-found");
  }
  if (method === "GET" && path === "/me/projects") {
    return json([...s.projects].reverse());
  }

  // AI helpers stay off for guests (the page falls back to its friendly tips);
  // sharing needs an account.
  if (parts[2] === "idea-feedback" || parts[2] === "steps") return problem(404, "not-available");
  if (parts[0] === "challenges" && parts[2] === "ideas") return problem(403, "restricted");

  // Anything else needs an account, exactly as before.
  return null;
}
