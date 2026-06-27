'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { kidProfileSchema, type KidProfileFormData } from '@/lib/schemas/auth';
import { AVATARS } from '@/lib/avatars';
import { createChild } from '@/lib/api/client';
import { setPersona } from '@/lib/auth/persona';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const TOTAL_STEPS = 4;
const BIRTH_YEARS = Array.from({ length: 17 }, (_, i) => 2022 - i);

export default function KidOnboardingPage() {
  const t = useTranslations('onboarding.kid');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<KidProfileFormData>({
    resolver: zodResolver(kidProfileSchema),
    mode: 'onBlur',
    defaultValues: {
      avatar_id: '',
      nickname: '',
      birth_year: undefined,
      parent_email: '',
    },
  });

  const selectedAvatar = watch('avatar_id');

  async function advanceStep() {
    const fieldsByStep: Record<number, (keyof KidProfileFormData)[]> = {
      1: ['avatar_id'],
      2: ['nickname'],
      3: ['birth_year'],
    };
    const fields = fieldsByStep[step];
    if (fields) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setStep((s) => s + 1);
  }

  async function onSubmit(data: KidProfileFormData) {
    setApiError(null);
    try {
      await createChild({
        nickname: data.nickname,
        avatar_id: data.avatar_id,
        birth_year: data.birth_year,
        parent_email: data.parent_email,
      });
      setPersona('kid');
      router.push('/dashboard/kid');
    } catch {
      setApiError(t('error_generic'));
    }
  }

  return (
    <div data-testid="kid-wizard" className="flex flex-col items-center w-full">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mt-6">
        <p className="text-sm text-ink/50 font-body mb-4">
          {t('step_of', { current: step, total: TOTAL_STEPS })}
        </p>

        <div className="h-1 bg-ink/10 rounded-full mb-6">
          <div
            className="h-full bg-explore rounded-full transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {step === 1 && (
            <section data-testid="step-1">
              <h2 className="font-display text-2xl text-ink mb-1">{t('step_avatar')}</h2>
              <p className="text-sm text-ink/60 mb-6">{t('step_avatar_sub')}</p>

              <Controller
                name="avatar_id"
                control={control}
                render={({ field }) => (
                  <div
                    data-testid="avatar-grid"
                    className="grid grid-cols-4 gap-3"
                    role="group"
                    aria-label={t('step_avatar')}
                  >
                    {AVATARS.map((avatar) => {
                      const isSelected = field.value === avatar.id;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={avatar.label}
                          onClick={() => field.onChange(avatar.id)}
                          className={[
                            'relative flex items-center justify-center rounded-full w-16 h-16 mx-auto transition-transform duration-150',
                            isSelected
                              ? 'ring-4 ring-explore scale-110'
                              : 'hover:scale-105',
                          ].join(' ')}
                          style={{ backgroundColor: avatar.bg }}
                        >
                          <span className="text-5xl leading-none select-none">{avatar.emoji}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              />

              {errors.avatar_id && (
                <p role="alert" className="text-xs text-red-500 mt-2">
                  {errors.avatar_id.message}
                </p>
              )}

              <div className="mt-8">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={advanceStep}
                  disabled={!selectedAvatar}
                >
                  {t('next')}
                </Button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section data-testid="step-2">
              <h2 className="font-display text-2xl text-ink mb-1">{t('step_nickname')}</h2>
              <p className="text-sm text-ink/60 mb-6">{t('step_nickname_sub')}</p>

              <Input
                label={t('step_nickname')}
                placeholder={t('step_nickname_placeholder')}
                error={errors.nickname?.message}
                autoFocus
                autoComplete="off"
                {...register('nickname')}
              />

              <div className="flex gap-3 mt-8">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setStep((s) => s - 1)}
                >
                  {t('back')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={advanceStep}
                >
                  {t('next')}
                </Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section data-testid="step-3">
              <h2 className="font-display text-2xl text-ink mb-1">{t('step_birth_year')}</h2>
              <p className="text-sm text-ink/60 mb-6">{t('step_birth_year_sub')}</p>

              <div className="flex flex-col gap-1 font-body">
                <label
                  htmlFor="birth-year-select"
                  className="text-sm font-semibold text-ink/80"
                >
                  {t('step_birth_year')}
                </label>
                <select
                  id="birth-year-select"
                  aria-invalid={!!errors.birth_year}
                  className={[
                    'w-full rounded-card border bg-white px-4 py-3 text-ink',
                    'transition-shadow duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-explore focus:ring-offset-1',
                    errors.birth_year ? 'border-red-500 focus:ring-red-500' : 'border-ink/20',
                  ].join(' ')}
                  {...register('birth_year', { valueAsNumber: true })}
                >
                  <option value="">—</option>
                  {BIRTH_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {errors.birth_year && (
                  <p role="alert" className="text-xs text-red-500 pl-1">
                    {errors.birth_year.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setStep((s) => s - 1)}
                >
                  {t('back')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={advanceStep}
                >
                  {t('next')}
                </Button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section data-testid="step-4">
              <h2 className="font-display text-2xl text-ink mb-1">{t('step_parent_email')}</h2>
              <p className="text-sm text-ink/60 mb-6">{t('step_parent_email_sub')}</p>

              <Input
                type="email"
                label={t('step_parent_email')}
                placeholder={t('step_parent_email_placeholder')}
                error={errors.parent_email?.message}
                autoFocus
                autoComplete="email"
                {...register('parent_email')}
              />

              {apiError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mt-3">
                  {apiError}
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setStep((s) => s - 1)}
                >
                  {t('back')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('submitting') : t('submit')}
                </Button>
              </div>
            </section>
          )}
        </form>
      </div>
    </div>
  );
}
