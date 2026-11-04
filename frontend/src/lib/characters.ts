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

// One dialog at a time for the whole app: anything asked for meanwhile waits its turn.
let queue: CharacterDialog[] = [];
const listeners = new Set<Listener>();

const same = (a: CharacterDialog, b: CharacterDialog) =>
  a.kind === b.kind && (a.kind !== 'intro' || (b.kind === 'intro' && a.character === b.character));

function emit() {
  listeners.forEach((l) => l(queue[0] ?? null));
}

function show(dialog: CharacterDialog) {
  if (queue.some((d) => same(d, dialog))) return;
  queue = [...queue, dialog];
  emit();
}

export function subscribeCharacterDialog(listener: Listener) {
  listeners.add(listener);
  listener(queue[0] ?? null);
  return () => {
    listeners.delete(listener);
  };
}

export function closeCharacterDialog() {
  queue = queue.slice(1);
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

/** The first time this character appears for this kid, it introduces itself. */
export function useFirstMeet(character: CharacterKey) {
  useEffect(() => {
    if (!hasMetCharacter(character)) showCharacterIntro(character);
  }, [character]);
}
