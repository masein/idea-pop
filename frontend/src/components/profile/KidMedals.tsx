'use client';

interface KidMedalsProps {
  bronze: number;
  silver: number;
  gold: number;
}

export default function KidMedals({ bronze, silver, gold }: KidMedalsProps) {
  const hasMedals = bronze > 0 || silver > 0 || gold > 0;

  return (
    <div data-testid="kid-medals" className="bg-white rounded-card shadow-sm p-5 flex flex-col gap-3">
      <h3 className="font-display text-base text-ink">Medals</h3>

      {hasMedals ? (
        <div className="flex gap-4">
          {bronze > 0 && (
            <div data-testid="medal-bronze" className="flex flex-col items-center gap-1">
              <span className="text-3xl" aria-hidden="true">🥉</span>
              <span className="font-body text-xs text-ink/60">×{bronze}</span>
            </div>
          )}
          {silver > 0 && (
            <div data-testid="medal-silver" className="flex flex-col items-center gap-1">
              <span className="text-3xl" aria-hidden="true">🥈</span>
              <span className="font-body text-xs text-ink/60">×{silver}</span>
            </div>
          )}
          {gold > 0 && (
            <div data-testid="medal-gold" className="flex flex-col items-center gap-1">
              <span className="text-3xl" aria-hidden="true">🥇</span>
              <span className="font-body text-xs text-ink/60">×{gold}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="font-body text-sm text-ink/50">
          Complete 3 challenges to earn your first bronze medal!
        </p>
      )}

      <p className="font-body text-xs text-ink/40">3 challenges = bronze · 6 = silver · 10 = gold</p>
    </div>
  );
}
