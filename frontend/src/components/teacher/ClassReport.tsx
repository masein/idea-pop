'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import {
  fetchClassReport,
  fetchClassReportCsv,
  type ClassReport as Report,
  type ClassReportStudent,
} from '@/lib/api/client';
import { AVATARS } from '@/lib/avatars';

function avatarEmoji(id: string): string {
  return AVATARS.find((a) => a.id === id)?.emoji ?? '🧒';
}

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-[#D6F0C2] text-[#2E5F1E]',
  in_progress: 'bg-[#CDEBFA] text-[#17567D]',
  abandoned: 'bg-ink/10 text-ink/60',
  not_started: 'bg-ink/10 text-ink/50',
};

/** The attempt to show for a student: the assigned challenge if they've begun
 *  it, else their most recent attempt. */
function displayAttempt(student: ClassReportStudent, assignedId: string | null) {
  if (assignedId) {
    const a = student.attempts.find((x) => x.challenge_id === assignedId);
    if (a) return a;
  }
  return student.attempts[student.attempts.length - 1] ?? null;
}

export default function ClassReport() {
  const t = useTranslations('teacher_dashboard');
  const format = useFormatter();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printChild, setPrintChild] = useState<ClassReportStudent | null>(null);

  useEffect(() => {
    fetchClassReport()
      .then(setReport)
      .catch(() => setError(true));
  }, []);

  // Print only the selected child's summary, then clear.
  useEffect(() => {
    if (!printChild) return;
    const done = () => {
      document.body.classList.remove('printing-parent-report');
      setPrintChild(null);
    };
    document.body.classList.add('printing-parent-report');
    window.addEventListener('afterprint', done, { once: true });
    window.print();
    return () => window.removeEventListener('afterprint', done);
  }, [printChild]);

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await fetchClassReportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'class-report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setExporting(false);
    }
  }

  const statusLabel = (s: string) =>
    t(
      s === 'completed'
        ? 'status_completed'
        : s === 'in_progress'
          ? 'status_in_progress'
          : s === 'abandoned'
            ? 'status_abandoned'
            : 'status_not_started',
    );

  const fmtDate = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: 'medium' }) : t('never_active');

  if (error) {
    return (
      <section data-testid="class-report" className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold text-ink">{t('report_heading')}</h2>
        <p role="alert" className="rounded-card bg-tint-blush p-4 font-body text-sm text-ink">
          {t('report_error')}
        </p>
      </section>
    );
  }

  if (!report) {
    return (
      <section data-testid="class-report" className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold text-ink">{t('report_heading')}</h2>
        <div className="h-24 animate-pulse rounded-card bg-white" />
      </section>
    );
  }

  const { summary, students } = report;
  const assignedId = summary.assigned_challenge_id;

  return (
    <section data-testid="class-report" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-bold text-ink">{t('report_heading')}</h2>
        <button
          type="button"
          data-testid="export-csv-btn"
          onClick={exportCsv}
          disabled={exporting || students.length === 0}
          className="rounded-pill border-2 border-[#2E5F4B]/60 bg-white px-5 py-2 font-display text-sm font-bold text-[#2E5F4B] transition-all hover:bg-[#F4FADD] active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5F4B] focus-visible:ring-offset-2"
        >
          {exporting ? t('exporting') : t('export_csv')}
        </button>
      </div>

      {/* Summary */}
      <div
        data-testid="report-summary"
        className="grid grid-cols-1 gap-3 rounded-card bg-[#CDEBFA] p-4 sm:grid-cols-3"
      >
        <SummaryStat label={t('summary_students')} value={format.number(summary.student_count)} />
        <SummaryStat
          label={t('summary_completed')}
          value={`${format.number(summary.completed_assigned)} / ${format.number(summary.student_count)}`}
        />
        <SummaryStat
          label={t('summary_avg_step')}
          value={t('step_value', { step: summary.average_step_reached })}
        />
      </div>

      {students.length === 0 ? (
        <p className="rounded-card bg-white p-6 text-center font-body text-sm text-ink/50">
          {t('report_empty')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="font-display text-xs text-ink/60">
                <th className="px-3 py-2">{t('col_name')}</th>
                <th className="px-3 py-2">{t('col_challenge')}</th>
                <th className="px-3 py-2">{t('col_status')}</th>
                <th className="px-3 py-2">{t('col_step')}</th>
                <th className="px-3 py-2">{t('col_xp')}</th>
                <th className="px-3 py-2">{t('col_last_active')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="font-body text-sm">
              {students.map((s) => {
                const a = displayAttempt(s, assignedId);
                const status = a?.status ?? 'not_started';
                const title = a?.challenge_title ?? summary.assigned_challenge_title ?? t('no_challenge');
                return (
                  <tr key={s.child_id} data-testid="report-row" className="border-t border-ink/10">
                    <td className="px-3 py-2 font-semibold text-ink">
                      <span aria-hidden="true">{avatarEmoji(s.avatar_id)}</span> {s.nickname}
                    </td>
                    <td className="px-3 py-2 text-ink/80">{title}</td>
                    <td className="px-3 py-2">
                      <span
                        data-testid="status-badge"
                        className={`rounded-pill px-3 py-0.5 font-display text-xs ${STATUS_STYLE[status] ?? STATUS_STYLE.not_started}`}
                      >
                        {statusLabel(status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink/80" dir="ltr">
                      {t('step_value', { step: a?.current_step ?? 0 })}
                    </td>
                    <td className="px-3 py-2 text-ink/80" dir="ltr">
                      {format.number(s.total_xp)}
                    </td>
                    <td className="px-3 py-2 text-ink/60">{fmtDate(s.last_active)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        data-testid="parent-report-btn"
                        onClick={() => setPrintChild(s)}
                        className="font-body text-xs font-bold text-explore underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
                      >
                        {t('parent_report')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-child parent printout — only this child's data (see print CSS). */}
      {printChild && (
        <div className="parent-report-print" data-testid="parent-report-print">
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {t('print_title', { name: printChild.nickname })}
          </h1>
          <p style={{ color: '#555', marginBottom: '1.25rem' }}>{t('print_subtitle')}</p>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1.5rem' }}>
            <dt style={{ fontWeight: 700 }}>{t('print_challenges_completed')}</dt>
            <dd>
              {format.number(printChild.attempts.filter((x) => x.status === 'completed').length)}
            </dd>
            <dt style={{ fontWeight: 700 }}>{t('print_current_step')}</dt>
            <dd dir="ltr">
              {t('step_value', { step: displayAttempt(printChild, assignedId)?.current_step ?? 0 })}
            </dd>
            <dt style={{ fontWeight: 700 }}>{t('print_xp')}</dt>
            <dd dir="ltr">{format.number(printChild.total_xp)}</dd>
            <dt style={{ fontWeight: 700 }}>{t('print_shared')}</dt>
            <dd>{format.number(printChild.shared_projects)}</dd>
          </dl>
          <p style={{ marginTop: '2rem', color: '#888', fontSize: '0.85rem' }}>
            {t('print_generated')}
          </p>
        </div>
      )}
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-2xl font-bold text-[#17567D]" dir="ltr">
        {value}
      </span>
      <span className="font-body text-xs text-ink/70">{label}</span>
    </div>
  );
}
