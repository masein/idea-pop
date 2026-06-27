'use client';

import { useEffect, useState } from 'react';

export type AgeMode = 'young' | 'older';

const YOUNG_CUTOFF_YEAR = 2013;

function deriveAgeMode(birthYear: number): AgeMode {
  return birthYear >= YOUNG_CUTOFF_YEAR ? 'young' : 'older';
}

/**
 * Returns the child's age mode derived from their stored birth year.
 * "young" (≤13 yo, born 2013+): Watch & Wonder — simplified UI, no design secret.
 * "older" (14+ yo, born before 2013): Think & Solve — full design secret shown.
 *
 * The age question is NEVER shown in the app — mode is derived purely from
 * the birth year entered during kid onboarding.
 */
export function useAgeMode(): AgeMode {
  const [mode, setMode] = useState<AgeMode>('young');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kidProfile');
      if (raw) {
        const profile = JSON.parse(raw) as { birth_year?: number };
        if (profile.birth_year) {
          setMode(deriveAgeMode(profile.birth_year));
          return;
        }
      }
      // Fall back to cookie set by API after kid login (kid-scoped JWT contains birth_year)
      const match = document.cookie.match(/kid_age_mode=(young|older)/);
      if (match) setMode(match[1] as AgeMode);
    } catch {
      // localStorage unavailable — stay with default "young" (safer for COPPA)
    }
  }, []);

  return mode;
}
