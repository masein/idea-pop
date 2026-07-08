'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { registerSchema, type RegisterFormData } from "@/lib/schemas/auth";
import { register } from "@/lib/api/client";
import { setPersona, dashboardHref } from "@/lib/auth/persona";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface RegisterFormProps {
  role: "parent" | "teacher";
}

export default function RegisterForm({ role }: RegisterFormProps) {
  const t = useTranslations("auth.register");
  const ta = useTranslations("auth");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const heading = role === "parent" ? t("heading_parent") : t("heading_teacher");

  async function onSubmit(data: RegisterFormData) {
    setServerError(null);
    try {
      await register(data.email, data.password, role);
      setPersona(role);
      router.push(dashboardHref(role));
    } catch {
      setServerError(t("error_generic"));
    }
  }

  return (
    <div className="mx-auto w-full max-w-md bg-white rounded-2xl shadow-lg p-8" data-testid="register-form">
      <h1 className="font-display text-2xl font-bold text-ink text-center mb-6">
        {heading}
      </h1>

      {serverError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-5"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Input
          label={t("email_label")}
          type="email"
          placeholder={t("email_placeholder")}
          autoComplete="email"
          error={errors.email?.message}
          {...field("email")}
        />

        <Input
          label={t("password_label")}
          type="password"
          placeholder={t("password_placeholder")}
          autoComplete="new-password"
          error={errors.password?.message}
          passwordToggleLabels={{ show: ta("show_password"), hide: ta("hide_password") }}
          {...field("password")}
        />

        <Input
          label={t("confirm_label")}
          type="password"
          placeholder={t("confirm_placeholder")}
          autoComplete="new-password"
          error={errors.passwordConfirm?.message}
          passwordToggleLabels={{ show: ta("show_password"), hide: ta("hide_password") }}
          {...field("passwordConfirm")}
        />

        <Button
          variant="primary"
          size="lg"
          type="submit"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "…" : t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center font-body text-sm text-ink/60">
        {t("already")}{" "}
        <Link
          href="/login"
          className="font-semibold text-explore underline-offset-2 hover:underline"
        >
          {t("log_in")}
        </Link>
      </p>
    </div>
  );
}
