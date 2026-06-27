'use client';

import { useEffect, useState } from 'react';
import {
  fetchParentChildren,
  fetchChildReport,
  grantConsent,
  revokeConsent,
  fetchSubscription,
  startCheckout,
  openBillingPortal,
} from '@/lib/api/client';
import type { components } from '@/lib/api/schema';

type ParentChild = components['schemas']['ParentChild'];
type ChildReport = components['schemas']['ChildReport'];
type SubscriptionResponse = components['schemas']['SubscriptionResponse'];

// ── Child card ────────────────────────────────────────────────────────────────

function ChildCard({
  child,
  onToggleClass,
  onTogglePublic,
  onViewReport,
}: {
  child: ParentChild;
  onToggleClass: (child: ParentChild) => void;
  onTogglePublic: (child: ParentChild) => void;
  onViewReport: (child: ParentChild) => void;
}) {
  return (
    <div data-testid="child-card" className="bg-white rounded-card shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">🐧</span>
        <div>
          <p className="font-display text-base text-ink">{child.nickname}</p>
          <p className="font-body text-xs text-ink/50">Level {child.level} · {child.total_xp} XP</p>
        </div>
        <div className="ml-auto">
          <span
            data-testid="consent-status"
            className={`font-body text-xs px-2 py-1 rounded-full ${
              child.consent_granted
                ? 'bg-tint-lime text-ink'
                : 'bg-tint-blush text-ink/70'
            }`}
          >
            {child.consent_granted ? '✓ Consent granted' : '⏳ Waiting for consent'}
          </span>
        </div>
      </div>

      {/* Safety toggles */}
      <div className="border border-ink/10 rounded-card p-3 flex flex-col gap-3">
        <p className="font-body text-xs text-ink/50 uppercase tracking-wide">Safety settings</p>

        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-body text-sm text-ink">🏫 Class sharing</span>
            <p className="font-body text-xs text-ink/50">Teacher can see builds</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={child.class_sharing_enabled}
            data-testid="toggle-class-sharing"
            onClick={() => onToggleClass(child)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
              child.class_sharing_enabled ? 'bg-explore' : 'bg-ink/20'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${
                child.class_sharing_enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-body text-sm text-ink">🌍 Public sharing</span>
            <p className="font-body text-xs text-ink/50">Approved ideas go to Ideas Gallery</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={child.public_sharing_enabled}
            data-testid="toggle-public-sharing"
            onClick={() => onTogglePublic(child)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
              child.public_sharing_enabled ? 'bg-explore' : 'bg-ink/20'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${
                child.public_sharing_enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <button
        type="button"
        data-testid="view-report-btn"
        onClick={() => onViewReport(child)}
        className="font-body text-sm text-explore underline text-left"
      >
        View weekly report →
      </button>
    </div>
  );
}

// ── Weekly report modal ───────────────────────────────────────────────────────

function WeeklyReportModal({
  childNickname,
  report,
  onClose,
}: {
  childNickname: string;
  report: ChildReport | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      data-testid="weekly-report-modal"
    >
      <div className="bg-white rounded-card shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">{childNickname}&apos;s week</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink/40 hover:text-ink">✕</button>
        </div>

        {report ? (
          <>
            <div className="grid grid-cols-3 gap-3 text-center" data-testid="report-stats">
              <div className="bg-tint-lime rounded-card py-3">
                <p className="font-display text-2xl text-ink">{report.explore_videos_watched}</p>
                <p className="font-body text-xs text-ink/60">Videos</p>
              </div>
              <div className="bg-tint-cream rounded-card py-3">
                <p className="font-display text-2xl text-ink">{report.lessons_completed}</p>
                <p className="font-body text-xs text-ink/60">Lessons</p>
              </div>
              <div className="bg-tint-blue rounded-card py-3">
                <p className="font-display text-2xl text-ink">{report.challenges_completed}</p>
                <p className="font-body text-xs text-ink/60">Challenges</p>
              </div>
            </div>
            <p className="font-body text-sm text-ink/60">
              +{report.xp_earned} XP earned this week
            </p>

            {report.projects.length > 0 && (
              <div>
                <p className="font-display text-sm text-ink mb-2">Projects this week</p>
                <div className="flex flex-col gap-2">
                  {report.projects.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-tint-blue rounded-card px-3 py-2">
                      <span className="font-body text-sm text-ink">{p.title}</span>
                      <span className="font-body text-xs text-ink/50">{p.visibility}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="animate-pulse h-32 bg-ink/5 rounded-card" />
        )}
      </div>
    </div>
  );
}

// ── Billing section ───────────────────────────────────────────────────────────

function BillingSection({ sub }: { sub: SubscriptionResponse | null }) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout(plan: 'monthly' | 'annual') {
    setLoading(true);
    try {
      const result = await startCheckout(plan);
      if (result?.url) window.location.href = result.url;
    } finally {
      setLoading(false);
    }
  }

  async function handlePortal() {
    setLoading(true);
    try {
      const result = await openBillingPortal();
      if (result?.url) window.location.href = result.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="billing-section" className="bg-white rounded-card shadow-sm p-5 flex flex-col gap-4">
      <h2 className="font-display text-lg text-ink">Plan &amp; billing</h2>

      {sub?.is_premium ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-body text-sm text-ink">{sub.plan ?? 'Premium'} plan · active</p>
              {sub.current_period_end && (
                <p className="font-body text-xs text-ink/50">
                  Renews {new Date(sub.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            data-testid="manage-billing-btn"
            onClick={handlePortal}
            disabled={loading}
            className="font-body text-sm text-explore underline text-left disabled:opacity-50"
          >
            Manage billing →
          </button>
        </>
      ) : (
        <>
          <p className="font-body text-sm text-ink/60">
            Upgrade to unlock all missions, the full library, and unlimited XP.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              data-testid="checkout-monthly-btn"
              onClick={() => handleCheckout('monthly')}
              disabled={loading}
              className="flex-1 bg-explore text-white font-display text-sm py-2.5 rounded-card disabled:opacity-50"
            >
              Monthly
            </button>
            <button
              type="button"
              data-testid="checkout-annual-btn"
              onClick={() => handleCheckout('annual')}
              disabled={loading}
              className="flex-1 bg-ink text-white font-display text-sm py-2.5 rounded-card disabled:opacity-50"
            >
              Annual (save 20%)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [sub, setSub] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportChild, setReportChild] = useState<ParentChild | null>(null);
  const [report, setReport] = useState<ChildReport | null>(null);

  useEffect(() => {
    Promise.all([
      fetchParentChildren().catch(() => [] as ParentChild[]),
      fetchSubscription().catch(() => null),
    ]).then(([kids, subscription]) => {
      setChildren((kids ?? []) as ParentChild[]);
      setSub(subscription as SubscriptionResponse | null);
      setLoading(false);
    });
  }, []);

  async function handleViewReport(child: ParentChild) {
    setReportChild(child);
    setReport(null);
    const r = await fetchChildReport(child.id).catch(() => null);
    setReport(r as ChildReport | null);
  }

  async function handleToggleClass(child: ParentChild) {
    const next = !child.class_sharing_enabled;
    try {
      if (next) await grantConsent(child.id, 'class');
      else await revokeConsent(child.id, 'class');
      setChildren((prev) =>
        prev.map((c) => c.id === child.id ? { ...c, class_sharing_enabled: next } : c)
      );
    } catch { /* silently fail — UI reverts to previous state */ }
  }

  async function handleTogglePublic(child: ParentChild) {
    const next = !child.public_sharing_enabled;
    try {
      if (next) await grantConsent(child.id, 'public');
      else await revokeConsent(child.id, 'public');
      setChildren((prev) =>
        prev.map((c) => c.id === child.id ? { ...c, public_sharing_enabled: next } : c)
      );
    } catch { /* silently fail */ }
  }

  return (
    <div data-testid="parent-dashboard" className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      {reportChild && (
        <WeeklyReportModal
          childNickname={reportChild.nickname}
          report={report}
          onClose={() => setReportChild(null)}
        />
      )}

      <h1 className="font-display text-2xl text-ink">Your family dashboard</h1>

      {/* Children list */}
      <section data-testid="children-section" className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-ink">Your children</h2>
        {loading ? (
          <div className="animate-pulse bg-white rounded-card h-40" />
        ) : children.length === 0 ? (
          <div className="bg-white rounded-card p-6 text-center">
            <p className="font-body text-sm text-ink/50 mb-4">No children added yet</p>
            <a href="/sign-up/kid" className="font-body text-sm text-explore underline">
              Invite your child →
            </a>
          </div>
        ) : (
          children.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              onToggleClass={handleToggleClass}
              onTogglePublic={handleTogglePublic}
              onViewReport={handleViewReport}
            />
          ))
        )}
      </section>

      {/* Billing — numbers live here, never in the kid app */}
      {!loading && <BillingSection sub={sub} />}
    </div>
  );
}
