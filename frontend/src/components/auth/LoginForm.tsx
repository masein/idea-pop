'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { loginSchema, type LoginFormData } from "@/lib/schemas/auth";
import { login } from "@/lib/api/client";
import { getPersona, dashboardHref } from "@/lib/auth/persona";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginForm() {
  const t = useTranslations("auth.login");
  const ta = useTranslations("auth");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      await login(data.email, data.password);
      const persona = getPersona();
      if (persona) {
        router.push(dashboardHref(persona));
      } else {
        router.push("/sign-up");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("401") || message.toLowerCase().includes("login failed")) {
        setServerError(t("error_invalid"));
      } else {
        setServerError(t("error_generic"));
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="login-form">
      <h1 className="font-display text-2xl font-bold text-ink text-center mb-6">
        {t("heading")}
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
          {...register("email")}
        />

        <Input
          label={t("password_label")}
          type="password"
          passwordToggleLabels={{ show: ta("show_password"), hide: ta("hide_password") }}
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
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
        {t("no_account")}{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-explore underline-offset-2 hover:underline"
        >
          {t("sign_up")}
        </Link>
      </p>
    </div>
  );
}
