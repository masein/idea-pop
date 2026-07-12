'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAgeMode } from '@/lib/hooks/useAgeMode';
import { fetchKidProgress, fetchMyProjects } from '@/lib/api/client';
import { levelProgress } from '@/lib/progress';
import { AVATARS } from '@/lib/avatars';
import KidMedals from '@/components/profile/KidMedals';
import KidProjectsGrid from '@/components/profile/KidProjectsGrid';
import type { components } from '@/lib/api/schema';

type KidProgressResponse = components['schemas']['KidProgressResponse'];
type KidProjectSummary = components['schemas']['KidProjectSummary'];

const LIME = '#CDEB5A';

// ── Parent handoff modal ──────────────────────────────────────────────────────

function ParentHandoffModal({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations('profile');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50"
      role="dialog"
      aria-modal="true"
      data-testid="parent-handoff-modal"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-4 text-center text-5xl">🤝</div>
        <h2 className="mb-2 text-center font-display text-xl font-bold text-ink">
          {t('handoff_heading')}
        </h2>
        <p className="mb-6 text-center font-body text-ink/70">
          {t('handoff_body')}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          data-testid="handoff-dismiss"
          className="w-full rounded-card border border-ink/20 py-2.5 font-body text-sm text-ink transition-colors hover:bg-tint-blue"
        >
          {t('handoff_dismiss')}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const t = useTranslations('profile');
  const ageMode = useAgeMode();

  const [progress, setProgress] = useState<KidProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState<string>('');
  const [showHandoff, setShowHandoff] = useState(false);
  const [projectsList, setProjectsList] = useState<KidProjectSummary[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const EMPTY_PROGRESS: KidProgressResponse = {
    xp_total: 0,
    level: 1,
    rank: 'Explorer',
    explore_count: 0,
    learn_count: 0,
    solve_count: 0,
    medals: { explore: null, learn: null, solve: null },
    creative_cycles_completed: 0,
    badges: [],
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kidProfile');
      if (stored) {
        const p = JSON.parse(stored) as { nickname?: string; avatar_id?: string };
        if (p.nickname) setNickname(p.nickname);
        if (p.avatar_id) setAvatarId(p.avatar_id);
      }
    } catch {
      /* ignore */
    }

    Promise.all([
      fetchKidProgress().catch(() => EMPTY_PROGRESS),
      fetchMyProjects().catch(() => ({ items: [] as KidProjectSummary[] })),
    ]).then(([prog, projs]) => {
      setProgress(prog as KidProgressResponse);
      // /api/me/projects returns { items: [...] }; stay array-safe regardless of shape.
      const items = Array.isArray(projs)
        ? projs
        : ((projs as { items?: KidProjectSummary[] } | null)?.items ?? []);
      setProjectsList(items as KidProjectSummary[]);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prog = progress ?? EMPTY_PROGRESS;
  const avatar = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
  // Derive level-bracket progress from xp_total (never NaN — see lib/progress).
  const lp = levelProgress(prog.xp_total, prog.level);
  const pct = lp.pct;
  const xpToNext = lp.remaining;
  // Backend medals are per-adventure tier strings; tally them into tier counts.
  const medalTiers = [prog.medals.explore, prog.medals.learn, prog.medals.solve];
  const medalCount = (tier: string) => medalTiers.filter((m) => m === tier).length;

  function handleVisibilityChanged(
    projectId: string,
    visibility: 'private' | 'class' | 'public',
  ) {
    setProjectsList((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, visibility, visibility_pending: visibility !== 'private' }
          : p,
      ),
    );
  }

  return (
    <>
      {showHandoff && <ParentHandoffModal onDismiss={() => setShowHandoff(false)} />}

      <div data-testid="profile-page" className="mx-auto flex max-w-3xl flex-col gap-7 px-4 py-6">
        {/* Header + XP strip */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center" data-testid="profile-header">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-4xl shadow-sm ring-4 ring-white"
            style={{ backgroundColor: avatar.bg }}
          >
            {avatar.img ? (
              <Image
                src={avatar.img}
                alt={avatar.label}
                width={80}
                height={80}
                className="h-full w-full object-contain"
                priority
              />
            ) : (
              <span aria-hidden="true">{avatar.emoji}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-ink">
              {t('greeting', { name: nickname || t('default_nickname') })}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-pill px-4 py-1.5 font-display text-sm font-bold text-[#1F4D33]"
                style={{ backgroundColor: LIME }}
              >
                <Image src="/kid/xp-star.png" alt="" width={16} height={16} className="h-4 w-4" aria-hidden="true" />
                {t('start_your_level')}
              </span>
              <span dir="ltr" className="font-body text-sm font-semibold text-ink/70">
                {t('xp_progress', { current: lp.into, max: lp.span })}{' '}
                <span className="text-ink">
                  {t('xp_to_level', { remaining: xpToNext, next: lp.nextLevel })}
                </span>
              </span>
              <span className="text-lg" aria-hidden="true">🏁</span>
            </div>
            <div className="relative mt-2 h-5 w-full overflow-hidden rounded-full bg-black/5">
              <div
                data-testid="xp-bar"
                className="h-full rounded-full bg-explore transition-all"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('xp_bar_aria', { current: lp.into, max: lp.span })}
              />
            </div>
          </div>
        </div>

        <p className="w-fit rounded-pill bg-white px-4 py-1.5 font-body text-sm font-semibold text-ink shadow-sm">
          ⚡ {t('level_up_hint', { xp: lp.remaining })}
        </p>

        {/* 3 adventures */}
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-bold text-ink">
            {t('xp_source_heading', { count: 3 })}
          </h2>
          <p className="font-body font-semibold text-ink/70">
            {t('adventures_sub')}
          </p>

          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
            className="mt-2 flex w-full items-center justify-between border-t border-explore/30 pt-2 font-display text-sm font-bold text-[#1E5B2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
          >
            {t('more_details')}
            <span aria-hidden="true">{detailsOpen ? '▲' : '▼'}</span>
          </button>

          {detailsOpen && !loading && (
            <div className="mt-3 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'adventure_explore', count: prog.explore_count, emoji: '🌿' },
                  { key: 'adventure_learn', count: prog.learn_count, emoji: '📚' },
                  { key: 'adventure_solve', count: prog.solve_count, emoji: '🔧' },
                ].map((a) => (
                  <div key={a.key} className="rounded-card bg-white p-4 text-center shadow-sm">
                    <div className="text-2xl" aria-hidden="true">{a.emoji}</div>
                    <p className="mt-1 font-display font-bold text-ink">{t(a.key)}</p>
                    <p className="font-body text-sm text-ink/60">
                      {t('adventure_count', { count: Number.isFinite(a.count) ? a.count : 0 })}
                    </p>
                  </div>
                ))}
              </div>
              {ageMode === 'older' && (
                <KidMedals
                  bronze={medalCount('bronze')}
                  silver={medalCount('silver')}
                  gold={medalCount('gold')}
                />
              )}
            </div>
          )}
        </section>

        {/* My projects */}
        {!loading && (
          <KidProjectsGrid
            projects={projectsList}
            onVisibilityChanged={handleVisibilityChanged}
          />
        )}
        {loading && <div className="h-40 animate-pulse rounded-card bg-white" />}

        {/* Upgrade → parent handoff (never checkout) */}
        <div
          data-testid="upgrade-section"
          className="flex flex-col items-center gap-3 rounded-card bg-tint-lavender p-5 text-center sm:flex-row sm:justify-center sm:text-left"
        >
          <Image
            src="/kid/upgrade-girl.png"
            alt=""
            width={120}
            height={120}
            className="h-28 w-auto shrink-0 select-none drop-shadow-sm"
            aria-hidden="true"
          />
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="font-display text-base font-bold text-ink">{t('upgrade_heading')}</p>
            <p className="font-body text-sm text-ink/60">{t('upgrade_handoff')}</p>
            <button
              type="button"
              data-testid="upgrade-btn"
              onClick={() => setShowHandoff(true)}
              className="mt-1 rounded-pill bg-challenge px-6 py-2.5 font-display text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge focus-visible:ring-offset-2"
            >
              {t('upgrade_cta')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
