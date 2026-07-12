"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useTransition } from "react";

export interface LocaleSwitcherProps {
  /** 'dark' for the marketing nav/footer (default); 'light' for the app's white sidebar. */
  variant?: "dark" | "light";
}

export default function LocaleSwitcher({ variant = "dark" }: LocaleSwitcherProps) {
  const t = useTranslations("footer");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: "en" | "fa") {
    if (next === locale) return;
    startTransition(() => {
      // Preserve the current route (pathname is locale-stripped by next-intl).
      router.replace(pathname, { locale: next });
    });
  }

  const groupClass =
    variant === "light"
      ? "border-ink/15"
      : "border-white/30";
  const activeClass =
    variant === "light"
      ? "bg-challenge text-white"
      : "bg-[#CDEB5A] text-[#1F4D33]";
  const inactiveClass =
    variant === "light"
      ? "text-ink/60 hover:text-ink"
      : "text-white/80 hover:text-white";

  function localeButton(next: "en" | "fa", label: string) {
    return (
      <button
        onClick={() => switchLocale(next)}
        disabled={isPending}
        aria-pressed={locale === next}
        className={`rounded-pill px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge ${
          locale === next ? activeClass : inactiveClass
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 rounded-pill border p-0.5 text-sm font-semibold ${groupClass}`}
      role="group"
      aria-label={t("language")}
    >
      {localeButton("en", t("locale_en"))}
      {localeButton("fa", t("locale_fa"))}
    </div>
  );
}
