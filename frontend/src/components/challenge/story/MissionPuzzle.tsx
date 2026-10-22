'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MissionPuzzleData } from './discovery';

/**
 * "Build the Mission": the kid taps a question then its matching clue, or a clue then its
 * matching question (both ways work). Questions stay on the right and clues on the left in
 * every language. A wrong match gets a gentle, specific nudge; there are no points to lose and
 * no timer. It ends with the mission's big question, never a solution.
 */
export default function MissionPuzzle({
  puzzle,
  solved,
  onSolved,
}: {
  puzzle: MissionPuzzleData;
  /** Already built (e.g. coming back to the brief): show it complete. */
  solved: boolean;
  onSolved: () => void;
}) {
  const t = useTranslations('story');
  const [matched, setMatched] = useState<Record<string, string>>(() =>
    solved ? Object.fromEntries(puzzle.questions.map((q) => [q.key, q.clue])) : {},
  );
  // What the kid tapped first: a question or a clue (either way round works).
  const [picked, setPicked] = useState<{ kind: 'q' | 'c'; key: string } | null>(null);
  const [nudge, setNudge] = useState<{ q: string; text: string } | null>(null);
  // The last correct match, cheered for a moment.
  const [cheer, setCheer] = useState<string | null>(null);

  const placed = new Set(Object.values(matched));
  const done = puzzle.questions.every((q) => matched[q.key]);

  function tryMatch(qKey: string, clueKey: string) {
    const q = puzzle.questions.find((x) => x.key === qKey);
    if (!q || matched[q.key]) return;
    if (q.clue === clueKey) {
      const next = { ...matched, [q.key]: clueKey };
      setMatched(next);
      setNudge(null);
      setPicked(null);
      setCheer(q.key);
      if (puzzle.questions.every((x) => next[x.key])) onSolved();
    } else {
      // No penalty: the kid keeps their pick and can try another.
      setNudge({ q: q.key, text: q.wrong });
      setCheer(null);
    }
  }

  function tapQuestion(key: string) {
    if (picked?.kind === 'c') return tryMatch(key, picked.key);
    setPicked(picked?.kind === 'q' && picked.key === key ? null : { kind: 'q', key });
    setNudge(null);
  }

  function tapClue(key: string) {
    if (picked?.kind === 'q') return tryMatch(picked.key, key);
    setPicked(picked?.kind === 'c' && picked.key === key ? null : { kind: 'c', key });
    setNudge(null);
  }

  const clueText = (key: string) => puzzle.clues.find((c) => c.key === key);

  return (
    <section data-testid="mission-puzzle" className="story-rise flex flex-col gap-4 rounded-[20px] border border-[#dfe8f2] bg-[#F4F8FC] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D6FC4] text-2xl">
          🧩
        </span>
        <h2 className="font-display text-2xl text-[#1B3A6B]">{puzzle.title}</h2>
      </div>
      <p className="font-body text-sm font-semibold text-[#3B4A5A]">{puzzle.intro}</p>

      {/* Clues on the left, questions on the right, in every language. */}
      <div dir="ltr" className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2" aria-label={t('puzzle_clues')}>
          <p dir="auto" className="font-body text-xs font-bold uppercase tracking-wide text-[#2D6FC4]">{t('puzzle_clues')}</p>
          {puzzle.clues.map((c) => {
            const used = placed.has(c.key);
            const on = picked?.kind === 'c' && picked.key === c.key;
            return (
              <button
                key={c.key}
                type="button"
                dir="auto"
                data-testid={`puzzle-clue-${c.key}`}
                data-state={used ? 'done' : on ? 'selected' : 'open'}
                aria-pressed={on}
                disabled={used}
                onClick={() => tapClue(c.key)}
                className={[
                  'flex min-h-16 items-center gap-2 rounded-2xl border-2 bg-white px-3 py-2 text-start font-body text-base font-semibold text-ink transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63]',
                  used
                    ? 'border-[#BFE6C8] bg-[#F3FBF5] text-[#1d7a3a]'
                    : on
                      ? 'scale-[1.02] border-[#1A6FA6] bg-[#EAF5FC] shadow-[0_0_0_4px_#CDE7F7]'
                      : picked?.kind === 'q'
                        ? 'border-[#58C6EE] hover:border-[#1A6FA6] hover:bg-[#EAF5FC]'
                        : 'border-[#D6E4EE] hover:border-[#58C6EE]',
                ].join(' ')}
              >
                <span aria-hidden="true" className="text-2xl">{used ? '✓' : c.emoji}</span>
                <span>{c.text}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2" aria-label={t('puzzle_questions')}>
          <p dir="auto" className="font-body text-xs font-bold uppercase tracking-wide text-[#2D6FC4]">{t('puzzle_questions')}</p>
          {puzzle.questions.map((q) => {
            const clue = matched[q.key] ? clueText(matched[q.key]) : null;
            const on = picked?.kind === 'q' && picked.key === q.key;
            return (
              <div key={q.key} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  dir="auto"
                  data-testid={`puzzle-q-${q.key}`}
                  data-state={clue ? 'done' : on ? 'selected' : 'open'}
                  aria-pressed={on}
                  disabled={!!clue}
                  onClick={() => tapQuestion(q.key)}
                  className={[
                    'flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-2xl border-2 px-3 py-2 text-start transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63]',
                    clue
                      ? 'border-[#BFE6C8] bg-[#F3FBF5]'
                      : on
                        ? 'scale-[1.02] border-[#1A6FA6] bg-[#EAF5FC] shadow-[0_0_0_4px_#CDE7F7]'
                        : picked?.kind === 'c'
                          ? 'border-[#58C6EE] bg-white hover:border-[#1A6FA6] hover:bg-[#EAF5FC]'
                          : 'border-[#D6E4EE] bg-white hover:border-[#58C6EE]',
                  ].join(' ')}
                >
                  <span className="font-body text-base font-bold text-[#1B3A6B]">
                    {q.text} {clue && <span aria-hidden="true">✓</span>}
                  </span>
                  {clue && <span className="font-body text-sm font-semibold text-[#1d7a3a]">{clue.text}</span>}
                </button>
                {cheer === q.key && !done && (
                  <p dir="auto" role="status" data-testid="puzzle-cheer" className="story-pop rounded-xl bg-[#F3FBF5] px-3 py-1.5 font-body text-sm font-bold text-[#1d7a3a]">
                    🎉 {t('puzzle_cheer')}
                  </p>
                )}
                {nudge?.q === q.key && (
                  <p dir="auto" role="status" data-testid="puzzle-nudge" className="rounded-xl bg-[#FFF7E0] px-3 py-2 font-body text-sm text-[#5a4300]">
                    💡 {nudge.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {done && (
        <div data-testid="puzzle-summary" className="story-pop flex flex-col gap-1 rounded-2xl bg-gradient-to-br from-[#FFF7D6] to-[#FFE9A8] p-4">
          <p className="font-display text-xl text-[#7A5A00]">{puzzle.summary_lead}</p>
          <p className="font-display text-2xl leading-snug text-ink">{puzzle.summary}</p>
        </div>
      )}
    </section>
  );
}
