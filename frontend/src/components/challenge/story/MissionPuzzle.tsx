'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MissionPuzzleData } from './discovery';

type Part = 'village' | 'river' | 'school' | 'route';

/**
 * "Build the Mission": the kid matches picture-and-text clues to the mission's questions
 * (drag a clue onto a question, or tap a clue and then a question). Each match lights up
 * its part of the map. Wrong matches get a gentle, specific nudge; there are no points to
 * lose and no timer. The map shows the problem only, never a way across.
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
  const [picked, setPicked] = useState<string | null>(null);
  const [nudge, setNudge] = useState<{ q: string; text: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const placed = new Set(Object.values(matched));
  const lit = new Set(puzzle.questions.filter((q) => matched[q.key]).map((q) => q.part as Part));
  const done = puzzle.questions.every((q) => matched[q.key]);

  function tryPlace(qKey: string, clueKey: string) {
    const q = puzzle.questions.find((x) => x.key === qKey);
    if (!q || matched[qKey]) return;
    if (q.clue === clueKey) {
      const next = { ...matched, [qKey]: clueKey };
      setMatched(next);
      setNudge(null);
      setPicked(null);
      if (puzzle.questions.every((x) => next[x.key])) onSolved();
    } else {
      setNudge({ q: qKey, text: q.wrong });
      setPicked(null);
    }
  }

  return (
    <section data-testid="mission-puzzle" className="story-rise flex flex-col gap-4 rounded-[20px] border border-[#dfe8f2] bg-[#F4F8FC] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D6FC4] text-2xl">
          🧩
        </span>
        <div>
          <h2 className="font-display text-2xl text-[#1B3A6B]">{puzzle.title}</h2>
          <p className="font-body text-base font-semibold text-[#1B3A6B]">{puzzle.intro}</p>
        </div>
      </div>

      <MissionMap labels={puzzle.map} lit={lit} />

      {/* Clues to place */}
      <div className="flex flex-col gap-2">
        <p className="font-body text-sm font-bold uppercase tracking-wide text-[#2D6FC4]">{t('puzzle_clues')}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {puzzle.clues.map((c) => {
            const used = placed.has(c.key);
            const on = picked === c.key;
            return (
              <button
                key={c.key}
                type="button"
                draggable={!used}
                data-testid={`puzzle-clue-${c.key}`}
                aria-pressed={on}
                disabled={used}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', c.key);
                  setPicked(c.key);
                }}
                onClick={() => setPicked(on ? null : c.key)}
                className={[
                  'flex min-h-14 items-center gap-3 rounded-2xl border-2 bg-white px-3 py-2 text-start font-body text-base font-semibold text-ink transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63]',
                  used ? 'border-[#BFE6C8] opacity-50' : on ? 'scale-[1.02] border-[#1A6FA6] bg-[#EAF5FC] shadow-[0_0_0_4px_#CDE7F7]' : 'border-[#D6E4EE] hover:border-[#58C6EE]',
                  used ? '' : 'cursor-grab',
                ].join(' ')}
              >
                <span aria-hidden="true" className="text-3xl">{c.emoji}</span>
                <span dir="auto">{c.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions (drop targets) */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {puzzle.questions.map((q) => {
          const clue = puzzle.clues.find((c) => c.key === matched[q.key]);
          return (
            <div
              key={q.key}
              role="button"
              tabIndex={clue ? -1 : 0}
              data-testid={`puzzle-q-${q.key}`}
              data-state={clue ? 'done' : 'open'}
              aria-label={q.text}
              onClick={() => picked && tryPlace(q.key, picked)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && picked) {
                  e.preventDefault();
                  tryPlace(q.key, picked);
                }
              }}
              onDragOver={(e) => {
                if (clue) return;
                e.preventDefault();
                setDragOver(q.key);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                tryPlace(q.key, e.dataTransfer.getData('text/plain'));
              }}
              className={[
                'flex min-h-24 flex-col gap-1.5 rounded-2xl border-2 p-3 transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63]',
                clue
                  ? 'border-[#BFE6C8] bg-[#F3FBF5]'
                  : dragOver === q.key || picked
                    ? 'cursor-pointer border-dashed border-[#1A6FA6] bg-white'
                    : 'border-dashed border-[#9CC9E6] bg-white/70',
              ].join(' ')}
            >
              <p className="font-body text-base font-bold text-[#1B3A6B]">
                {q.text} {clue && <span aria-hidden="true">✓</span>}
              </p>
              {clue ? (
                <p dir="auto" className="font-body text-base font-semibold text-[#1d7a3a]">
                  {clue.emoji} {clue.text}
                </p>
              ) : (
                <p className="font-body text-sm text-[#5B6878]">{picked ? t('puzzle_drop_here') : t('puzzle_empty')}</p>
              )}
              {nudge?.q === q.key && !clue && (
                <p role="status" data-testid="puzzle-nudge" className="rounded-xl bg-[#FFF7E0] px-3 py-2 font-body text-base text-[#5a4300]">
                  💡 {nudge.text}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {done && (
        <div data-testid="puzzle-summary" className="story-pop flex flex-col gap-1 rounded-2xl bg-gradient-to-br from-[#FFF7D6] to-[#FFE9A8] p-4">
          <p className="font-body text-sm font-bold text-[#7A5A00]">{puzzle.summary_lead}</p>
          <p className="font-display text-2xl leading-snug text-ink">{puzzle.summary}</p>
        </div>
      )}
    </section>
  );
}

/** Max's map: village, river, school and the long way round. Parts glow as they're matched.
 *  Drawn without any crossing, so the map never hints at a solution. */
function MissionMap({ labels, lit }: { labels: MissionPuzzleData['map']; lit: Set<Part> }) {
  const glow = (p: Part) => (lit.has(p) ? 'drop-shadow(0 0 6px #FFD24A)' : 'none');
  return (
    <figure className="m-0 overflow-hidden rounded-2xl border border-[#cfe3ee] bg-[#EAF7E4]">
      <svg viewBox="0 0 640 280" role="img" aria-label={`${labels.village}, ${labels.river}, ${labels.school}, ${labels.route}`} className="block h-auto w-full">
        {/* jungle */}
        {[40, 110, 520, 600, 90, 560].map((x, i) => (
          <circle key={i} cx={x} cy={i < 2 || i > 3 ? 250 : 255} r="20" fill="#9BD08A" />
        ))}
        {/* the long way round: up the bank, round the river's far end, down to school */}
        <path
          d="M140 170 C 150 90, 200 40, 320 30 C 440 40, 490 90, 500 160"
          fill="none"
          stroke={lit.has('route') ? '#E07A1F' : '#C9A77A'}
          strokeWidth={lit.has('route') ? 6 : 4}
          strokeDasharray="10 9"
          style={{ filter: glow('route'), transition: 'all .4s' }}
        />
        {/* river */}
        <path
          d="M290 60 C 270 120, 340 170, 300 280 L 360 280 C 400 170, 330 120, 350 60 Z"
          fill={lit.has('river') ? '#3FA9E8' : '#7CC7EE'}
          style={{ filter: glow('river'), transition: 'all .4s' }}
        />
        {/* village */}
        <g style={{ filter: glow('village'), transition: 'all .4s' }}>
          {[[70, 150], [120, 175], [60, 195]].map(([x, y], i) => (
            <g key={i}>
              <rect x={x} y={y} width="38" height="28" rx="4" fill={lit.has('village') ? '#F6C76B' : '#E8D3A9'} />
              <path d={`M${x - 4} ${y} L${x + 19} ${y - 18} L${x + 42} ${y} Z`} fill="#B5643B" />
            </g>
          ))}
          <text x="150" y="232" fontSize="16" fontWeight="700" fill="#1B3A6B">{labels.village}</text>
        </g>
        {/* school */}
        <g style={{ filter: glow('school'), transition: 'all .4s' }}>
          <rect x="470" y="150" width="90" height="56" rx="6" fill={lit.has('school') ? '#F6C76B' : '#F2E3C2'} />
          <path d="M462 150 L515 118 L568 150 Z" fill="#C0503C" />
          <rect x="505" y="178" width="20" height="28" fill="#8A5A3C" />
          <text x="478" y="230" fontSize="16" fontWeight="700" fill="#1B3A6B">{labels.school}</text>
        </g>
        <text x="300" y="128" fontSize="15" fontWeight="700" fill="#0F4F7A" transform="rotate(-80 318 128)">{labels.river}</text>
        <text x="235" y="22" fontSize="14" fontWeight="700" fill="#8A5A2B">{labels.route}</text>
        {/* Max */}
        <text x="150" y="168" fontSize="30" aria-hidden="true">🎒</text>
      </svg>
    </figure>
  );
}
