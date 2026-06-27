'use client';

import { useEffect, useRef, useState } from 'react';
import {
  fetchTeacherClass,
  fetchChallenges,
  assignMission,
  fetchClassGallery,
} from '@/lib/api/client';
import type { components } from '@/lib/api/schema';

type TeacherClass = components['schemas']['TeacherClass'];
type ClassGalleryItem = components['schemas']['ClassGalleryItem'];
type ChallengeDetail = components['schemas']['ChallengeDetail'];

// ── Class code card ───────────────────────────────────────────────────────────

function ClassCodeCard({ classData }: { classData: TeacherClass }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLSpanElement>(null);

  async function handleCopy() {
    await navigator.clipboard.writeText(classData.class_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div data-testid="class-code-card" className="bg-white rounded-card shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">{classData.name}</h2>
        <span className="font-body text-sm text-ink/50">{classData.student_count} students</span>
      </div>

      <div className="flex flex-col items-center gap-3 py-4">
        <p className="font-body text-xs text-ink/50 uppercase tracking-wide">Class code</p>
        <span
          ref={codeRef}
          data-testid="class-code"
          className="font-display text-4xl tracking-widest text-explore bg-tint-lime rounded-card px-8 py-4"
        >
          {classData.class_code}
        </span>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          data-testid="copy-code-btn"
          onClick={handleCopy}
          className="flex-1 border border-explore text-explore font-body text-sm py-2.5 rounded-card hover:bg-tint-lime transition-colors"
        >
          {copied ? '✓ Copied!' : '📋 Copy code'}
        </button>
        <button
          type="button"
          data-testid="print-letter-btn"
          onClick={handlePrint}
          className="flex-1 border border-ink/20 text-ink font-body text-sm py-2.5 rounded-card hover:bg-tint-cream transition-colors"
        >
          🖨️ Print parent letter
        </button>
      </div>
    </div>
  );
}

// ── Mission assignment ────────────────────────────────────────────────────────

function AssignMissionSection({
  classData,
  challenges,
  onAssigned,
}: {
  classData: TeacherClass;
  challenges: ChallengeDetail[];
  onAssigned: (challengeId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(classData.assigned_challenge_id ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleAssign() {
    if (!selectedId || saving) return;
    setSaving(true);
    try {
      await assignMission(selectedId);
      onAssigned(selectedId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silently fail */ } finally {
      setSaving(false);
    }
  }

  return (
    <div data-testid="assign-mission-section" className="bg-white rounded-card shadow-sm p-5 flex flex-col gap-4">
      <h2 className="font-display text-lg text-ink">This week&apos;s mission</h2>

      {classData.assigned_challenge_title && (
        <p className="font-body text-sm text-ink/60">
          Currently assigned: <strong>{classData.assigned_challenge_title}</strong>
        </p>
      )}

      <label htmlFor="challenge-select" className="sr-only">Choose a challenge to assign</label>
      <select
        id="challenge-select"
        data-testid="challenge-select"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full rounded-card border border-ink/20 px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-explore bg-white"
      >
        <option value="">— Choose a challenge —</option>
        {challenges.map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji} {c.title}
          </option>
        ))}
      </select>

      <button
        type="button"
        data-testid="assign-btn"
        onClick={handleAssign}
        disabled={!selectedId || saving}
        className="bg-explore text-white font-display text-sm py-2.5 rounded-card disabled:opacity-40"
      >
        {saving ? 'Assigning…' : saved ? '✓ Assigned!' : 'Assign to class'}
      </button>
    </div>
  );
}

// ── Class gallery ─────────────────────────────────────────────────────────────

function ClassGallery({ items }: { items: ClassGalleryItem[] }) {
  return (
    <div data-testid="class-gallery" className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-ink">Class gallery</h2>

      {items.length === 0 ? (
        <p className="font-body text-sm text-ink/50 bg-white rounded-card p-6 text-center">
          No submissions yet — students will appear here after completing a mission.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              data-testid="gallery-item"
              className="bg-white rounded-card shadow-sm overflow-hidden"
            >
              <div className="w-full h-28 bg-tint-lime flex items-center justify-center text-3xl">
                🔨
              </div>
              <div className="p-3">
                <p className="font-display text-xs text-ink leading-snug line-clamp-2">{item.project_title}</p>
                <p className="font-body text-xs text-ink/50 mt-1">{item.student_nickname}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeacherDashboardPage() {
  const [classData, setClassData] = useState<TeacherClass | null>(null);
  const [challenges, setChallenges] = useState<ChallengeDetail[]>([]);
  const [gallery, setGallery] = useState<ClassGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchTeacherClass().catch(() => null),
      fetchChallenges().catch(() => [] as ChallengeDetail[]),
      fetchClassGallery().catch(() => [] as ClassGalleryItem[]),
    ]).then(([cls, chal, gal]) => {
      setClassData(cls as TeacherClass | null);
      setChallenges((chal ?? []) as ChallengeDetail[]);
      setGallery((gal ?? []) as ClassGalleryItem[]);
      setLoading(false);
    });
  }, []);

  function handleAssigned(challengeId: string) {
    const c = challenges.find((x) => x.id === challengeId);
    if (c && classData) {
      setClassData({
        ...classData,
        assigned_challenge_id: challengeId,
        assigned_challenge_title: c.title,
      });
    }
  }

  return (
    <div data-testid="teacher-dashboard" className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      <h1 className="font-display text-2xl text-ink">Your teacher dashboard</h1>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="animate-pulse bg-white rounded-card h-48" />
          <div className="animate-pulse bg-white rounded-card h-32" />
        </div>
      ) : classData ? (
        <>
          <ClassCodeCard classData={classData} />
          <AssignMissionSection
            classData={classData}
            challenges={challenges}
            onAssigned={handleAssigned}
          />
          <ClassGallery items={gallery} />
        </>
      ) : (
        <div className="bg-tint-cream rounded-card p-6 text-center flex flex-col gap-3">
          <p className="font-display text-lg text-ink">No class yet</p>
          <p className="font-body text-sm text-ink/60">Set up a class to get your unique class code</p>
          <a
            href="/onboarding/teacher"
            className="font-body text-sm text-explore underline"
          >
            Set up a class →
          </a>
        </div>
      )}
    </div>
  );
}
