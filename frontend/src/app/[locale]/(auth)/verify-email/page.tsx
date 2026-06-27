'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { getPersona, dashboardHref } from "@/lib/auth/persona";
import { Button } from "@/components/ui/Button";

export default function VerifyEmailPage() {
  const t = useTranslations("auth.verify_email");
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const verified = searchParams.get("verified") === "1";

  const [resent, setResent] = useState(false);

  // If arriving with ?verified=1 we show success immediately; no network call needed —
  // verification already happened when the user clicked the email link.
  const [showSuccess, setShowSuccess] = useState(verified);

  useEffect(() => {
    if (verified) {
      setShowSuccess(true);
    }
  }, [verified]);

  function handleResend() {
    // No resend endpoint yet — just show a confirmation state.
    setResent(true);
  }

  function handleGoToDashboard() {
    const persona = getPersona() ?? "parent";
    router.push(dashboardHref(persona));
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-lg p-8 text-center"
      data-testid="verify-email-page"
    >
      {showSuccess ? (
        <>
          <div className="text-5xl mb-4" aria-hidden="true">
            ✅
          </div>
          <h1 className="font-display text-2xl font-bold text-ink mb-3">
            {t("success_heading")}
          </h1>
          <p className="font-body text-ink/60 text-sm mb-7">
            {t("success_body")}
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleGoToDashboard}
          >
            Go to dashboard
          </Button>
        </>
      ) : (
        <>
          <div className="text-5xl mb-4" aria-hidden="true">
            📬
          </div>
          <h1 className="font-display text-2xl font-bold text-ink mb-3">
            {t("heading")}
          </h1>
          <p className="font-body text-ink/60 text-sm mb-7">
            {email
              ? t("body", { email })
              : t("body", { email: "your inbox" })}
          </p>

          {resent ? (
            <p
              role="status"
              className="font-body text-sm font-semibold text-explore"
            >
              {t("resent")}
            </p>
          ) : (
            <div className="space-y-3">
              <p className="font-body text-xs text-ink/50">{t("no_email")}</p>
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={handleResend}
              >
                {t("resend")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
