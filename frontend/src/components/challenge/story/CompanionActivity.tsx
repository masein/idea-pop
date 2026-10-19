'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CompanionData } from './discovery';
import { btnPrimary, btnSecondary } from '@/components/challenge/buttons';

/**
 * A short, hands-on look at the kid's nature companion (simplified illustrations, not a
 * simulation): link the fire ants into a raft, zoom in on a water strider's leg, flip the
 * Victoria water lily's leaf and trace its ribs, or peel an intact coconut layer by layer.
 * It ends with the companion's natural strategy, never a ready-made solution for Max.
 */
export default function CompanionActivity({
  data,
  onDone,
}: {
  data: CompanionData;
  onDone: () => void;
}) {
  const t = useTranslations('story');
  const [finished, setFinished] = useState(false);
  return (
    <div data-testid={`companion-${data.activity}`} className="story-rise flex flex-col gap-3 rounded-xl border-2 border-[#1A6FA6] bg-white p-4">
      <p className="font-body text-lg font-extrabold text-ink">{data.title}</p>
      {data.activity === 'ants' && <Ants data={data} onFinish={() => setFinished(true)} />}
      {data.activity === 'strider' && <Strider data={data} onFinish={() => setFinished(true)} />}
      {data.activity === 'lily' && <Lily data={data} onFinish={() => setFinished(true)} />}
      {data.activity === 'coconut' && <Coconut data={data} onFinish={() => setFinished(true)} />}
      {finished && (
        <div data-testid="companion-takeaway" className="story-pop flex flex-col gap-3 rounded-xl bg-[#F3FBF5] p-3">
          <p className="font-body text-xs font-extrabold uppercase tracking-wide text-[#1E7A44]">{t('companion_takeaway')}</p>
          <p dir="auto" className="font-body text-base font-semibold leading-snug text-ink">{data.takeaway}</p>
          <button type="button" data-testid="companion-done" onClick={onDone} className={`${btnPrimary} self-start`}>
            {t('companion_got_it')}
          </button>
        </div>
      )}
    </div>
  );
}

const stage = 'relative mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl bg-[#CFEFFB]';

/* ── Fire ants: tap each ant to link it; the linked group becomes a floating raft ── */
const ANT_SPOTS = [
  [6, 6], [70, 4], [38, 22], [84, 30], [14, 34], [56, 8],
] as const;
function Ants({ data, onFinish }: { data: CompanionData; onFinish: () => void }) {
  const [linked, setLinked] = useState<number[]>([]);
  const all = linked.length === ANT_SPOTS.length;
  return (
    <>
      <p className="font-body text-base text-ink">{data.steps[0]}</p>
      <div className={`${stage} h-56`}>
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[#5BB6E8]/70" aria-hidden="true" />
        {ANT_SPOTS.map(([x, y], i) => {
          const on = linked.includes(i);
          const at = linked.indexOf(i);
          // Linked ants gather into a tight raft on the water.
          const left = on ? 30 + (at % 3) * 13 : x;
          const top = on ? 60 + Math.floor(at / 3) * 14 : y;
          return (
            <button
              key={i}
              type="button"
              data-testid={`ant-${i}`}
              disabled={on}
              aria-label={`${data.action} ${i + 1}`}
              onClick={() => {
                const next = [...linked, i];
                setLinked(next);
                if (next.length === ANT_SPOTS.length) onFinish();
              }}
              className={`absolute flex h-12 w-12 items-center justify-center rounded-full text-3xl transition-all duration-500 ${
                on ? 'bg-[#B5643B]/30' : 'bg-white shadow-md hover:scale-110'
              } ${all ? 'story-float' : ''}`}
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              🐜
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="font-body text-sm font-bold text-[#1A6FA6]">
        {linked.length}/{ANT_SPOTS.length} 🐜
      </p>
    </>
  );
}

/* ── Water strider: zoom in on one leg, three levels ── */
function Strider({ data, onFinish }: { data: CompanionData; onFinish: () => void }) {
  const [level, setLevel] = useState(0);
  const last = data.steps.length - 1;
  return (
    <>
      <div className={`${stage} h-56`}>
        <svg viewBox="0 0 400 200" className="h-full w-full" aria-hidden="true">
          <rect x="0" y="120" width="400" height="80" fill="#5BB6E8" />
          {level === 0 && (
            <g>
              <ellipse cx="200" cy="95" rx="40" ry="10" fill="#5B4636" />
              {[-1, 1].map((s) => (
                <g key={s}>
                  <path d={`M${200 + s * 20} 98 L${200 + s * 90} 120`} stroke="#5B4636" strokeWidth="3" fill="none" />
                  <path d={`M${200 + s * 10} 100 L${200 + s * 60} 121`} stroke="#5B4636" strokeWidth="3" fill="none" />
                </g>
              ))}
            </g>
          )}
          {level === 1 && (
            <g>
              <path d="M0 120 L140 120 Q200 150 260 120 L400 120" fill="none" stroke="#2C7FB8" strokeWidth="4" />
              <path d="M200 0 L200 128" stroke="#5B4636" strokeWidth="14" strokeLinecap="round" />
            </g>
          )}
          {level === 2 && (
            <g>
              <path d="M0 140 L120 140 Q200 175 280 140 L400 140" fill="none" stroke="#2C7FB8" strokeWidth="4" />
              <rect x="170" y="0" width="60" height="150" rx="28" fill="#5B4636" />
              {Array.from({ length: 22 }, (_, i) => (
                <line key={i} x1={172 + (i % 2) * 56} y1={10 + i * 6.5} x2={160 + (i % 2) * 80} y2={6 + i * 6.5} stroke="#3A2C22" strokeWidth="2" />
              ))}
              {[[150, 150], [250, 152], [205, 162], [180, 158], [228, 160]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="6" fill="#FFFFFF" opacity="0.85" />
              ))}
            </g>
          )}
        </svg>
      </div>
      <p aria-live="polite" className="font-body text-base text-ink">{data.steps[level]}</p>
      {level < last && (
        <button
          type="button"
          data-testid="strider-zoom"
          onClick={() => {
            const next = level + 1;
            setLevel(next);
            if (next === last) onFinish();
          }}
          className={`${btnSecondary} self-start`}
        >
          🔍 {data.action}
        </button>
      )}
    </>
  );
}

/* ── Victoria water lily: flip the leaf, then trace each rib ── */
const RIBS = [0, 60, 120, 180, 240, 300];
function Lily({ data, onFinish }: { data: CompanionData; onFinish: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [traced, setTraced] = useState<number[]>([]);
  return (
    <>
      <p className="font-body text-base text-ink">{flipped ? data.steps[1] : data.steps[0]}</p>
      <div className={`${stage} flex h-60 items-center justify-center`}>
        <div className="transition-transform duration-700" style={{ transform: flipped ? 'rotateX(180deg)' : 'none', transformStyle: 'preserve-3d' }}>
          <svg viewBox="0 0 220 220" width="220" height="220" aria-hidden={!flipped} style={{ transform: flipped ? 'rotateX(180deg)' : 'none' }}>
            <circle cx="110" cy="110" r="100" fill={flipped ? '#9E3B4F' : '#4E9A3A'} stroke={flipped ? '#7A2A3B' : '#C33C4F'} strokeWidth="8" />
            {flipped &&
              RIBS.map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const on = traced.includes(i);
                return (
                  <line
                    key={i}
                    data-testid={`lily-rib-${i}`}
                    x1="110"
                    y1="110"
                    x2={110 + 92 * Math.cos(rad)}
                    y2={110 + 92 * Math.sin(rad)}
                    stroke={on ? '#FFD24A' : '#E7C6A9'}
                    strokeWidth={on ? 12 : 9}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all"
                    onClick={() => {
                      if (on) return;
                      const next = [...traced, i];
                      setTraced(next);
                      if (next.length === RIBS.length) onFinish();
                    }}
                  />
                );
              })}
            {flipped && <circle cx="110" cy="110" r="10" fill="#E7C6A9" />}
            {!flipped && <circle cx="110" cy="110" r="88" fill="none" stroke="#3D7E2D" strokeWidth="2" strokeDasharray="4 6" />}
          </svg>
        </div>
      </div>
      {!flipped ? (
        <button type="button" data-testid="lily-flip" onClick={() => setFlipped(true)} className={`${btnSecondary} self-start`}>
          🔄 {data.action}
        </button>
      ) : (
        <p aria-live="polite" className="font-body text-sm font-bold text-[#1A6FA6]">
          {traced.length}/{RIBS.length}
        </p>
      )}
    </>
  );
}

/* ── Coconut: peel back one layer at a time ── */
const LAYERS = ['#6B8E23', '#A0703A', '#5A3B22', '#F6F1E4'];
function Coconut({ data, onFinish }: { data: CompanionData; onFinish: () => void }) {
  const [shown, setShown] = useState(0);
  const last = data.steps.length - 1;
  return (
    <>
      <div className={`${stage} flex h-60 items-center justify-center`}>
        <svg viewBox="0 0 220 220" width="220" height="220" aria-hidden="true">
          {/* A cut-away: peeled layers stay as faint rings, the layer being explored glows. */}
          {LAYERS.map((c, i) => (
            <circle
              key={i}
              cx="110"
              cy="110"
              r={100 - i * 22}
              fill={i < shown ? 'transparent' : c}
              stroke={i === shown ? '#FFD24A' : i < shown ? '#A0703A' : '#00000022'}
              strokeWidth={i === shown ? 5 : 2}
              strokeDasharray={i < shown ? '5 6' : undefined}
              className="transition-all duration-500"
            />
          ))}
          {/* air spaces in the husk */}
          {shown === 1 &&
            Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2;
              return <circle key={i} cx={110 + 66 * Math.cos(a)} cy={110 + 66 * Math.sin(a)} r="5" fill="#F5E6CC" />;
            })}
          {shown === 1 &&
            Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return <line key={i} x1={110 + 58 * Math.cos(a)} y1={110 + 58 * Math.sin(a)} x2={110 + 76 * Math.cos(a)} y2={110 + 76 * Math.sin(a)} stroke="#7A5126" strokeWidth="2" />;
            })}
        </svg>
      </div>
      <p aria-live="polite" className="font-body text-base text-ink">{data.steps[shown]}</p>
      {shown < last && (
        <button
          type="button"
          data-testid="coconut-peel"
          onClick={() => {
            const next = shown + 1;
            setShown(next);
            if (next === last) onFinish();
          }}
          className={`${btnSecondary} self-start`}
        >
          🥥 {data.action}
        </button>
      )}
    </>
  );
}
