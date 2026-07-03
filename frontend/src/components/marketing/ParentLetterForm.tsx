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
        className="text-sm font-semibold text-[#CDEB5A]"
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
      <label className="sr-only" htmlFor="newsletter-email">
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
          className="flex-1 rounded-pill border border-white/20 bg-white px-4 py-2 text-sm text-ink placeholder:text-ink/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDEB5A]"
        />
        <button
          type="submit"
          className="rounded-pill bg-[#CDEB5A] px-5 py-2 text-sm font-bold text-[#1F4D33] transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDEB5A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E5F4B]"
        >
          {t("newsletter_cta")}
        </button>
      </div>
    </form>
  );
}
