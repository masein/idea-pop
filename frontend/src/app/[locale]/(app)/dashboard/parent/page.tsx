'use client';

import Image from 'next/image';
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
import { AVATARS } from '@/lib/avatars';
import type { components } from '@/lib/api/schema';

type ParentChild = components['schemas']['ParentChild'];
type ChildReport = components['schemas']['ChildReport'];
type SubscriptionResponse = components['schemas']['SubscriptionResponse'];

const GREEN = '#1e7a44'; // explore green — AA-safe with white

function avatarFor(id: string) {
  return AVATARS.find((a) => a.id === id) ?? null;
}

// ── Avatar bubble ──────────────────────────────────────────────────────────────

function AvatarBubble({ avatarId, size = 44 }: { avatarId: string; size?: number }) {
  const a = avatarFor(avatarId);
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl ring-2 ring-white"
      style={{ width: size, height: size, backgroundColor: a?.bg ?? '#FBF7D5' }}
      aria-hidden="true"
    >
      {a?.img ? (
        <Image src={a.img} alt="" width={size} height={size} className="h-full w-full object-contain" />
      ) : (
        <span>{a?.emoji ?? '🧒'}</span>
      )}
    </span>
  );
}

// ── Weekly report modal (kept — golden-path test target) ───────────────────────

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      data-testid="weekly-report-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-card bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">{childNickname}&apos;s week</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink/40 hover:text-ink">
            ✕
          </button>
        </div>

        {report ? (
          <>
            <div className="grid grid-cols-3 gap-3 text-center" data-testid="report-stats">
              <div className="rounded-card bg-tint-lime py-3">
                <p className="font-display text-2xl font-bold text-ink">{report.explore_videos_watched}</p>
                <p className="font-body text-xs text-ink/60">Videos</p>
              </div>
              <div className="rounded-card bg-tint-cream py-3">
                <p className="font-display text-2xl font-bold text-ink">{report.lessons_completed}</p>
                <p className="font-body text-xs text-ink/60">Lessons</p>
              </div>
              <div className="rounded-card bg-tint-blue py-3">
                <p className="font-display text-2xl font-bold text-ink">{report.challenges_completed}</p>
                <p className="font-body text-xs text-ink/60">Challenges</p>
              </div>
            </div>
            <p className="font-body text-sm text-ink/60">+{report.xp_earned} XP earned this week</p>

            {report.projects.length > 0 && (
              <div>
                <p className="mb-2 font-display text-sm font-bold text-ink">Projects this week</p>
                <div className="flex flex-col gap-2">
                  {report.projects.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-card bg-tint-blue px-3 py-2"
                    >
                      <span className="font-body text-sm text-ink">{p.title}</span>
                      <span className="font-body text-xs text-ink/60">{p.visibility}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-32 animate-pulse rounded-card bg-ink/5" />
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [reports, setReports] = useState<Record<string, ChildReport>>({});
  const [sub, setSub] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportChild, setReportChild] = useState<ParentChild | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  // Un-backed UI-only controls (see note in the response).
  const [emailPrefs, setEmailPrefs] = useState({ marketing: false, content: false, activity: false });
  const [showAs, setShowAs] = useState('avatar_nickname');

  useEffect(() => {
    Promise.all([
      fetchParentChildren().catch(() => [] as ParentChild[]),
      fetchSubscription().catch(() => null),
    ]).then(async ([kids, subscription]) => {
      const list = (kids ?? []) as ParentChild[];
      setChildren(list);
      setSub(subscription as SubscriptionResponse | null);
      setLoading(false);
      // Fetch weekly reports for the inline "this week" summary.
      const entries = await Promise.all(
        list.map(async (c) => [c.id, await fetchChildReport(c.id).catch(() => null)] as const),
      );
      const map: Record<string, ChildReport> = {};
      for (const [id, r] of entries) if (r) map[id] = r as ChildReport;
      setReports(map);
    });
  }, []);

  const isPremium = sub?.is_premium ?? false;

  async function handleViewReport(child: ParentChild) {
    setReportChild(child);
    if (!reports[child.id]) {
      const r = await fetchChildReport(child.id).catch(() => null);
      if (r) setReports((prev) => ({ ...prev, [child.id]: r as ChildReport }));
    }
  }

  async function handleToggleClass(child: ParentChild) {
    const next = !child.class_sharing_enabled;
    try {
      if (next) await grantConsent(child.id, 'class');
      else await revokeConsent(child.id, 'class');
      setChildren((prev) =>
        prev.map((c) => (c.id === child.id ? { ...c, class_sharing_enabled: next } : c)),
      );
    } catch {
      /* revert silently */
    }
  }

  async function handleTogglePublic(child: ParentChild) {
    const next = !child.public_sharing_enabled;
    try {
      if (next) await grantConsent(child.id, 'public');
      else await revokeConsent(child.id, 'public');
      setChildren((prev) =>
        prev.map((c) => (c.id === child.id ? { ...c, public_sharing_enabled: next } : c)),
      );
    } catch {
      /* revert silently */
    }
  }

  async function handleCheckout(plan: 'monthly' | 'annual') {
    setBillingLoading(true);
    try {
      const result = await startCheckout(plan);
      if (result?.url) window.location.href = result.url;
    } finally {
      setBillingLoading(false);
    }
  }

  async function handlePortal() {
    setBillingLoading(true);
    try {
      const result = await openBillingPortal();
      if (result?.url) window.location.href = result.url;
    } finally {
      setBillingLoading(false);
    }
  }

  const pendingConsent = children.filter((c) => !c.consent_granted);

  return (
    <div data-testid="parent-dashboard" className="mx-auto flex max-w-3xl flex-col gap-7 px-4 py-6 md:px-8">
      {reportChild && (
        <WeeklyReportModal
          childNickname={reportChild.nickname}
          report={reports[reportChild.id] ?? null}
          onClose={() => setReportChild(null)}
        />
      )}

      {/* Header */}
      <header className="flex items-center gap-4">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm ring-4 ring-white"
          aria-hidden="true"
        >
          🧑
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Welcome to your parent portal</h1>
          <p className="font-body font-semibold text-ink/60">Manage your family, plan, and safety.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* My account */}
        <section id="account" className="flex flex-col gap-3 rounded-card bg-white p-5 shadow-sm scroll-mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">My account</h2>
            <a href="/login" className="font-body text-sm font-semibold text-explore hover:underline">
              Forgot password
            </a>
          </div>
          <p className="font-body text-sm text-ink/60">Your login email &amp; password.</p>

          <div className="mt-1 flex flex-col gap-3 border-t border-ink/10 pt-3">
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-ink/50">
              Email settings
            </p>
            <EmailPref
              label="Receive marketing emails"
              hint="Updates about Idea Pop, new features, and weekly events."
              checked={emailPrefs.marketing}
              onChange={(v) => setEmailPrefs((p) => ({ ...p, marketing: v }))}
            />
            <EmailPref
              label="Receive new content alerts"
              hint="When a new mission, course, or lesson is added."
              checked={emailPrefs.content}
              onChange={(v) => setEmailPrefs((p) => ({ ...p, content: v }))}
            />
            <EmailPref
              label="Receive activity reports"
              hint={
                isPremium
                  ? "Your child's account activity, progress, and community interactions."
                  : 'Weekly activity reports unlock on the full plan.'
              }
              checked={isPremium && emailPrefs.activity}
              disabled={!isPremium}
              onChange={(v) => setEmailPrefs((p) => ({ ...p, activity: v }))}
            />
          </div>
        </section>

        {/* My Plan (billing) */}
        <section
          data-testid="billing-section"
          className="flex flex-col gap-3 rounded-card bg-white p-5 shadow-sm"
        >
          <h2 className="font-display text-lg font-bold text-ink">My plan</h2>
          <div className="rounded-card border border-explore/30 bg-tint-lime/40 p-4">
            {isPremium ? (
              <>
                <p className="font-display font-bold text-ink">{sub?.plan ?? 'Premium'} plan · active</p>
                {sub?.current_period_end && (
                  <p className="mt-1 font-body text-sm text-ink/60">
                    Renews {new Date(sub.current_period_end).toLocaleDateString()}
                  </p>
                )}
                <button
                  type="button"
                  data-testid="manage-billing-btn"
                  onClick={handlePortal}
                  disabled={billingLoading}
                  className="mt-3 font-body text-sm font-semibold text-explore underline disabled:opacity-50"
                >
                  Manage billing →
                </button>
              </>
            ) : (
              <>
                <p className="font-display font-bold text-ink">Free plan</p>
                <p className="mt-1 font-body text-sm text-ink/70">
                  Your child can explore 2 missions a month, save 3 favorite makes, and try the first
                  lesson of every course. Upgrade to unlock unlimited missions and a personal AI helper.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    data-testid="checkout-monthly-btn"
                    onClick={() => handleCheckout('monthly')}
                    disabled={billingLoading}
                    className="flex-1 rounded-pill px-4 py-2.5 font-display text-sm font-bold text-white transition-all hover:brightness-105 disabled:opacity-50"
                    style={{ backgroundColor: GREEN }}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    data-testid="checkout-annual-btn"
                    onClick={() => handleCheckout('annual')}
                    disabled={billingLoading}
                    className="flex-1 rounded-pill border-2 border-explore px-4 py-2.5 font-display text-sm font-bold text-explore transition-all hover:bg-tint-lime disabled:opacity-50"
                  >
                    Annual · save 20%
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* My kid(s) */}
      <section aria-label="My children" className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold text-ink">My kid</h2>
        {loading ? (
          <div className="h-28 animate-pulse rounded-card bg-white" />
        ) : children.length === 0 ? (
          <p className="font-body text-sm text-ink/60">No children added yet.</p>
        ) : (
          children.map((child) => {
            const r = reports[child.id];
            return (
              <div
                key={child.id}
                data-testid="child-card"
                className="flex flex-col gap-2 rounded-card bg-tint-lime/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <AvatarBubble avatarId={child.avatar_id} />
                  <div>
                    <p className="font-display text-base font-bold text-ink">
                      {child.nickname} · Lv {child.level}
                    </p>
                    <p className="font-body text-xs text-ink/60">{child.total_xp} XP</p>
                  </div>
                </div>
                {r && (
                  <p className="font-body text-sm font-semibold text-ink/70">
                    this week: 🌿{r.explore_videos_watched} videos · 📚{r.lessons_completed} lessons ·
                    💡{r.challenges_completed} challenges
                  </p>
                )}
                <button
                  type="button"
                  data-testid="view-report-btn"
                  onClick={() => handleViewReport(child)}
                  className="w-fit font-display text-sm font-bold text-explore hover:underline"
                >
                  see details →
                </button>
              </div>
            );
          })
        )}
        <a
          href="/sign-up/kid"
          data-testid="add-child-btn"
          className="flex items-center justify-center gap-2 rounded-card border-2 border-dashed border-explore/50 py-4 font-display text-sm font-bold text-explore transition-colors hover:border-explore hover:bg-tint-lime/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
        >
          <span aria-hidden="true">+</span> Add another child
        </a>
      </section>

      {/* Needs your OK — derived from real pending-consent signals */}
      {!loading && (
        <section aria-label="Needs your OK" className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold text-ink">Needs your OK</h2>
          {pendingConsent.length === 0 ? (
            <div className="rounded-card bg-white p-4 font-body text-sm text-ink/60 shadow-sm">
              ✅ You&apos;re all caught up — nothing needs your approval right now.
            </div>
          ) : (
            pendingConsent.map((child) => (
              <div
                key={child.id}
                className="flex flex-col items-start justify-between gap-3 rounded-card bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                <p className="font-display text-base font-bold text-ink">
                  🛡️ Approve {child.nickname}&apos;s account to unlock sharing
                </p>
                <button
                  type="button"
                  onClick={() => handleTogglePublic(child)}
                  className="rounded-pill px-5 py-2 font-display text-sm font-bold text-white"
                  style={{ backgroundColor: GREEN }}
                >
                  Review
                </button>
              </div>
            ))
          )}
        </section>
      )}

      {/* Safety */}
      {!loading && children.length > 0 && (
        <section aria-label="Safety" className="flex flex-col gap-3 rounded-card bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-ink">Safety</h2>
          {children.map((child) => (
            <div key={child.id} className="flex flex-col gap-3">
              {children.length > 1 && (
                <p className="font-body text-sm font-semibold text-ink/60">{child.nickname}</p>
              )}
              <SafetyToggle
                label="Community gallery sharing 🌐"
                checked={child.public_sharing_enabled}
                testid="toggle-public-sharing"
                ariaLabel={`Community gallery sharing for ${child.nickname}`}
                onToggle={() => handleTogglePublic(child)}
              />
              <SafetyToggle
                label="Class / club sharing 🏫"
                checked={child.class_sharing_enabled}
                testid="toggle-class-sharing"
                ariaLabel={`Class sharing for ${child.nickname}`}
                onToggle={() => handleToggleClass(child)}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="font-body text-sm text-ink">Show my child as</span>
                <select
                  aria-label={`Show ${child.nickname} as`}
                  value={showAs}
                  onChange={(e) => setShowAs(e.target.value)}
                  className="rounded-pill bg-tint-lime px-3 py-1.5 font-body text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
                >
                  <option value="avatar_nickname">Avatar + nickname</option>
                  <option value="first_name">First name only</option>
                  <option value="anonymous">Anonymous</option>
                </select>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ── Small controls ─────────────────────────────────────────────────────────────

function EmailPref({
  label,
  hint,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`flex gap-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-explore"
      />
      <span>
        <span className="block font-body text-sm font-semibold text-ink">{label}</span>
        <span className="block font-body text-xs text-ink/55">{hint}</span>
      </span>
    </label>
  );
}

function SafetyToggle({
  label,
  checked,
  testid,
  ariaLabel,
  onToggle,
}: {
  label: string;
  checked: boolean;
  testid: string;
  ariaLabel: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-body text-sm text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        data-testid={testid}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-explore' : 'bg-ink/25'
        }`}
      >
        <span
          className={`mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
