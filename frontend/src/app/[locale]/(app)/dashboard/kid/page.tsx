'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

// ─── ParentHandoffModal ───────────────────────────────────────────────────────
// Safety rule: kids MUST see this modal when tapping any paid-plan CTA.
// Never route a kid to a checkout or billing page directly.

function ParentHandoffModal({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations('kid_dashboard');

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('parent_handoff_heading')}
      data-testid="parent-handoff-modal"
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4">
        <div className="text-5xl text-center mb-4">🤝</div>
        <h2 className="font-display text-xl font-bold text-ink text-center mb-2">
          {t('parent_handoff_heading')}
        </h2>
        <p className="font-body text-ink/70 text-center mb-6">
          {t('parent_handoff_body')}
        </p>
        <Button
          variant="secondary"
          className="w-full"
          onClick={onDismiss}
        >
          {t('parent_handoff_dismiss')}
        </Button>
      </div>
    </div>
  );
}

// ─── Mock content helpers ─────────────────────────────────────────────────────

const exploreVideos = [
  { emoji: '🦑', title: 'Masters of Disguise · 3 min', xp: '+5 XP' },
  { emoji: '🌿', title: 'How Plants Talk · 4 min', xp: '+5 XP' },
  { emoji: '🕷️', title: 'Engineers in Silk · 2 min', xp: '+5 XP' },
];

const libraryCards = [
  { emoji: '🔨', title: 'Build a Raft · Beginner' },
  { emoji: '🌱', title: 'Seed Launcher · Intermediate' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KidDashboardPage() {
  const t = useTranslations('kid_dashboard');
  const tp = useTranslations('pricing');

  const [nickname, setNickname] = useState('Explorer');
  const [showHandoff, setShowHandoff] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ideapop_nickname');
    if (stored) setNickname(stored);
  }, []);

  function openHandoff() {
    // Safety: intercepting all upgrade/paid CTAs for kids — show parent handoff
    // instead of routing to checkout. Never let kids reach billing pages.
    setShowHandoff(true);
  }

  return (
    <>
      {showHandoff && <ParentHandoffModal onDismiss={() => setShowHandoff(false)} />}

      {/* ── Restricted banner ─────────────────────────────────────── */}
      <div
        className="w-full bg-tint-lime border-b border-ink/10 px-4 py-3 flex items-center gap-2"
        data-testid="restricted-banner"
      >
        <span aria-hidden="true">🔔</span>
        <p className="font-body text-sm text-ink">{t('restricted_banner')}</p>
      </div>

      <div className="px-4 pb-12">
        {/* ── XP / level strip ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 mt-6 mb-8">
          <span className="text-3xl" aria-hidden="true">🐧</span>
          <div>
            <p className="font-display font-bold text-ink text-lg leading-none">
              {t('welcome', { nickname })}
            </p>
            <p className="font-body text-sm text-ink/60 mt-0.5">
              {t('level_label', { n: 1 })} · 0 {t('xp_label')}
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-8">
          {/* ── Section A: Explore ──────────────────────────────────── */}
          <section className="bg-tint-lime rounded-card p-6">
            <h2 className="font-display font-bold text-xl text-ink mb-4">
              {t('explore_title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {exploreVideos.map((v) => (
                <div key={v.title} className="bg-white rounded-card overflow-hidden shadow-sm">
                  <div className="h-20 bg-ink/5 flex items-center justify-center text-4xl">
                    {v.emoji}
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <p className="font-body text-xs text-ink font-semibold leading-snug">
                      {v.title}
                    </p>
                    <span className="text-xs font-semibold text-explore bg-tint-lime rounded-pill px-2 py-0.5 ml-2 shrink-0">
                      {v.xp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section B: Library (locked) ─────────────────────────── */}
          <section className="bg-tint-blue rounded-card p-6" data-testid="library-locked">
            <h2 className="font-display font-bold text-xl text-ink mb-4">
              {t('library_title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {libraryCards.map((c) => (
                <div key={c.title} className="relative bg-white rounded-card overflow-hidden shadow-sm">
                  <div className="h-24 bg-ink/5 flex items-center justify-center text-4xl">
                    {c.emoji}
                  </div>
                  <div className="p-3">
                    <p className="font-body text-sm text-ink font-semibold">{c.title}</p>
                  </div>
                  {/* Locked overlay */}
                  <div className="absolute inset-0 bg-ink/60 rounded-card flex items-center justify-center text-white font-semibold gap-2">
                    <span aria-hidden="true">🔒</span>
                    <span className="font-body">{t('locked_label')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section C: This week's mission (locked) ─────────────── */}
          <section className="bg-tint-cream rounded-card p-6">
            <h2 className="font-display font-bold text-xl text-ink mb-4">
              {t('challenges_title')}
            </h2>
            <div className="relative bg-white rounded-card overflow-hidden shadow-sm">
              <div className="h-28 bg-ink/5 flex items-center justify-center text-5xl">
                🏆
              </div>
              <div className="p-4">
                <p className="font-body text-sm text-ink font-semibold">
                  Seed Launcher Challenge · Due Sunday
                </p>
                <p className="font-body text-xs text-ink/60 mt-1">
                  Design a seed that travels the farthest
                </p>
              </div>
              {/* Locked overlay */}
              <div className="absolute inset-0 bg-ink/60 rounded-card flex items-center justify-center text-white font-semibold gap-2">
                <span aria-hidden="true">🔒</span>
                <span className="font-body">{t('locked_label')}</span>
              </div>
            </div>
          </section>

          {/* ── Pricing teaser ──────────────────────────────────────── */}
          <section
            className="bg-tint-lavender rounded-2xl p-6 mt-8"
            data-testid="pricing-section"
          >
            <h2 className="font-display font-bold text-xl text-ink mb-1">
              {t('upgrade_heading')}
            </h2>
            <p className="font-body text-sm text-ink/70 mb-6">{t('upgrade_body')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Free plan */}
              <div className="bg-white rounded-card p-5 shadow-sm">
                <p className="font-display font-bold text-lg text-ink mb-0.5">
                  {tp('free_label')}
                </p>
                <p className="font-display text-3xl font-bold text-ink mb-4">$0</p>
                <ul className="space-y-1 mb-5">
                  <li className="font-body text-sm text-ink/70 flex items-start gap-1.5">
                    <span className="text-explore mt-0.5">✓</span> Watch any Explore video
                  </li>
                  <li className="font-body text-sm text-ink/70 flex items-start gap-1.5">
                    <span className="text-explore mt-0.5">✓</span> Try 1 mission per month
                  </li>
                  <li className="font-body text-sm text-ink/70 flex items-start gap-1.5">
                    <span className="text-explore mt-0.5">✓</span> Basic library access
                  </li>
                </ul>
                {/* Safety: clicking this opens the parent handoff modal, NOT checkout */}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={openHandoff}
                >
                  Start for free
                </Button>
              </div>

              {/* Standard plan */}
              <div className="bg-white rounded-card p-5 shadow-sm ring-2 ring-explore">
                <p className="font-display font-bold text-lg text-ink mb-0.5">
                  {tp('standard_label')}
                </p>
                <p className="font-display text-3xl font-bold text-ink mb-0.5">
                  {tp('monthly_price')}
                  <span className="text-base font-body font-normal text-ink/60"> /month</span>
                </p>
                <p className="font-body text-xs text-ink/50 mb-4">
                  or {tp('annual_price')} /year
                </p>
                <ul className="space-y-1 mb-5">
                  <li className="font-body text-sm text-ink/70 flex items-start gap-1.5">
                    <span className="text-explore mt-0.5">✓</span> Unlimited missions
                  </li>
                  <li className="font-body text-sm text-ink/70 flex items-start gap-1.5">
                    <span className="text-explore mt-0.5">✓</span> Full expert library
                  </li>
                  <li className="font-body text-sm text-ink/70 flex items-start gap-1.5">
                    <span className="text-explore mt-0.5">✓</span> Private portfolio
                  </li>
                  <li className="font-body text-sm text-ink/70 flex items-start gap-1.5">
                    <span className="text-explore mt-0.5">✓</span> XP, badges & themes
                  </li>
                </ul>
                {/* Safety: clicking this opens the parent handoff modal, NOT checkout */}
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={openHandoff}
                >
                  Start free trial
                </Button>
              </div>
            </div>

            <p className="font-body text-xs text-ink/50 italic text-center mt-4">
              {tp('kid_note')}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
