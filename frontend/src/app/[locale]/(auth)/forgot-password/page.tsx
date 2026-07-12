import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: `${t("heading")} — Idea Pop` };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgot");

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="forgot-password">
      <div className="mb-4 text-center text-5xl" aria-hidden="true">
        🔑
      </div>
      <h1 className="font-display text-2xl font-bold text-ink text-center mb-3">
        {t("heading")}
      </h1>
      <p className="font-body text-sm text-ink/70 text-center mb-6">{t("body")}</p>
      <Link
        href="/login"
        className="block text-center font-body text-sm font-semibold text-explore underline-offset-2 hover:underline"
      >
        {t("back_to_login")}
      </Link>
    </div>
  );
}
