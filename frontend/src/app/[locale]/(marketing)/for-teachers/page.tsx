import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Idea Pop for Teachers — Free creative curriculum",
  description:
    "Bring the SEE/LEARN/SOLVE creative cycle to your classroom. Class codes, privacy-first, free forever.",
};

export default async function ForTeachersPage() {
  const t = await getTranslations("for_teachers");
  const privacyItems = t.raw("privacy.items") as string[];

  return (
    <>
      {/* 1. Hero */}
      <section
        aria-label="Hero"
        className="bg-tint-lime px-4 pt-32 pb-20 text-center"
      >
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-pill bg-explore px-4 py-1 text-sm font-bold text-white">
            Free forever
          </span>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
            {t("hero.heading")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/70">
            {t("hero.subhead")}
          </p>
        </div>
      </section>

      {/* 2. Class code */}
      <section
        aria-label="Class code"
        className="bg-surface px-4 py-16"
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold text-ink">
                {t("class_code.heading")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink/70">
                {t("class_code.body")}
              </p>
            </div>

            {/* Mock class code illustration */}
            <div className="flex justify-center">
              <div className="rounded-card border-2 border-dashed border-explore/40 bg-tint-lime px-10 py-8 text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/50">
                  Your class code
                </p>
                <p className="font-display text-4xl font-bold tracking-widest text-explore">
                  IDEA-2024
                </p>
                <p className="mt-3 text-xs text-ink/40">
                  Share this with your students
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Printable parent letter */}
      <section
        aria-label="Printable parent letter"
        className="bg-tint-cream px-4 py-16"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold text-ink">
            {t("parent_letter.heading")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            {t("parent_letter.body")}
          </p>
          <div className="mt-8">
            <Link
              href="#parent-letter"
              className="inline-flex items-center justify-center gap-2 rounded-pill border-2 border-ink/20 bg-surface px-6 py-3 font-semibold text-ink transition-all hover:bg-ink/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2"
            >
              <span aria-hidden="true">📄</span>
              {t("parent_letter.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Privacy first */}
      <section
        aria-label="Privacy first"
        className="bg-sidebar px-4 py-16"
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-ink">
            {t("privacy.heading")}
          </h2>
          <ul className="mt-8 flex flex-col gap-4" aria-label="Privacy features">
            {privacyItems.map((item: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-explore"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-base text-ink/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Bottom CTA */}
      <section
        aria-label="Sign up call to action"
        className="bg-explore px-4 py-20 text-center text-white"
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            {t("cta.heading")}
          </h2>
          <div className="mt-8">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-pill bg-white px-8 py-3.5 text-lg font-semibold text-explore transition-all hover:brightness-95 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-explore"
            >
              {t("cta.button")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
