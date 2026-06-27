'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { createClassSchema, type CreateClassFormData } from '@/lib/schemas/auth';
import { createClass } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type ClassResult = {
  id: string;
  class_code: string;
  name: string;
};

export default function TeacherOnboardingPage() {
  const t = useTranslations('onboarding.teacher');
  const [classResult, setClassResult] = useState<ClassResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateClassFormData>({
    resolver: zodResolver(createClassSchema),
    mode: 'onBlur',
  });

  async function onSubmit(data: CreateClassFormData) {
    setApiError(null);
    try {
      const result = await createClass(data.name);
      setClassResult(result);
    } catch {
      setApiError(t('error_generic'));
    }
  }

  async function handleCopy() {
    if (!classResult) return;
    await navigator.clipboard.writeText(classResult.class_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div data-testid="teacher-onboarding" className="flex flex-col items-center w-full">
      {!classResult ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mt-6">
          <h1 className="font-display text-2xl text-ink mb-1">{t('heading')}</h1>
          <p className="text-sm text-ink/60 font-body mb-6">{t('subhead')}</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label={t('class_name_label')}
              placeholder={t('class_name_placeholder')}
              error={errors.name?.message}
              autoFocus
              {...register('name')}
            />

            {apiError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mt-3">
                {apiError}
              </div>
            )}

            <div className="mt-8">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('submitting') : t('submit')}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mt-6 flex flex-col items-center text-center">
          <h2 className="font-display text-2xl text-ink mb-2">{t('class_code_heading')}</h2>
          <p className="text-sm text-ink/60 font-body mb-6">{t('class_code_body')}</p>

          <div
            data-testid="class-code-display"
            className="font-display text-4xl tracking-widest text-explore bg-tint-lime rounded-card px-6 py-4 text-center w-full mb-6 select-all"
          >
            {classResult.class_code}
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full"
              onClick={handleCopy}
            >
              {copied ? t('copied') : t('copy_code')}
            </Button>

            <Link
              href="/dashboard/teacher"
              className="inline-flex items-center justify-center gap-2 rounded-pill font-body font-semibold transition-all duration-150 bg-explore text-white hover:brightness-110 active:scale-95 px-8 py-3.5 text-lg w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2"
            >
              {t('done')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
