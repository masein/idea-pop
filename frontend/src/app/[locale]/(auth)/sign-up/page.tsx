'use client';

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { setPersona, type Persona } from "@/lib/auth/persona";

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
    icon: string;
    label: string;
    sub: string;
  }> = [
    { key: "kid", icon: "🎮", label: t("kid_label"), sub: t("kid_sub") },
    { key: "parent", icon: "👨‍👩‍👦", label: t("parent_label"), sub: t("parent_sub") },
    { key: "teacher", icon: "🏫", label: t("teacher_label"), sub: t("teacher_sub") },
    { key: "other", icon: "🌐", label: t("other_label"), sub: t("other_sub") },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8" data-testid="persona-select">
      <h1 className="font-display text-2xl font-bold text-ink text-center mb-1">
        {t("heading")}
      </h1>
      <p className="font-body text-ink/60 text-center text-sm mb-6">
        {t("subhead")}
      </p>

      <div className="space-y-3">
        {personas.map(({ key, icon, label, sub }) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePersona(key)}
            className="group w-full flex items-center gap-4 rounded-xl border border-ink/10 bg-white px-5 py-4 text-left transition-all duration-150 hover:bg-tint-lime hover:scale-[1.02] hover:border-explore/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <span className="text-3xl flex-shrink-0" role="img" aria-hidden="true">
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-body font-bold text-ink text-base">{label}</p>
              <p className="font-body text-ink/55 text-sm">{sub}</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5 flex-shrink-0 text-ink/30 group-hover:text-explore transition-colors"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ))}
      </div>

      <p className="mt-7 text-center font-body text-sm text-ink/60">
        {t("already")}{" "}
        <a
          href="/login"
          className="font-semibold text-explore underline-offset-2 hover:underline"
        >
          {t("log_in")}
        </a>
      </p>
    </div>
  );
}
