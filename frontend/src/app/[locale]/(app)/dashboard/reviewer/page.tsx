'use client';

import { useEffect, useState } from 'react';
import {
  fetchModerationQueue,
  approveItem,
  rejectItem,
  fetchReports,
} from '@/lib/api/client';
import type { components } from '@/lib/api/schema';

type ModerationItem = components['schemas']['ModerationItem'];
type ContentReport = components['schemas']['ContentReport'];

// ── Moderation item card ──────────────────────────────────────────────────────

function ModerationCard({
  item,
  onApprove,
  onReject,
}: {
  item: ModerationItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleApprove() {
    setBusy(true);
    try {
      await approveItem(item.id);
      setDone(true);
      onApprove(item.id);
    } catch { /* stay */ } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await rejectItem(item.id, reason.trim());
      setDone(true);
      onReject(item.id);
    } catch { /* stay */ } finally {
      setBusy(false);
    }
  }

  if (done) return null;

  return (
    <div
      data-testid="moderation-card"
      className="bg-white rounded-card shadow-sm p-5 flex flex-col gap-4 border border-ink/10"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          {item.type === 'idea' ? '💡' : '🔨'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm text-ink line-clamp-2">{item.content_title}</p>
          <p className="font-body text-xs text-ink/50 mt-0.5">
            by {item.author_nickname} · {new Date(item.submitted_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`font-body text-xs px-2 py-1 rounded-full flex-shrink-0 ${
            item.status === 'pending'
              ? 'bg-tint-blush text-ink'
              : item.status === 'approved'
                ? 'bg-tint-lime text-ink'
                : 'bg-ink/10 text-ink/60'
          }`}
        >
          {item.status}
        </span>
      </div>

      {/* Actions */}
      {item.status === 'pending' && !rejectMode && (
        <div className="flex gap-3">
          <button
            type="button"
            data-testid="approve-btn"
            onClick={handleApprove}
            disabled={busy}
            className="flex-1 bg-tint-lime border border-explore text-ink font-body text-sm py-2 rounded-card disabled:opacity-50"
          >
            {busy ? '…' : '✓ Approve'}
          </button>
          <button
            type="button"
            data-testid="reject-trigger-btn"
            onClick={() => setRejectMode(true)}
            disabled={busy}
            className="flex-1 border border-ink/20 text-ink font-body text-sm py-2 rounded-card disabled:opacity-50"
          >
            ✕ Reject
          </button>
        </div>
      )}

      {/* Reject reason form */}
      {rejectMode && (
        <div className="flex flex-col gap-2" data-testid="reject-form">
          <label className="font-body text-xs text-ink/60">Reason for rejection</label>
          <input
            type="text"
            data-testid="reject-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Inappropriate content"
            className="w-full rounded-card border border-ink/20 px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-challenge"
          />
          <div className="flex gap-3">
            <button
              type="button"
              data-testid="confirm-reject-btn"
              onClick={handleReject}
              disabled={busy || !reason.trim()}
              className="flex-1 bg-ink text-white font-body text-sm py-2 rounded-card disabled:opacity-50"
            >
              {busy ? 'Rejecting…' : 'Confirm reject'}
            </button>
            <button
              type="button"
              onClick={() => { setRejectMode(false); setReason(''); }}
              className="flex-1 border border-ink/20 text-ink font-body text-sm py-2 rounded-card"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reports list ──────────────────────────────────────────────────────────────

function ReportsList({ reports }: { reports: ContentReport[] }) {
  const unresolved = reports.filter((r) => !r.resolved);

  return (
    <div data-testid="reports-section" className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-ink">
        Reports
        {unresolved.length > 0 && (
          <span className="ml-2 bg-ink text-white text-xs font-body px-2 py-0.5 rounded-full">
            {unresolved.length}
          </span>
        )}
      </h2>

      {reports.length === 0 ? (
        <p className="font-body text-sm text-ink/50 bg-white rounded-card p-4 text-center">
          No reports — all clear!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((r) => (
            <div
              key={r.id}
              data-testid="report-item"
              aria-disabled={r.resolved ? 'true' : undefined}
              className={`rounded-card px-4 py-3 flex items-start gap-3 border ${
                r.resolved ? 'bg-ink/5 border-ink/10' : 'bg-white border-ink/20'
              }`}
            >
              <span className="text-lg" aria-hidden="true">🚩</span>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-ink">{r.reason}</p>
                <p className="font-body text-xs text-ink/50 mt-0.5">
                  {r.content_type} · {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              {r.resolved && (
                <span className="font-body text-xs text-ink/40 flex-shrink-0">resolved</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewerDashboardPage() {
  const [queue, setQueue] = useState<ModerationItem[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    Promise.all([
      fetchModerationQueue('pending').catch(() => [] as ModerationItem[]),
      fetchReports().catch(() => [] as ContentReport[]),
    ]).then(([q, r]) => {
      setQueue((q ?? []) as ModerationItem[]);
      setReports((r ?? []) as ContentReport[]);
      setLoading(false);
    });
  }, []);

  async function loadQueue(status: 'pending' | 'approved' | 'rejected') {
    setFilter(status);
    const q = await fetchModerationQueue(status).catch(() => [] as ModerationItem[]);
    setQueue((q ?? []) as ModerationItem[]);
  }

  function removeFromQueue(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }

  const pendingCount = queue.filter((i) => i.status === 'pending').length;

  return (
    <div data-testid="reviewer-dashboard" className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Moderation queue</h1>
        {pendingCount > 0 && (
          <span className="bg-ink text-white font-body text-sm px-3 py-1 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 rounded-card overflow-hidden border border-ink/10" role="tablist">
        {(['pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            role="tab"
            aria-selected={filter === status}
            data-testid={`filter-${status}`}
            onClick={() => loadQueue(status)}
            className={`flex-1 py-2.5 font-body text-sm capitalize transition-colors ${
              filter === status
                ? 'bg-ink text-white'
                : 'bg-white text-ink/60 hover:bg-tint-blue'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-card h-28" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <p
          data-testid="queue-empty"
          className="font-body text-sm text-ink/50 bg-white rounded-card p-8 text-center"
        >
          Nothing to review right now 🎉
        </p>
      ) : (
        <div className="flex flex-col gap-4" data-testid="moderation-queue">
          {queue.map((item) => (
            <ModerationCard
              key={item.id}
              item={item}
              onApprove={removeFromQueue}
              onReject={removeFromQueue}
            />
          ))}
        </div>
      )}

      {/* Reports */}
      {!loading && <ReportsList reports={reports} />}
    </div>
  );
}
