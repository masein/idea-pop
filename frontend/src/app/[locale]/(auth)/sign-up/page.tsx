"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { setPersona, type Persona } from "@/lib/auth/persona";

const CHIP = "#2A2A2A";

export default function PersonaSelectPage() {
  const t = useTranslations("auth.persona_select");
  const router = useRouter();

  function handlePersona(persona: Persona) {
    setPersona(persona);
    if (persona === "kid") {
      router.push("/onboarding/kid");
    } else if (persona === "parent") {
      router.push("/sign-up/parent");
    } else if (persona === "teacher") {
      router.push("/sign-up/teacher");
    } else {
      router.push("/");
    }
  }

  const personas: Array<{
    key: Persona;
    emoji: string;
    label: string;
    sub: string;
    className: string;
  }> = [
    {
      key: "kid",
      emoji: "🧒",
      label: t("kid_label"),
      sub: t("kid_sub"),
      className: "",
    },
    {
      key: "parent",
      emoji: "🧑‍🔬",
      label: t("parent_label"),
      sub: t("parent_sub"),
      className: "",
    },
    {
      key: "teacher",
      emoji: "👩‍🏫",
      label: t("teacher_label"),
      sub: t("teacher_sub"),
      className: "sm:col-span-2 sm:mx-auto sm:w-1/2",
    },
  ];

  return (
    <div
      data-testid="persona-select"
      className="relative rounded-[2rem] bg-[#EDF6C5] px-6 py-10 shadow-lg sm:px-10"
    >
      <button
        type="button"
        aria-label={t("close")}
        onClick={() => router.push("/")}
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <h1 className="text-center font-display text-2xl font-bold text-[#1E5B2E] md:text-3xl">
        {t("heading")}
      </h1>
      <p className="mt-1 text-center font-display text-xl font-bold text-[#1E5B2E] md:text-2xl">
        {t("subhead")}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {personas.map(({ key, emoji, label, sub, className }) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePersona(key)}
            className={`group relative flex min-h-[7rem] items-center justify-between gap-3 overflow-hidden rounded-2xl px-6 py-5 text-left transition-transform duration-150 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 active:scale-[0.99] ${className}`}
            style={{ backgroundColor: CHIP }}
          >
            <span className="relative z-10">
              <span className="block font-display text-lg font-bold text-white md:text-xl">
                {label}
              </span>
              <span className="mt-0.5 block font-body text-sm text-white/70 transition-opacity duration-150 group-hover:opacity-0">
                {sub}
              </span>
              <span className="pointer-events-none absolute left-0 top-6 inline-flex translate-y-1 items-center justify-center rounded-pill bg-[#CDEB5A] px-5 py-1.5 font-display text-sm font-bold text-[#1F4D33] opacity-0 shadow transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                {t("start")}
              </span>
            </span>
            <span className="text-5xl md:text-6xl" aria-hidden="true">
              {emoji}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-8 text-center font-body text-sm text-ink/70">
        {t("already")}{" "}
        <a
          href="/login"
          className="font-bold text-[#1E5B2E] underline-offset-2 hover:underline"
        >
          {t("log_in")}
        </a>
      </p>
    </div>
  );
}
