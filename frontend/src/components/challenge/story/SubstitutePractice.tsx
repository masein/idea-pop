'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Popi, StepNav, optionClass, pillCtaClass } from './StoryBits';
import type { MissionStory } from './types';
import type { BadgeKey, GameUpdate, MissionGame, SubstState } from './useMissionGame';
import { EMPTY_SUBST } from './useMissionGame';
import { createProject, getIdeaFeedback } from '@/lib/api/client';
import { btnPrimary, btnSecondary, btnText } from '@/components/challenge/buttons';

interface Props {
  challengeId: string;
  story: MissionStory;
  game: MissionGame;
  update: GameUpdate;
  award: (badge: BadgeKey) => void;
  /** This visit's photos of the saved idea and the lab model (they aren't kept on the device). */
  ideaPhotoUrl: string | null;
  labPhotoUrl: string | null;
  /** On to the next step (Celebrate & share in Max's challenge). */
  onDone: () => void;
  onBack: () => void;
}


const fieldClass =
  'w-full min-w-0 rounded-xl border border-[#8FA3B8] bg-white px-3 py-2 font-body text-base text-ink placeholder:text-ink/40 focus:border-challenge focus:outline-none';

/**
 * SCAMPER's first tool, S — Substitute, as a three-page practice (Max's challenge):
 * 1. pick the starting point (the kid's saved idea, or the clay boat when there is none),
 * 2. say what to replace and with what (Popi asks a clarifying question; or a hint, then an
 *    example), then predict, 3. test fairly, record and save. Everything is saved to the kid's
 * account, privately; the photo is optional.
 */
export default function SubstitutePractice({
  challengeId,
  story,
  game,
  update,
  award,
  ideaPhotoUrl,
  labPhotoUrl,
  onDone,
  onBack,
}: Props) {
  const t = useTranslations('story');
  const locale = useLocale();
  const sub = story.substitute!;
  const raw: SubstState = { ...EMPTY_SUBST, ...(game.subst ?? {}) };
  const s: SubstState = raw.page === 3 ? { ...raw, page: 2 } : raw;
  const set = (patch: Partial<SubstState>) => update((g) => ({ subst: { ...EMPTY_SUBST, ...(g.subst ?? {}), ...patch } }));
  const top = useRef<HTMLDivElement>(null);
  const go = (page: 1 | 2 | 3) => {
    set({ page });
    const toTop = () => {
      window.scrollTo({ top: 0 });
      document.querySelector('main')?.scrollTo({ top: 0 });
    };
    requestAnimationFrame(() => requestAnimationFrame(toTop));
  };

  const idea = game.savedIdea;
  // A one-box sketch saves the name as its words too: show it once.
  const ideaWords =
    s.ideaText ?? [idea?.title, idea?.description !== idea?.title ? idea?.description : null].filter(Boolean).join('. ');
  const lab = game.savedLab;
  const onIdea = s.start === 'idea';
  const startName = onIdea ? ideaWords : sub.model_name;

  return (
    <div ref={top} data-testid="substitute-practice" className="flex scroll-mt-4 flex-col gap-5 py-4">
      <div className="flex gap-1.5 rounded-pill bg-white p-1" aria-label={t('subst_pages_aria')}>
        {[1, 2].map((n) => (
          <span
            key={n}
            aria-current={s.page === n ? 'step' : undefined}
            className={`flex-1 rounded-pill px-2 py-2 text-center font-body text-sm font-bold ${
              s.page === n ? 'bg-challenge text-white' : n < s.page ? 'text-explore' : 'text-ink/50'
            }`}
          >
            {n < s.page ? '✓' : n} {t(`subst_page_${n}`)}
          </span>
        ))}
      </div>

      {s.page === 1 && (
        <PageOne
          s={s}
          set={set}
          idea={idea ? { words: ideaWords, photo: ideaPhotoUrl } : null}
          model={{ name: sub.model_name, lab: lab ? labLine(t, lab) : null, photo: labPhotoUrl }}
          onBack={onBack}
          onNext={() => go(2)}
        />
      )}

      {s.page === 2 && (
        <PageTwo
          s={s}
          set={set}
          challengeId={challengeId}
          locale={locale}
          start={{ onIdea, name: startName, detail: !onIdea && lab ? labLine(t, lab) : null, photo: onIdea ? ideaPhotoUrl : labPhotoUrl, question: onIdea ? t('subst_idea_question') : sub.model_question }}
          hint={onIdea ? t('subst_idea_hint') : sub.hint}
          example={onIdea ? null : sub.example}
          modelMaterial={sub.model_material}
          onBack={() => go(1)}
          onNext={async () => {
            // Save the starting point, the substitution and the prediction, then celebrate.
            const summary = [
              `${t('subst_saved_start')}: ${startName}`,
              `${t('subst_replace_label')} ${s.replace} ${t('subst_with_label')} ${s.withWhat}`,
              s.clarify.trim() ? `${t('subst_clarify_label')}: ${s.clarify}` : '',
              `${t('subst_predict_q')} ${s.prediction}`,
            ]
              .filter(Boolean)
              .join('\n');
            try {
              await createProject({
                title: t('subst_project_title'),
                what_i_made: summary,
                what_i_used: `${s.replace} → ${s.withWhat}`,
                what_was_hard: '',
                what_id_improve: '',
                challenge_id: challengeId,
                step_type: 'practice',
              });
            } catch {
              // never block the kid; the answers stay on the device too
            }
            award('tool');
            update((g) => ({ subst: { ...EMPTY_SUBST, ...(g.subst ?? {}), saved: true }, substSaved: summary }));
            onDone();
          }}
        />
      )}

    </div>
  );
}

/** Scamper, the idea-building companion, explains the tool. A clean round spot waits for
 *  Scamper's picture. */
function ScamperSays({ text }: { text: string }) {
  const t = useTranslations('story');
  return (
    <div data-testid="scamper-says" className="flex items-end gap-3">
      <span aria-hidden="true" className="h-20 w-20 shrink-0 rounded-full border-2 border-dashed border-[#9CC9E6] bg-white/60" />
      <div className="relative min-w-0 flex-1 rounded-[18px] bg-white px-4 py-3 shadow-sm">
        <p className="font-body text-sm font-bold text-challenge">{t('scamper_says')}</p>
        <p className="font-body text-lg font-semibold leading-snug text-ink">{text}</p>
      </div>
    </div>
  );
}

function labLine(t: ReturnType<typeof useTranslations>, lab: NonNullable<MissionGame['savedLab']>) {
  return t('subst_lab_best', { shape: lab.best, count: lab.bestValue, measure: lab.measure });
}

/* ── Page 1: one idea, more possibilities ─────────────────────────────────── */

function PageOne({
  s,
  set,
  idea,
  model,
  onBack,
  onNext,
}: {
  s: SubstState;
  set: (p: Partial<SubstState>) => void;
  idea: { words: string; photo: string | null } | null;
  model: { name: string; lab: string | null; photo: string | null };
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations('story');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(idea?.words ?? '');
  return (
    <>
      <Popi text={t('subst_p1_popi')} keepLines />

      {idea ? (
        <section data-testid="subst-saved-idea" className="flex flex-col gap-3 rounded-[20px] bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl text-challenge">{t('subst_your_idea')}</h2>
          {idea.photo && (
            // eslint-disable-next-line @next/next/no-img-element -- the kid's own sketch, a blob URL
            <img src={idea.photo} alt={t('subst_sketch_alt')} className="max-h-56 w-full rounded-xl object-contain" />
          )}
          {editing ? (
            <>
              <label htmlFor="subst-idea-edit" className="sr-only">{t('subst_your_idea')}</label>
              <textarea id="subst-idea-edit" rows={3} dir="auto" value={draft} onChange={(e) => setDraft(e.target.value)} className={fieldClass} />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  data-testid="subst-idea-save"
                  disabled={draft.trim().length < 2}
                  onClick={() => {
                    set({ ideaText: draft.trim(), start: 'idea' });
                    setEditing(false);
                  }}
                  className={btnPrimary}
                >
                  {t('subst_edit_done')}
                </button>
              </div>
            </>
          ) : (
            <>
              <p dir="auto" className="font-body text-lg font-semibold leading-snug text-ink">{idea.words}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  data-testid="subst-use-idea"
                  aria-pressed={s.start === 'idea'}
                  onClick={() => set({ start: 'idea' })}
                  className={s.start === 'idea' ? btnPrimary : btnSecondary}
                >
                  {s.start === 'idea' ? `✓ ${t('subst_use_idea')}` : t('subst_use_idea')}
                </button>
                <button
                  type="button"
                  data-testid="subst-use-boat"
                  aria-pressed={s.start === 'boat'}
                  onClick={() => set({ start: 'boat' })}
                  className={s.start === 'boat' ? btnPrimary : btnSecondary}
                >
                  {s.start === 'boat' ? `✓ ${t('subst_use_boat')}` : t('subst_use_boat')}
                </button>
                <button type="button" data-testid="subst-edit-idea" onClick={() => setEditing(true)} className={btnText}>
                  {t('subst_edit_idea')}
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <button
            type="button"
            data-testid="subst-no-idea"
            aria-pressed={s.start === 'boat'}
            onClick={() => set({ start: 'boat' })}
            className={`self-start ${optionClass(s.start === 'boat' ? 'picked' : 'idle')} !text-base`}
          >
            {t('subst_no_idea')}
          </button>
        </section>
      )}

      {s.start === 'boat' && (
        <section data-testid="subst-model" className="story-rise flex flex-col gap-2 rounded-[20px] bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl text-challenge">{model.name}</h2>
          {model.photo && (
            // eslint-disable-next-line @next/next/no-img-element -- the kid's own model photo, a blob URL
            <img src={model.photo} alt="" className="max-h-56 w-full rounded-xl object-contain" />
          )}
          <p className="font-body text-base font-semibold text-ink">{model.lab ?? t('subst_model_no_lab')}</p>
        </section>
      )}

      {s.start && (
        <section className="story-rise flex flex-col gap-3">
          <div className="flex items-center gap-4">
            {/* A clean spot for Scamper's picture (still to come). */}
            <span
              data-testid="scamper-spot"
              aria-hidden="true"
              className="h-24 w-24 shrink-0 rounded-full border-2 border-dashed border-[#9CC9E6] bg-white/60"
            />
            <div className="min-w-0 flex-1">
              <Popi text={t('subst_scamper_popi')} />
            </div>
          </div>
        </section>
      )}

      <StepNav onBack={onBack} backLabel={t('back')}>
        <button type="button" data-testid="subst-to-2" disabled={!s.start || editing} onClick={onNext} className={pillCtaClass}>
          {t('subst_try')}
        </button>
      </StepNav>
    </>
  );
}

/* ── Page 2: S — Substitute ───────────────────────────────────────────────── */

function PageTwo({
  s,
  set,
  challengeId,
  locale,
  start,
  hint,
  example,
  modelMaterial,
  onBack,
  onNext,
}: {
  s: SubstState;
  set: (p: Partial<SubstState>) => void;
  challengeId: string;
  locale: string;
  start: { onIdea: boolean; name: string; detail: string | null; photo: string | null; question: string };
  hint: string;
  example: string | null;
  modelMaterial: string;
  onBack: () => void;
  onNext: () => Promise<void>;
}) {
  const t = useTranslations('story');
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const clear = s.replace.trim().length >= 2 && s.withWhat.trim().length >= 2;
  const ready = clear && s.prediction.trim().length >= 2;

  async function discuss() {
    setAsking(true);
    const words = `${t('subst_replace_label')} ${s.replace} ${t('subst_with_label')} ${s.withWhat}. (${start.name})`;
    const f = clear ? await getIdeaFeedback(challengeId, words, locale, 'substitute') : null;
    // With the AI helper off (or a blocked reply), Popi's fixed words still ask or confirm.
    const reply =
      f && !f.blocked
        ? f.message
        : clear
          ? t('subst_popi_clear', { a: s.replace.trim(), b: s.withWhat.trim() })
          : t('subst_popi_unclear');
    set({ popi: reply });
    setAsking(false);
  }

  return (
    <>
      <ScamperSays text={t('subst_p2_popi')} />

      <section className="flex flex-col gap-2 rounded-[20px] bg-white p-5 shadow-sm">
        <p className="font-body text-xs font-extrabold uppercase tracking-wide text-[#1E7A44]">
          {start.onIdea ? t('subst_your_idea') : t('subst_starting_model')}
        </p>
        {start.photo && (
          // eslint-disable-next-line @next/next/no-img-element -- the kid's own photo, a blob URL
          <img src={start.photo} alt="" className="max-h-44 w-full rounded-xl object-contain" />
        )}
        <p dir="auto" className="font-body text-base font-semibold text-ink">{start.name}</p>
        {start.detail && <p className="font-body text-base text-ink">{start.detail}</p>}
        <h2 className="mt-1 font-display text-2xl text-challenge">{start.question}</h2>
      </section>

      <section data-testid="subst-change" className="flex flex-col gap-3 rounded-[20px] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[auto_1fr_auto_1fr]">
          <label htmlFor="subst-replace" className="font-body text-base font-bold text-ink">{t('subst_replace_label')}</label>
          <input id="subst-replace" autoComplete="off" dir="auto" maxLength={80} value={s.replace} onChange={(e) => set({ replace: e.target.value })} placeholder={t('subst_replace_ph')} className={fieldClass} />
          <label htmlFor="subst-with" className="font-body text-base font-bold text-ink">{t('subst_with_label')}</label>
          <input id="subst-with" autoComplete="off" dir="auto" maxLength={80} value={s.withWhat} onChange={(e) => set({ withWhat: e.target.value })} placeholder={t('subst_with_ph')} className={fieldClass} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" data-testid="subst-discuss" onClick={() => void discuss()} disabled={asking} className={btnSecondary}>
            {asking ? t('popi_reading_short') : t('subst_discuss')}
          </button>
          <button type="button" data-testid="subst-hint" onClick={() => set({ hintOpen: true })} className={btnText}>
            {t('subst_hint_btn')}
          </button>
        </div>

        {s.popi && (
          <div data-testid="subst-popi-reply" aria-live="polite" className="flex flex-col gap-2 rounded-xl bg-[#EAF5FC] p-3">
            <p className="font-body text-sm font-bold text-challenge">{t('popi_says')}</p>
            <p className="font-body text-base font-semibold text-ink">{s.popi}</p>
            <label htmlFor="subst-clarify" className="font-body text-sm font-semibold text-ink">{t('subst_clarify_label')}</label>
            <textarea id="subst-clarify" rows={2} dir="auto" maxLength={240} value={s.clarify} onChange={(e) => set({ clarify: e.target.value })} placeholder={t('subst_clarify_ph')} className={fieldClass} />
          </div>
        )}

        {s.hintOpen && (
          <div data-testid="subst-hint-text" className="flex flex-col gap-2 rounded-xl bg-[#FFF7E0] p-3">
            <p className="font-body text-base font-semibold text-[#5a4300]">💡 {hint}</p>
            {example && !s.exampleOpen && (
              <button type="button" data-testid="subst-example" onClick={() => set({ exampleOpen: true })} className={`${btnText} self-start`}>
                {t('subst_example_btn')}
              </button>
            )}
            {example && s.exampleOpen && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-body text-base text-[#5a4300]">{t('subst_example_is', { example })}</p>
                <button
                  type="button"
                  data-testid="subst-use-example"
                  onClick={() => set({ replace: s.replace.trim() ? s.replace : modelMaterial, withWhat: example })}
                  className={btnSecondary}
                >
                  {t('subst_use_example', { example })}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-[20px] bg-white p-5 shadow-sm">
        <label htmlFor="subst-predict" className="font-body text-lg font-bold text-ink">{t('subst_predict_q')}</label>
        <textarea id="subst-predict" data-testid="subst-predict" rows={3} dir="auto" maxLength={300} value={s.prediction} onChange={(e) => set({ prediction: e.target.value })} placeholder={t('subst_predict_ph')} className={fieldClass} />
      </section>

      <StepNav onBack={onBack} backLabel={t('back')}>
        <button
          type="button"
          data-testid="subst-finish"
          disabled={!ready || saving}
          onClick={async () => {
            setSaving(true);
            await onNext();
            setSaving(false);
          }}
          className={pillCtaClass}
        >
          {saving ? t('saving_short') : t('subst_finish')}
        </button>
      </StepNav>
    </>
  );
}
