'use client';

import { useEffect, useState } from 'react';

/**
 * The mission's achievement bar (stars, XP, badges) and the rewards that fly into it.
 *
 * While a reward popup is open, the slots it fills are "held": the bar keeps showing them as
 * they were, so the reward can travel into its place when the popup closes and only then turn
 * fully coloured. Slot names: `star-1..3`, `badge-<key>`, `xp`. The XP slot holds the total
 * from before the reward.
 */

type Held = Map<string, number | true>;
let held: Held = new Map();
const listeners = new Set<(h: Held) => void>();
const emit = () => listeners.forEach((l) => l(held));

/** Keep these slots as they were until their reward lands (xp: the total to keep showing). */
export function holdSlots(slots: string[], xpBefore?: number) {
  const next = new Map(held);
  slots.forEach((s) => next.set(s, true));
  if (xpBefore !== undefined) next.set('xp', xpBefore);
  held = next;
  emit();
}

export function releaseSlots(slots: string[]) {
  const next = new Map(held);
  slots.forEach((s) => next.delete(s));
  held = next;
  emit();
}

/** The bar's view of what is still held back. */
export function useHeldSlots(): Held {
  const [h, setH] = useState<Held>(held);
  useEffect(() => {
    listeners.add(setH);
    setH(held);
    return () => {
      listeners.delete(setH);
    };
  }, []);
  return h;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Sends a copy of `source` (the badge, a star, the XP chip) from where it is now into its slot
 * in the bar, then lets the slot light up. Without motion (or without a source) the slot simply
 * lights up. Resolves when it has landed.
 */
export function flyToSlot(source: Element | null, slot: string): Promise<void> {
  const target = document.querySelector<HTMLElement>(`[data-achievement-slot="${slot}"]`);
  const land = () => {
    releaseSlots([slot]);
    if (target) {
      target.classList.remove('achievement-land');
      // Restart the landing pop.
      void target.offsetWidth;
      target.classList.add('achievement-land');
    }
  };
  if (!source || !target || reducedMotion()) {
    land();
    return Promise.resolve();
  }
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) {
    land();
    return Promise.resolve();
  }
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('data-testid');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    zIndex: '120',
    pointerEvents: 'none',
  });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = Math.max(0.15, Math.min(1, to.width / from.width));
  const anim = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(${(1 + scale) / 2})`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.9 },
    ],
    { duration: 700, easing: 'cubic-bezier(.45,.05,.35,1)' },
  );
  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      ghost.remove();
      land();
      resolve();
    };
    anim.onfinish = done;
    anim.oncancel = done;
    // A hidden tab pauses animations: never leave a copy hanging on the page.
    window.setTimeout(done, 1100);
  });
}

/** The XP total the bar is still showing, while a reward is on its way (else undefined). */
export function heldXp(): number | undefined {
  const v = held.get('xp');
  return typeof v === 'number' ? v : undefined;
}

/** After a reward popup closes: whatever did not fly (a star that was not new after all)
 *  shows as it really is, once the flights have landed. */
export function releaseAllSoon(ms = 800) {
  setTimeout(() => {
    if (held.size === 0) return;
    held = new Map();
    emit();
  }, ms);
}
