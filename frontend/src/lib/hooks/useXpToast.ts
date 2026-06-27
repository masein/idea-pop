'use client';

import { useState, useCallback } from 'react';
import type { components } from '@/lib/api/schema';

export type XpAward = components['schemas']['XpAwardResponse'];

export interface XpToastState {
  visible: boolean;
  award: XpAward | null;
}

/**
 * Simple state hook for the XP burst / sticker-earned toast.
 * Call `show(award)` after a successful progress POST; the toast dismisses
 * after `durationMs` ms or when `dismiss()` is called.
 */
export function useXpToast(durationMs = 3000) {
  const [state, setState] = useState<XpToastState>({ visible: false, award: null });

  const show = useCallback(
    (award: XpAward) => {
      setState({ visible: true, award });
      setTimeout(() => setState({ visible: false, award: null }), durationMs);
    },
    [durationMs],
  );

  const dismiss = useCallback(() => setState({ visible: false, award: null }), []);

  return { ...state, show, dismiss };
}
