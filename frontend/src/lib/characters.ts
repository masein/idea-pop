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

/** What the shared dialog is showing: a character's introduction, or what "inspiration" means. */
export type CharacterDialog = { kind: 'intro'; character: CharacterKey } | { kind: 'inspiration' };

type Listener = (current: CharacterDialog | null) => void;

// One dialog at a time for the whole app: anything asked for meanwhile waits its turn, and none
// opens while Popi is speaking. One already open stays open.
let queue: CharacterDialog[] = [];
let current: CharacterDialog | null = null;
let speaking = 0;
const listeners = new Set<Listener>();

const same = (a: CharacterDialog, b: CharacterDialog) =>
  a.kind === b.kind && (a.kind !== 'intro' || (b.kind === 'intro' && a.character === b.character));

function emit() {
  if (!current && speaking === 0 && queue.length > 0) {
    [current] = queue;
    queue = queue.slice(1);
  }
  listeners.forEach((l) => l(current));
}

/** Popi's voice reports here: audio started (true) or finished or stopped (false). */
export function markSpeech(active: boolean) {
  speaking = Math.max(0, speaking + (active ? 1 : -1));
  emit();
}

function show(dialog: CharacterDialog) {
  if ((current && same(current, dialog)) || queue.some((d) => same(d, dialog))) return;
  queue = [...queue, dialog];
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
export function showCharacterIntro(character: CharacterKey) {
  show({ kind: 'intro', character });
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
}

/** The first time this character appears for this kid, it introduces itself: once `ready`, when
 *  the screen has something to finish saying first. */
export function useFirstMeet(character: CharacterKey, ready = true) {
  useEffect(() => {
    if (ready && !hasMetCharacter(character)) showCharacterIntro(character);
  }, [character, ready]);
}
