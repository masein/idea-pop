"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ParentLetterForm() {
  const t = useTranslations("footer");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p
        className="text-sm font-semibold text-explore"
        role="status"
        aria-live="polite"
      >
        {t("newsletter_success")}
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2"
      aria-label={t("newsletter_label")}
    >
      <label className="text-sm text-ink/60" htmlFor="newsletter-email">
        {t("newsletter_label")}
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("newsletter_placeholder")}
          required
          className="flex-1 rounded-lg border border-ink/20 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
        />
        <button
          type="submit"
          className="rounded-lg bg-explore px-3 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2"
        >
          {t("newsletter_cta")}
        </button>
      </div>
    </form>
  );
}
