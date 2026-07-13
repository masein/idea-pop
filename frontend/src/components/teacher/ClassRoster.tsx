'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  createStudent,
  fetchClassStudents,
  resetStudentPin,
  type ClassStudent,
} from '@/lib/api/client';
import { AVATARS } from '@/lib/avatars';

const BIRTH_YEARS = Array.from({ length: 17 }, (_, i) => 2022 - i);
const DEEP = '#2E5F4B';

function avatarEmoji(id: string): string {
  return AVATARS.find((a) => a.id === id)?.emoji ?? '🧒';
}

/**
 * Teacher roster: add a student (returns a one-time login PIN), see the class,
 * and reset a PIN. The PIN is shown once in a callout the teacher can copy —
 * it is never stored or shown again.
 */
export default function ClassRoster() {
  const t = useTranslations('teacher_dashboard');
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);
  const [birthYear, setBirthYear] = useState(2016);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [pin, setPin] = useState<{ nickname: string; pin: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchClassStudents()
      .then(setStudents)
      .catch(() => {});
  }, []);

  async function handleAdd() {
    const name = nickname.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await createStudent({
        nickname: name,
        avatar_id: avatarId,
        birth_year: birthYear,
      });
      setPin({ nickname: res.nickname, pin: res.login_pin });
      setNickname('');
      setStudents(await fetchClassStudents());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(student: ClassStudent) {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await resetStudentPin(student.child_id);
      setPin({ nickname: student.nickname, pin: res.login_pin });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function copyPin() {
    if (!pin) return;
    await navigator.clipboard.writeText(pin.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section data-testid="class-roster" className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-bold text-ink">{t('roster_heading')}</h2>

      {/* One-time PIN callout */}
      {pin && (
        <div
          data-testid="pin-banner"
          className="flex flex-col gap-2 rounded-card border-2 border-[#CDEB5A] bg-[#F7FCE3] p-4"
        >
          <div className="flex items-center justify-between">
            <p className="font-display font-bold text-ink">
              {t('pin_ready_title', { nickname: pin.nickname })}
            </p>
            <button
              type="button"
              aria-label="×"
              onClick={() => setPin(null)}
              className="text-ink/50 hover:text-ink"
            >
              ✕
            </button>
          </div>
          <p
            data-testid="pin-value"
            dir="ltr"
            className="font-display text-3xl font-bold tracking-[0.3em] text-[#2E5F4B]"
          >
            {pin.pin}
          </p>
          <p className="font-body text-sm text-ink/70">{t('pin_ready_note')}</p>
          <button
            type="button"
            data-testid="copy-pin-btn"
            onClick={copyPin}
            className="self-start rounded-pill bg-[#CDEB5A] px-5 py-1.5 font-display text-sm font-bold text-[#1F4D33] transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2"
          >
            {copied ? t('copied') : t('copy_pin')}
          </button>
        </div>
      )}

      {/* Roster */}
      {students.length === 0 ? (
        <p className="rounded-card bg-white p-6 text-center font-body text-sm text-ink/50">
          {t('roster_empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {students.map((s) => (
            <li
              key={s.child_id}
              data-testid="student-row"
              className="flex items-center gap-3 rounded-card bg-[#FBFDF0] px-4 py-3"
            >
              <span className="text-xl" aria-hidden="true">
                {avatarEmoji(s.avatar_id)}
              </span>
              <span className="flex-1 font-display font-bold text-ink">{s.nickname}</span>
              {s.has_login_pin && (
                <span className="rounded-pill bg-[#EDF6C5] px-3 py-0.5 font-body text-xs text-ink/70">
                  {t('has_pin_badge')}
                </span>
              )}
              <button
                type="button"
                data-testid="reset-pin-btn"
                onClick={() => handleReset(s)}
                disabled={busy}
                className="rounded-pill border border-[#2E5F4B]/40 px-4 py-1.5 font-display text-xs font-bold text-[#2E5F4B] transition-all hover:bg-[#F4FADD] active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5F4B]"
              >
                {t('reset_pin_btn')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add a student */}
      <div
        data-testid="add-student-form"
        className="flex flex-col gap-3 rounded-card border-2 border-dashed border-ink/20 p-4"
      >
        <p className="font-display font-bold text-ink">{t('add_student_title')}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 font-body text-sm text-ink/70">
            {t('nickname_label')}
            <input
              type="text"
              value={nickname}
              maxLength={30}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('nickname_placeholder')}
              data-testid="student-nickname-input"
              className="rounded-card border border-ink/20 px-3 py-2 font-body text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#1E7FB8]"
            />
          </label>
          <label className="flex flex-col gap-1 font-body text-sm text-ink/70">
            {t('avatar_label')}
            <select
              value={avatarId}
              onChange={(e) => setAvatarId(e.target.value)}
              className="rounded-card border border-ink/20 px-3 py-2 font-body text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#1E7FB8]"
            >
              {AVATARS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-body text-sm text-ink/70">
            {t('birth_year_label')}
            <select
              value={birthYear}
              onChange={(e) => setBirthYear(Number(e.target.value))}
              className="rounded-card border border-ink/20 px-3 py-2 font-body text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#1E7FB8]"
            >
              {BIRTH_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            data-testid="add-student-btn"
            onClick={handleAdd}
            disabled={busy || nickname.trim().length === 0}
            className="rounded-pill px-6 py-2.5 font-display text-sm font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ backgroundColor: DEEP }}
          >
            {busy ? t('adding') : t('add_student_btn')}
          </button>
        </div>
        {error && (
          <p role="alert" className="font-body text-sm text-red-600">
            {t('roster_error')}
          </p>
        )}
      </div>
    </section>
  );
}
