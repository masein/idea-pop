'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import PopiAvatar from '@/components/PopiAvatar';
import MissionHelper from '@/components/challenge/MissionHelper';
import { fetchChallenges } from '@/lib/api/client';

/** Which "how this works" blurb to show — chosen from the current route. */
export type HelpSection =
  | 'profile'
  | 'explore'
  | 'library'
  | 'challenge'
  | 'studio'
  | 'mission'
  | 'default';

const BODY_KEY: Record<HelpSection, string> = {
  profile: 'body_profile',
  explore: 'body_explore',
  library: 'body_library',
  challenge: 'body_challenge',
  studio: 'body_studio',
  mission: 'body_mission',
  default: 'body_default',
};

export interface HelpPanelProps {
  section: HelpSection;
  onClose: () => void;
  /** Kids can ask Popi here; the server keeps every gate, moderation and the parents' log. */
  chat?: boolean;
  pathname?: string;
}

const CHALLENGE_PATH = /\/challenges\/([0-9a-f-]{36})/;

/**
 * The panel opened by the floating Popi: Ask Popi for a kid, plus how this page works. Questions
 * are anchored to the challenge on screen, or to the kid's first challenge anywhere else.
 */
export default function HelpPanel({ section, onClose, chat = false, pathname = '' }: HelpPanelProps) {
  const t = useTranslations('help_panel');
  const locale = useLocale();
  const onChallenge = pathname.match(CHALLENGE_PATH)?.[1] ?? null;
  const [challengeId, setChallengeId] = useState<string | null>(onChallenge);

  useEffect(() => {
    if (!chat || onChallenge) return;
    fetchChallenges(locale)
      .then((list) => setChallengeId((list ?? [])[0]?.id ?? null))
      .catch(() => {});
  }, [chat, onChallenge, locale]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        data-testid="help-panel"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[1.5rem] bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <PopiAvatar size={48} />
            <h2 className="font-display text-lg font-bold text-ink">{t('title')}</h2>
          </div>
          <button
            type="button"
            data-testid="help-panel-close"
            onClick={onClose}
            aria-label={t('close')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-lg text-ink/70 transition-colors hover:bg-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {chat && challengeId && (
          <div className="mt-3">
            <MissionHelper challengeId={challengeId} step={1} defaultOpen />
          </div>
        )}
        <p className="mt-3 font-body text-sm leading-relaxed text-ink/80">
          {t(BODY_KEY[section])}
        </p>
      </div>
    </div>
  );
}
