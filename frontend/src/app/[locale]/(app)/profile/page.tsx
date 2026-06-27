'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { useAgeMode } from '@/lib/hooks/useAgeMode';
import { fetchKidProgress, fetchMyProjects } from '@/lib/api/client';
import KidXpCard from '@/components/profile/KidXpCard';
import KidMedals from '@/components/profile/KidMedals';
import KidStickerBook from '@/components/profile/KidStickerBook';
import KidProjectsGrid from '@/components/profile/KidProjectsGrid';
import type { components } from '@/lib/api/schema';

type KidProgressResponse = components['schemas']['KidProgressResponse'];
type KidProjectSummary = components['schemas']['KidProjectSummary'];

// ── Parent handoff modal ──────────────────────────────────────────────────────

function ParentHandoffModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      data-testid="parent-handoff-modal"
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4">
        <div className="text-5xl text-center mb-4">🤝</div>
        <h2 className="font-display text-xl text-ink text-center mb-2">
          Get a parent to help!
        </h2>
        <p className="font-body text-ink/70 text-center mb-6">
          Show this screen to your parent. They can upgrade from their account.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          data-testid="handoff-dismiss"
          className="w-full py-2.5 rounded-card border border-ink/20 font-body text-sm text-ink hover:bg-tint-blue transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ── Themes bar ────────────────────────────────────────────────────────────────

const THEMES = [
  { id: 'ocean', label: 'Ocean 🌊', bg: '#C0F0FF' },
  { id: 'forest', label: 'Forest 🌲', bg: '#C8F5C8' },
  { id: 'sunset', label: 'Sunset 🌅', bg: '#FFD6A0' },
  { id: 'lavender', label: 'Lavender 💜', bg: '#F1D8FB' },
];

function ThemesBar({ unlocked, activeTheme, onSelect }: {
  unlocked: boolean;
  activeTheme: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      data-testid="themes-bar"
      className="bg-tint-lavender rounded-card p-4 flex flex-col gap-3"
    >
      <h3 className="font-display text-base text-ink">
        {unlocked ? '🎨 Choose your theme' : '🎨 Themes'}
      </h3>

      {unlocked ? (
        <div className="flex gap-2 flex-wrap">
          {THEMES.map((t) => (
            <button
              key={t.id}
              data-testid={`theme-${t.id}`}
              onClick={() => onSelect(t.id)}
              style={{ backgroundColor: t.bg }}
              className={`px-3 py-1.5 rounded-full font-body text-xs text-ink border-2 transition-all ${
                activeTheme === t.id ? 'border-challenge' : 'border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <p
          data-testid="themes-locked-msg"
          className="font-body text-sm text-ink/50"
        >
          Themes unlock at Level 4 🎨
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const ageMode = useAgeMode();

  const [progress, setProgress] = useState<KidProgressResponse | null>(null);
  const [projects, setProjects] = useState<KidProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('Explorer');
  const [showHandoff, setShowHandoff] = useState(false);
  const [activeTheme, setActiveTheme] = useState('ocean');
  const [projectsList, setProjectsList] = useState<KidProjectSummary[]>([]);

  // Fallback progress for when API isn't reachable yet
  const EMPTY_PROGRESS: KidProgressResponse = {
    level: 1,
    total_xp: 0,
    xp_this_level: 0,
    xp_to_next_level: 150,
    rank: 'Explorer',
    explore_xp: 0,
    learn_xp: 0,
    solve_xp: 0,
    creative_cycle_active: false,
    stickers: [],
    medals: { bronze: 0, silver: 0, gold: 0 },
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kidProfile');
      if (stored) {
        const p = JSON.parse(stored) as { nickname?: string };
        if (p.nickname) setNickname(p.nickname);
      }
    } catch { /* ignore */ }

    Promise.all([
      fetchKidProgress().catch(() => EMPTY_PROGRESS),
      fetchMyProjects().catch(() => [] as KidProjectSummary[]),
    ]).then(([prog, projs]) => {
      setProgress(prog as KidProgressResponse);
      setProjectsList((projs ?? []) as KidProjectSummary[]);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prog = progress ?? EMPTY_PROGRESS;
  const themesUnlocked = prog.level >= 4;

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
    <AppShell section="profile" themesUnlocked={themesUnlocked}>
      {showHandoff && <ParentHandoffModal onDismiss={() => setShowHandoff(false)} />}

      <div data-testid="profile-page" className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Welcome header */}
        <div className="flex items-center gap-4" data-testid="profile-header">
          <div className="w-16 h-16 rounded-full bg-tint-lavender flex items-center justify-center text-3xl flex-shrink-0">
            🐧
          </div>
          <div>
            <h1 className="font-display text-2xl text-ink">Hi, {nickname}!</h1>
            {ageMode === 'older' && (
              <p className="font-body text-sm text-ink/60 mt-0.5">
                Rank: {prog.rank} · Level {prog.level}
              </p>
            )}
          </div>
        </div>

        {/* XP card */}
        {loading ? (
          <div className="bg-white rounded-card shadow-sm p-5 animate-pulse h-32" />
        ) : (
          <KidXpCard progress={prog} ageMode={ageMode} />
        )}

        {/* Medals — older mode only */}
        {ageMode === 'older' && !loading && (
          <KidMedals
            bronze={prog.medals.bronze}
            silver={prog.medals.silver}
            gold={prog.medals.gold}
          />
        )}

        {/* Sticker book */}
        {!loading && <KidStickerBook stickers={prog.stickers} />}

        {/* Projects grid */}
        {!loading && (
          <KidProjectsGrid
            projects={projectsList}
            onVisibilityChanged={handleVisibilityChanged}
          />
        )}
        {loading && (
          <div className="bg-white rounded-card shadow-sm p-5 animate-pulse h-40" />
        )}

        {/* Themes */}
        <ThemesBar
          unlocked={themesUnlocked}
          activeTheme={activeTheme}
          onSelect={setActiveTheme}
        />

        {/* Upgrade CTA — routes to parent handoff, never to checkout */}
        <div
          data-testid="upgrade-section"
          className="bg-tint-lavender rounded-card p-5 text-center flex flex-col gap-3"
        >
          <p className="font-display text-base text-ink">Want more missions?</p>
          <p className="font-body text-sm text-ink/60">Ask a parent to upgrade your plan</p>
          <button
            type="button"
            data-testid="upgrade-btn"
            onClick={() => setShowHandoff(true)}
            className="bg-challenge text-white font-display text-sm px-6 py-2.5 rounded-card self-center"
          >
            Upgrade
          </button>
        </div>
      </div>
    </AppShell>
  );
}
