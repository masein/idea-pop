'use client';

type KidProgressResponse = import('@/lib/api/schema').components['schemas']['KidProgressResponse'];

interface KidXpCardProps {
  progress: KidProgressResponse;
  ageMode: 'young' | 'older';
}

const RANK_EMOJIS: Record<string, string> = {
  Explorer: '🌱',
  Maker: '🔨',
  Inventor: '💡',
  Innovator: '🚀',
  Master: '⭐',
  Mentor: '🏆',
};

export default function KidXpCard({ progress, ageMode }: KidXpCardProps) {
  const {
    level,
    total_xp,
    xp_this_level,
    xp_to_next_level,
    rank,
    explore_xp,
    learn_xp,
    solve_xp,
    creative_cycle_active,
  } = progress;

  const pct = xp_to_next_level > 0
    ? Math.min(100, Math.round((xp_this_level / xp_to_next_level) * 100))
    : 100;

  const rankEmoji = RANK_EMOJIS[rank] ?? '🌱';

  return (
    <div data-testid="kid-xp-card" className="bg-white rounded-card shadow-sm p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span className="text-4xl" data-testid="rank-emoji" aria-hidden="true">{rankEmoji}</span>
        <div>
          {ageMode === 'older' ? (
            <>
              <p className="font-display text-lg text-ink leading-none" data-testid="rank-label">
                {rank}
              </p>
              <p className="font-body text-sm text-ink/60 mt-0.5" data-testid="xp-numbers">
                {total_xp} XP · Level {level}
              </p>
            </>
          ) : (
            <p className="font-display text-lg text-ink leading-none" data-testid="rank-label">
              {rank}
            </p>
          )}
        </div>
      </div>

      {/* XP bar */}
      <div>
        <div
          className="h-4 rounded-full bg-tint-blue overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={xp_to_next_level}
          aria-valuenow={xp_this_level}
          aria-label={ageMode === 'older' ? `${xp_this_level} of ${xp_to_next_level} XP` : 'XP progress'}
          data-testid="xp-bar"
        >
          <div
            className="h-full bg-challenge rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
            data-testid="xp-bar-fill"
          />
        </div>

        {ageMode === 'older' && (
          <p className="font-body text-xs text-ink/50 mt-1" data-testid="xp-bar-label">
            {xp_this_level}/{xp_to_next_level} XP — {xp_to_next_level - xp_this_level} to Lv {level + 1}
          </p>
        )}
      </div>

      {/* Adventure XP breakdown — older only */}
      {ageMode === 'older' && (
        <div data-testid="xp-breakdown" className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-tint-lime rounded-card py-2 px-1">
            <p className="text-xl" aria-hidden="true">🌿</p>
            <p className="font-body text-xs text-ink/60">Exploring</p>
            <p className="font-display text-sm text-ink">{explore_xp} XP</p>
          </div>
          <div className="bg-tint-cream rounded-card py-2 px-1">
            <p className="text-xl" aria-hidden="true">📚</p>
            <p className="font-body text-xs text-ink/60">Learning</p>
            <p className="font-display text-sm text-ink">{learn_xp} XP</p>
          </div>
          <div className="bg-tint-blue rounded-card py-2 px-1">
            <p className="text-xl" aria-hidden="true">⚡</p>
            <p className="font-body text-xs text-ink/60">Solving</p>
            <p className="font-display text-sm text-ink">{solve_xp} XP</p>
          </div>
        </div>
      )}

      {/* Young mode: visual jar (no numbers) */}
      {ageMode === 'young' && (
        <div data-testid="xp-jar" className="flex items-end justify-center gap-2 py-2" aria-hidden="true">
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">🌿</span>
            <div className="w-8 h-12 rounded-b-full border-2 border-tint-lime bg-tint-lime/30 flex items-end overflow-hidden">
              <div className="w-full bg-tint-lime rounded-b-full" style={{ height: `${Math.min(100, (explore_xp / 50) * 100)}%` }} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">📚</span>
            <div className="w-8 h-12 rounded-b-full border-2 border-tint-cream bg-tint-cream/30 flex items-end overflow-hidden">
              <div className="w-full bg-tint-cream rounded-b-full" style={{ height: `${Math.min(100, (learn_xp / 50) * 100)}%` }} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">⚡</span>
            <div className="w-8 h-12 rounded-b-full border-2 border-tint-blue bg-tint-blue/30 flex items-end overflow-hidden">
              <div className="w-full bg-tint-blue rounded-b-full" style={{ height: `${Math.min(100, (solve_xp / 50) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Creative Cycle badge */}
      {creative_cycle_active && (
        <div
          data-testid="creative-cycle-badge"
          className="bg-tint-lavender rounded-card px-3 py-2 flex items-center gap-2 font-body text-sm text-ink"
        >
          <span>🔥</span>
          <span>Creative Cycle this week!</span>
          <span className="text-xs text-ink/50 ml-auto">+15 XP</span>
        </div>
      )}
    </div>
  );
}
