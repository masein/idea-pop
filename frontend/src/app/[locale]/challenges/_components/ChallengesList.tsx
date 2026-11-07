'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAgeMode } from '@/lib/hooks/useAgeMode';
import { fetchChallenges, fetchClassMission, requestPremiumUnlock } from '@/lib/api/client';
import IdeasWallTab from '@/components/challenge/IdeasWallTab';
import type { components } from '@/lib/api/schema';
import type { ChallengeProgress } from '@/lib/api/client';
import { useChallengeProgressState } from '@/lib/hooks/useChallengeProgress';
import { nextChallenge } from '@/lib/challenges/nextChallenge';
import StarRow from '@/components/challenge/StarRow';
import { discoveryOf } from '@/components/challenge/story/discovery';
import { BADGE_ART, badgeArt, badgeName, type MissionBadgeKey } from '@/components/challenge/story/missionBadges';
import type { MissionStory } from '@/components/challenge/story/types';
import BadgeIcon from '@/components/challenge/story/BadgeIcon';
import AssetSlot from '@/components/AssetSlot';
import ModalClose from '@/components/ModalClose';

type ChallengeDetail = components['schemas']['ChallengeDetail'];


// ── Parent handoff (kids never check out — CLAUDE.md safety rule) ───────────────

function UpgradeHandoffModal({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations('challenge');

  // Queue a "Needs your OK" item on the parent dashboard (idempotent
  // server-side; fine to fire every time the modal opens).
  useEffect(() => {
    requestPremiumUnlock().catch(() => {});
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      data-testid="upgrade-handoff-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 pt-14 text-center shadow-xl">
        <ModalClose onClose={onDismiss} />
        <div className="mx-auto mb-4 h-16 w-16"><AssetSlot id="DASHBOARD-001" /></div>
        <h2 className="mb-2 font-display text-xl font-bold text-ink">{t('upgrade_modal_title')}</h2>
        <p className="mb-5 font-body text-sm text-ink/70">{t('upgrade_modal_body')}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-pill bg-tint-blue px-6 py-2.5 font-display text-sm font-bold text-[#135A85] transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
        >
          {t('upgrade_modal_dismiss')}
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Tab = 'mission' | 'wall';

const PER_PAGE = 10;
// Coming back from a challenge returns the kid to the same page of cards.
const PAGE_KEY = 'challengesPage';

export default function ChallengesList() {
  const t = useTranslations('challenge');
  const router = useRouter();
  const ageMode = useAgeMode();

  const [challenges, setChallenges] = useState<ChallengeDetail[]>([]);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('mission');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [wallUnlocked, setWallUnlocked] = useState(false);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLElement>(null);
  const locale = useLocale();

  useEffect(() => {
    try {
      const saved = Number(sessionStorage.getItem(PAGE_KEY));
      if (saved >= 1) setPage(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchChallenges(locale)
      .then((c) => setChallenges((c ?? []) as ChallengeDetail[]))
      .catch(() => {})
      .finally(() => setLoading(false));
    // The teacher's class assignment is the kid's real "current mission".
    fetchClassMission()
      .then((m) => setAssignedId(m?.challenge_id ?? null))
      .catch(() => {});
  }, [locale]);

  // Stars, badges and XP for the cards the kid can open (one shared state with the header).
  const { progress, loaded: progressLoaded } = useChallengeProgressState(
    challenges.filter((c, i) => !(c.locked ?? i > 0)).map((c) => c.id),
  );

  // Prefer the class-assigned mission; fall back to the first challenge.
  const featured =
    (assignedId && challenges.find((c) => c.id === assignedId)) || challenges[0] || null;

  // The Continue area: what the kid should do next, never a challenge they already finished.
  const ordered = inPageOrder(challenges);
  const next = progressLoaded ? nextChallenge(ordered, progress, assignedId) : null;

  const pageCount = Math.max(1, Math.ceil(ordered.length / PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const firstOnPage = (currentPage - 1) * PER_PAGE;
  const goToPage = (n: number) => {
    setPage(n);
    try {
      sessionStorage.setItem(PAGE_KEY, String(n));
    } catch {
      /* ignore */
    }
    gridRef.current?.scrollIntoView({ block: 'start' });
  };

  useEffect(() => {
    if (!featured) return;
    try {
      setWallUnlocked(localStorage.getItem(`wallSubmitted_${featured.id}`) === 'true');
    } catch {
      /* ignore */
    }
  }, [featured]);

  return (
    <div data-testid="challenges-page" className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-8">
      {showUpgrade && <UpgradeHandoffModal onDismiss={() => setShowUpgrade(false)} />}

      {/* Header */}
      <header className="text-center">
        <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
          {t('header_title')}
        </h1>
        {next?.kind === 'open' && (
          <p className="mt-2 font-body text-lg font-bold text-[#3B4A44] md:text-2xl">
            {t.rich('header_today', {
              title: next.challenge.title,
              hl: (chunks) => <span className="text-[#C2610E]">{chunks}</span>,
            })}
          </p>
        )}
      </header>

      {/* Tab toggle */}
      <div className="flex justify-center">
        <div className="inline-flex gap-1 rounded-pill bg-white p-1.5 shadow-sm" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'mission'}
            data-testid="tab-mission"
            onClick={() => setTab('mission')}
            className={`rounded-pill px-6 min-h-11 font-body text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] focus-visible:ring-offset-1 ${tab === 'mission' ? 'bg-[#1A6FA6] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]' : 'text-[#3E5566] hover:bg-[#EAF5FC] hover:text-[#1F2A33]'}`}
          >
            {t('tab_mission')}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'wall'}
            data-testid="tab-wall"
            onClick={() => setTab('wall')}
            className={`rounded-pill px-6 min-h-11 font-body text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] focus-visible:ring-offset-1 ${tab === 'wall' ? 'bg-[#1A6FA6] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]' : 'text-[#3E5566] hover:bg-[#EAF5FC] hover:text-[#1F2A33]'}`}
          >
            {t('tab_wall')}
          </button>
        </div>
      </div>

      {loading && <div className="h-40 animate-pulse rounded-card bg-white" />}

      {/* ── Mission tab ─────────────────────────────────────────────────────── */}
      {!loading && tab === 'mission' && (
        <div className="flex flex-col gap-6">
          {/* Continue */}
          {!progressLoaded && <div className="h-24 animate-pulse rounded-[1rem] bg-white" />}
          {next?.kind === 'all_done' && (
            <section data-testid="all-challenges-done" className="rounded-[1rem] border border-[#58C6EE] bg-white p-5 text-center shadow-sm">
              <h2 className="font-display text-2xl font-bold text-ink">{t('all_done_title')}</h2>
              <p className="mt-1 font-body text-[15px] font-medium text-[#4A5560]">{t('all_done_text')}</p>
            </section>
          )}
          {next && next.kind !== 'all_done' && (
            <section aria-label={t('continue_aria')} className="flex flex-col gap-2">
              <h2 className="font-display text-2xl font-bold text-ink">{t('continue_heading')}</h2>
              <button
                type="button"
                data-testid="continue-mission"
                onClick={() => (next.kind === 'locked' ? setShowUpgrade(true) : router.push(`/challenges/${next.challenge.id}`))}
                className="group flex items-center gap-4 rounded-[1rem] border border-[#58C6EE] bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] focus-visible:ring-offset-2"
              >
                <span
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-tint-cream text-3xl"
                  aria-hidden="true"
                >
                  <AssetSlot id="CHALLENGE-CARD-001" />
                </span>
                <div className="min-w-0 flex-1">
                  {next.kind === 'locked' ? (
                    <p className="font-body text-lg font-extrabold text-ink">{t('locked_card_title')}</p>
                  ) : (
                    <>
                      <p className="text-lg text-ink [font-family:var(--font-adlam)]">{next.challenge.title}</p>
                      <p className="line-clamp-1 font-body text-[15px] font-medium text-[#4A5560]">{next.challenge.brief}</p>
                    </>
                  )}
                </div>
                {next.kind === 'open' && (
                  <span className="hidden min-h-12 shrink-0 items-center rounded-pill bg-[#1A6FA6] px-7 font-body text-base font-extrabold text-white shadow-[inset_0_0_0_1px_#0F4F7A,0_4px_4px_rgba(0,0,0,0.25)] transition-transform group-hover:scale-105 sm:inline-flex">
                    {t('continue_button')}
                  </span>
                )}
              </button>
            </section>
          )}

          {/* Challenge grid */}
          <section ref={gridRef} data-testid="challenge-grid" aria-label={t('challenges_aria')} className="grid scroll-mt-4 grid-cols-1 gap-5 sm:grid-cols-2">
            {ordered.slice(firstOnPage, firstOnPage + PER_PAGE).map((c, onPage) => {
              const i = firstOnPage + onPage;
              // Prefer the server's entitlement decision; fall back to "first free".
              const locked = c.locked ?? i > 0;
              const assigned = c.id === assignedId;
              return locked ? (
                <LockedChallengeCard
                  key={c.id}
                  index={i + 1}
                  assigned={assigned}
                  onUpgrade={() => setShowUpgrade(true)}
                />
              ) : (
                <UnlockedChallengeCard
                  key={c.id}
                  index={i + 1}
                  challenge={c}
                  assigned={assigned}
                  progress={progress[c.id] ?? null}
                  onOpen={() => router.push(`/challenges/${c.id}`)}
                />
              );
            })}
          </section>

          {pageCount > 1 && (
            <nav aria-label={t('pagination_aria')} data-testid="challenge-pagination" className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: pageCount }, (_, n) => n + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  data-testid={`challenge-page-${n}`}
                  aria-label={t('page_aria', { page: n })}
                  aria-current={n === currentPage ? 'page' : undefined}
                  onClick={() => goToPage(n)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full font-body text-base font-extrabold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] focus-visible:ring-offset-1 ${n === currentPage ? 'bg-[#1A6FA6] text-white' : 'bg-white text-[#135A85] hover:bg-[#EAF5FC]'}`}
                >
                  {n}
                </button>
              ))}
            </nav>
          )}
        </div>
      )}

      {/* ── Ideas Wall tab (IdeasWallTab renders its own safety banner) ──────── */}
      {!loading && tab === 'wall' && featured && (
        <IdeasWallTab
          challengeId={featured.id}
          ageMode={ageMode}
          wallUnlocked={wallUnlocked}
          onWriteMyIdea={() => router.push(`/challenges/${featured.id}`)}
        />
      )}
    </div>
  );
}

// ── Cards ──────────────────────────────────────────────────────────────────────

// The "challenge N" circle from the design: sky blue with dark text (11:1), big enough to read.
const BADGE =
  'absolute bottom-3 right-3 flex h-20 w-20 items-center justify-center rounded-full bg-[#58C6EE] p-1 text-center font-display text-[15px] leading-tight text-[#0E2A3A] shadow-[0_4px_8px_rgba(0,0,0,0.2)] ring-4 ring-white/70';

// Per-mission cover art. Missions not listed here fall back to the shared
// cover, so adding a new image is just a slug → path entry + the file.
const DEFAULT_COVER = '/challenge/mission-cover.png';
const COVER_BY_SLUG: Record<string, string> = {
  'the-guess-who-tree': '/challenge/guess-who-tree.png',
  // Max beside the river, thinking (the third picture of his Mission Brief).
  'help-max-cross-the-river': '/challenge/max/story-3.jpg',
  // The landing page's boy with the train and the bird.
  'the-train-that-went-boom': '/challenge/covers/the-train-that-went-boom.webp',
};

/** Missions shown first on the Challenges page, in this order; the rest keep theirs.
 *  Only the place on the page changes: ids, content and progress stay the same. */
const SHOW_FIRST = ['the-train-that-went-boom'];
function inPageOrder<T extends { slug?: string }>(list: T[]): T[] {
  const first = SHOW_FIRST.map((slug) => list.find((c) => c.slug === slug)).filter((c): c is T => !!c);
  return [...first, ...list.filter((c) => !first.includes(c))];
}
// Where to centre a cover (Max's picture has empty word boxes at the top).
const COVER_POSITION: Record<string, string> = { 'help-max-cross-the-river': 'center 75%' };
// Covers zoomed in from one corner, so an empty word box at the top stays out of the frame.
const COVER_ZOOM: Record<string, { transform: string; transformOrigin: string }> = {
  'help-max-cross-the-river': { transform: 'scale(1.36)', transformOrigin: '42% 100%' },
};
function coverFor(slug: string | undefined, own?: string | null): string {
  return own || (slug && COVER_BY_SLUG[slug]) || DEFAULT_COVER;
}

function UnlockedChallengeCard({
  index,
  challenge,
  assigned = false,
  progress,
  onOpen,
}: {
  index: number;
  challenge: ChallengeDetail;
  assigned?: boolean;
  progress: ChallengeProgress | null;
  onOpen: () => void;
}) {
  const t = useTranslations('challenge');
  const tStory = useTranslations('story');
  // A mouse turns the card on hover. Touch and keyboard use the stars row on the front; a tap
  // on the back, Escape, or moving on to another card turns it again.
  const [open, setOpen] = useState(false);
  const story = (challenge.story ?? null) as MissionStory | null;
  const discovery = discoveryOf(story);
  // The story's Nature Heroes, or the classic clues.
  const nature = story?.clue_cards?.length
    ? story.clue_cards.map((c) => ({ name: c.name, image: c.image ?? null, emoji: c.emoji }))
    : (challenge.nature_clues ?? []).map((c) => ({ name: c.title, image: c.image_url ?? null, emoji: c.emoji }));
  const materials = discovery?.materials ?? [];
  const buildText = challenge.build_instructions ?? '';
  const stars = progress?.stars ?? [];
  const badges = (progress?.badges ?? []).filter((b): b is MissionBadgeKey => b in BADGE_ART);
  const xp = progress?.xp ?? 0;
  const started = stars.length > 0 || xp > 0;
  const backId = `card-back-${challenge.id}`;

  return (
    <div
      data-testid="challenge-card"
      data-assigned={assigned || undefined}
      data-open={open}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
      className={`card-flip story-flip relative h-[27rem] rounded-[1.25rem] ${assigned ? 'ring-2 ring-library ring-offset-2' : ''}`}
    >
      <div className="story-flip-inner h-full">
        {/* ── Front ── */}
        <div className="story-face flex flex-col overflow-hidden rounded-[1.25rem] border border-[#58C6EE] bg-white shadow-sm">
          <button
            type="button"
            data-testid="challenge-card-open"
            onClick={onOpen}
            tabIndex={open ? -1 : 0}
            className="relative flex flex-1 flex-col text-start focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[#0F3F63]"
          >
            {assigned && (
              <span
                data-testid="assigned-badge"
                className="absolute left-3 top-3 z-10 rounded-pill bg-library px-3 py-1 font-display text-xs font-bold text-white shadow-md"
              >
                {t('pinned_badge')}
              </span>
            )}
            {/* #1A7AB8 keeps white text at 4.7:1, close to the design's sky blue. */}
            <div className="w-full bg-[#1A7AB8] px-5 py-4 text-white">
              {/* Card titles share the sidebar labels' face (ADLaM Display, one heavy 400 weight). */}
              <p className="text-xl leading-tight [font-family:var(--font-adlam)]">{challenge.title}</p>
              <p className="mt-1 line-clamp-1 font-body text-[15px] font-semibold">{challenge.brief}</p>
            </div>
            <div className="relative w-full flex-1 overflow-hidden">
              <Image
                src={coverFor(challenge.slug, discovery?.cover)}
                alt=""
                aria-hidden="true"
                fill
                className="object-cover"
                style={{
                  objectPosition: (challenge.slug && COVER_POSITION[challenge.slug]) || 'center',
                  ...((challenge.slug && COVER_ZOOM[challenge.slug]) || {}),
                }}
                sizes="(max-width: 640px) 100vw, 400px"
              />
              {badges.length > 0 && (
                <ul
                  data-testid="card-badges"
                  aria-label={t('card_badges')}
                  className="absolute bottom-3 start-3 flex max-w-[60%] flex-wrap gap-1 rounded-[14px] bg-white/90 p-1.5 shadow-sm"
                >
                  {badges.map((b) => (
                    <li
                      key={b}
                      title={badgeName(story, b, tStory)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF5D1] text-base"
                    >
                      <BadgeIcon art={badgeArt(story, b)} className="h-6 w-6" compact />
                      <span className="sr-only">{badgeName(story, b, tStory)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <span className={BADGE}>{t('challenge_badge', { index })}</span>
            </div>
          </button>
          {/* This challenge's stars and XP; the row also turns the card on touch and keyboard. */}
          <button
            type="button"
            data-testid="card-flip"
            aria-controls={backId}
            aria-expanded={open}
            aria-label={t('card_flip_aria', { title: challenge.title })}
            tabIndex={open ? -1 : 0}
            onClick={() => setOpen(true)}
            className="flex min-h-[3.75rem] w-full items-center gap-3 border-t border-[#D6E4EE] px-4 py-2.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[#0F3F63]"
          >
            <StarRow stars={stars} />
            <span className="flex-1" />
            <span data-testid="card-xp" className="shrink-0 rounded-pill bg-[#EAF5FC] px-2.5 py-1 font-body text-sm font-extrabold text-[#135A85]">
              {t('card_xp', { xp })}
            </span>
          </button>
        </div>

        {/* ── Back: the four Nature Heroes lead, then materials and the way in ── */}
        <div
          id={backId}
          data-testid="challenge-card-back"
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('button')) setOpen(false);
          }}
          className="story-face story-back flex flex-col gap-2 overflow-hidden rounded-[1.25rem] border border-[#58C6EE] bg-[#F7FCFF] p-3 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-lg leading-tight text-ink [font-family:var(--font-adlam)]">{challenge.title}</p>
            <p className="font-body text-xs font-extrabold uppercase tracking-wide text-[#1E7A44]">{t('card_nature')}</p>
          </div>
          <ul data-testid="card-heroes" className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2">
            {nature.slice(0, 4).map((n) => (
              <li key={n.name} className="flex min-h-0 flex-col items-center gap-0.5 text-center">
                <span className="relative block min-h-0 w-full flex-1 overflow-hidden rounded-xl">
                  {n.image ? (
                    <Image src={n.image} alt="" fill sizes="(max-width: 640px) 50vw, 220px" className="object-contain" />
                  ) : (
                    <AssetSlot />
                  )}
                </span>
                <span className="font-body text-xs font-semibold leading-tight text-[#4A5560]">{n.name}</span>
              </li>
            ))}
          </ul>
          <p data-testid="card-materials" className="line-clamp-2 font-body text-[13px] font-medium leading-snug text-ink">
            <span className="me-1.5 text-xs font-extrabold uppercase tracking-wide text-[#A4520B]">{t('card_materials')}</span>
            {materials.length > 0 ? materials.join(' · ') : buildText}
          </p>
          <button
            type="button"
            data-testid="card-enter"
            tabIndex={open ? 0 : -1}
            onClick={onOpen}
            className="flex min-h-11 w-full shrink-0 items-center justify-center rounded-pill bg-[#1A6FA6] px-5 font-body text-base font-extrabold text-white shadow-[0_4px_4px_rgba(0,0,0,0.2)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] focus-visible:ring-offset-2"
          >
            {started ? t('card_continue') : t('card_start')}
          </button>
        </div>
      </div>
    </div>
  );
}

function LockedChallengeCard({
  index,
  assigned = false,
  onUpgrade,
}: {
  index: number;
  assigned?: boolean;
  onUpgrade: () => void;
}) {
  const t = useTranslations('challenge');

  return (
    <button
      type="button"
      data-testid="challenge-card-locked"
      data-assigned={assigned || undefined}
      onClick={onUpgrade}
      aria-label={t('locked_card_aria', { index })}
      className={`group relative flex min-h-[15rem] flex-col items-center justify-center overflow-hidden rounded-[1.25rem] border border-[#58C6EE] p-6 text-center shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] focus-visible:ring-offset-2 ${
        assigned ? 'ring-2 ring-library ring-offset-2' : ''
      }`}
    >
      {assigned && (
        <span
          data-testid="assigned-badge"
          className="absolute left-3 top-3 z-10 rounded-pill bg-library px-3 py-1 font-display text-xs font-bold text-white shadow-md"
        >
          {t('pinned_badge')}
        </span>
      )}
      {/* Blurred, dimmed cover */}
      <Image
        src="/challenge/mission-cover.png"
        alt=""
        aria-hidden="true"
        fill
        className="scale-110 object-cover opacity-30 blur-[3px]"
        sizes="(max-width: 640px) 100vw, 400px"
      />
      <div className="absolute inset-0 bg-tint-blue/70" aria-hidden="true" />
      <span className="relative text-4xl" aria-hidden="true">🔒</span>
      <p className="relative mt-3 max-w-[16rem] font-body text-xl font-extrabold leading-snug text-[#1F2A33]">
        {t('locked_card_title')}
      </p>
      <span
        className={BADGE}
      >
        {t('challenge_badge', { index })}
      </span>
    </button>
  );
}
