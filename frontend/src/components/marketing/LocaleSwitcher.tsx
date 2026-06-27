"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useTransition } from "react";

export default function LocaleSwitcher() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: "en" | "fa") {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      className="flex items-center gap-1 rounded-pill border border-ink/20 p-0.5 text-sm font-semibold"
      role="group"
      aria-label="Language"
    >
      <button
        onClick={() => switchLocale("en")}
        disabled={isPending}
        aria-pressed={locale === "en"}
        className={`rounded-pill px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore ${
          locale === "en"
            ? "bg-explore text-white"
            : "text-ink/60 hover:text-ink"
        }`}
      >
        {t("locale_en")}
      </button>
      <button
        onClick={() => switchLocale("fa")}
        disabled={isPending}
        aria-pressed={locale === "fa"}
        className={`rounded-pill px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore ${
          locale === "fa"
            ? "bg-explore text-white"
            : "text-ink/60 hover:text-ink"
        }`}
      >
        {t("locale_fa")}
      </button>
    </div>
  );
}
