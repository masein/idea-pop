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
        className="[font-family:var(--font-montserrat)] text-sm font-bold text-[#D7F26A]"
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
          className="h-11 min-w-0 flex-1 rounded-pill bg-white px-4 [font-family:var(--font-montserrat)] text-[16px] font-medium text-[#1F2D33] placeholder:text-[#8B95A1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D1EF5A]"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-pill bg-[#D1EF5A] px-6 [font-family:var(--font-montserrat)] text-[16px] font-extrabold text-[#1F4D33] shadow-[inset_0_0_0_1px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] transition-all duration-150 hover:brightness-105 hover:scale-[1.11] hover:shadow-[inset_0_0_0_2px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] active:scale-[0.97] active:bg-[#B8D24F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D1EF5A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E574D]"
        >
          {t("newsletter_cta")}
        </button>
      </div>
    </form>
  );
}
