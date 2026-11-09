'use client';

import { useEffect } from 'react';

/** The IDEA POP character family. These names are never translated, in any language. */
export type CharacterKey = 'popi' | 'quizi' | 'scamper' | 'conspy';

export const CHARACTER_NAMES: Record<CharacterKey, string> = {
  popi: 'Popi',
  quizi: 'Quizi',
  scamper: 'Scamper',
  conspy: 'Conspy',
};

/** Inspa: the badge character of the "inspiration" explanation (never translated). Its badge
 *  artwork is pending in the Master Asset Manifest under this ID. */
export const INSPA = { name: 'Inspa', asset: 'CHAR-BADGE-INSPA-001', character: 'CHAR-INSPA-001' } as const;

/** What the shared dialog is showing: a character's introduction, or what "inspiration" means. */
export type CharacterDialog = { kind: 'intro'; character: CharacterKey } | { kind: 'inspiration' };

/** When a first-meet introduction may open (a story section that reads itself aloud first). */
export type MeetOptions = {
  /** Only after the narration has finished and the kid has scrolled since. */
  afterScroll?: boolean;
  /** Only once the kid has met this character (Popi introduces himself before Quizi). */
  after?: CharacterKey;
};

type Queued = { dialog: CharacterDialog; opts: MeetOptions; at: number };

type Listener = (current: CharacterDialog | null) => void;

// One dialog at a time for the whole app: anything asked for meanwhile waits its turn, and none
// opens while Popi is speaking. One already open stays open.
let queue: Queued[] = [];
let current: CharacterDialog | null = null;
let speaking = 0;
// Reward popups and notices on screen: introductions wait until they are closed.
let busy = 0;
// When narration last stopped and the kid last scrolled (for afterScroll introductions).
let speechEndedAt = 0;
let scrolledAt = 0;
let watchingScroll = false;
const listeners = new Set<Listener>();

const same = (a: CharacterDialog, b: CharacterDialog) =>
  a.kind === b.kind && (a.kind !== 'intro' || (b.kind === 'intro' && a.character === b.character));

function ready(q: Queued) {
  if (q.opts.after && !hasMetCharacter(q.opts.after)) return false;
  if (q.opts.afterScroll && scrolledAt <= Math.max(speechEndedAt, q.at)) return false;
  return true;
}

function emit() {
  if (!current && speaking === 0 && busy === 0) {
    const next = queue.find(ready);
    if (next) {
      current = next.dialog;
      queue = queue.filter((q) => q !== next);
    }
  }
  listeners.forEach((l) => l(current));
}

/** Any scroll (the page or a panel), wheel or swipe counts: the kid is reading on. */
function watchScroll() {
  if (watchingScroll || typeof window === 'undefined') return;
  watchingScroll = true;
  const onScroll = () => {
    scrolledAt = Date.now();
    if (queue.length > 0) emit();
  };
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  window.addEventListener('wheel', onScroll, { passive: true });
  window.addEventListener('touchmove', onScroll, { passive: true });
}

/** A reward popup or notice opened (true) or closed (false): no introduction opens over it. */
export function markPopupOpen(open: boolean) {
  busy = Math.max(0, busy + (open ? 1 : -1));
  emit();
}

/** Popi's voice reports here: audio started (true) or finished or stopped (false). */
export function markSpeech(active: boolean) {
  speaking = Math.max(0, speaking + (active ? 1 : -1));
  if (!active && speaking === 0) speechEndedAt = Date.now();
  emit();
}

function show(dialog: CharacterDialog, opts: MeetOptions = {}) {
  if ((current && same(current, dialog)) || queue.some((q) => same(q.dialog, dialog))) return;
  if (opts.afterScroll) watchScroll();
  queue = [...queue, { dialog, opts, at: Date.now() }];
  emit();
}

export function subscribeCharacterDialog(listener: Listener) {
  listeners.add(listener);
  emit();
  return () => {
    listeners.delete(listener);
  };
}

export function closeCharacterDialog() {
  current = null;
  emit();
}

/** Opens a character's introduction again (tapping the character). */
export function showCharacterIntro(character: CharacterKey, opts?: MeetOptions) {
  show({ kind: 'intro', character }, opts);
}

export function showInspirationTip() {
  show({ kind: 'inspiration' });
}

/** Remembered per kid on this device, so each character says hello once across all challenges. */
function metKey(character: CharacterKey) {
  let who = 'kid';
  try {
    const raw = localStorage.getItem('kidProfile');
    who = (raw ? (JSON.parse(raw) as { nickname?: string }).nickname : null) || localStorage.getItem('ideapop_nickname') || who;
  } catch {
    /* ignore */
  }
  return `ideapop:met:${who}:${character}`;
}

export function hasMetCharacter(character: CharacterKey) {
  try {
    return localStorage.getItem(metKey(character)) === '1';
  } catch {
    // No storage (private window): don't repeat the hello on every screen.
    return true;
  }
}

export function markCharacterMet(character: CharacterKey) {
  try {
    localStorage.setItem(metKey(character), '1');
  } catch {
    /* ignore */
  }
  // Someone may have been waiting for this one (Quizi after Popi).
  emit();
}

/** The first time this character appears for this kid, it introduces itself. The rule for every
 *  story and challenge: never over narration. It waits until the narration has finished and the
 *  kid has scrolled, and everyone else waits for Popi, who introduces himself first. One popup
 *  at a time. `isReady` holds it back further while the screen still has something to say. */
export function useFirstMeet(character: CharacterKey, isReady = true, opts?: MeetOptions) {
  const afterScroll = opts?.afterScroll ?? true;
  const after = opts?.after ?? (character === 'popi' ? undefined : 'popi');
  useEffect(() => {
    if (isReady && !hasMetCharacter(character)) showCharacterIntro(character, { afterScroll, after });
  }, [character, isReady, afterScroll, after]);
}
