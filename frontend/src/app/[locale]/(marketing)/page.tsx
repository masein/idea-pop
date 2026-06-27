import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import PenguinMascot from "@/components/PenguinMascot";
import FaqAccordion from "@/components/marketing/FaqAccordion";

const btnPrimaryLg =
  "inline-flex items-center justify-center rounded-pill font-body px-8 py-3.5 text-lg bg-explore text-white font-semibold transition-all duration-150 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 select-none";
const btnSecondaryLg =
  "inline-flex items-center justify-center rounded-pill font-body px-8 py-3.5 text-lg border-2 border-ink/20 text-ink font-semibold bg-transparent transition-all duration-150 hover:bg-ink/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 select-none";
const btnPrimaryMd =
  "inline-flex items-center justify-center rounded-pill font-body px-6 py-2.5 text-base bg-explore text-white font-semibold transition-all duration-150 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 select-none";
const btnSecondaryMd =
  "inline-flex items-center justify-center rounded-pill font-body px-6 py-2.5 text-base border-2 border-ink/20 text-ink font-semibold bg-transparent transition-all duration-150 hover:bg-ink/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 select-none";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "marketing.hero" });
  return {
    title: "Idea Pop — Ask nature. Build with your hands.",
    description: t("subhead"),
    openGraph: {
      title: "Idea Pop",
      description: t("subhead"),
      type: "website",
    },
  };
}

export default async function LandingPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "marketing" });
  const tPricing = await getTranslations({ locale, namespace: "pricing" });

  const faqItems = t.raw("faq.items") as Array<{ q: string; a: string }>;

  const stats = [
    { label: t("year_preview.stat_missions"), emoji: "🗓️" },
    { label: t("year_preview.stat_videos"), emoji: "🎬" },
    { label: t("year_preview.stat_experts"), emoji: "🔬" },
    { label: t("year_preview.stat_portfolio"), emoji: "🎨" },
  ];

  const cycleSteps = [
    {
      label: t("cycle.see_label"),
      desc: t("cycle.see_desc"),
      bg: "bg-explore",
      emoji: "👁️",
    },
    {
      label: t("cycle.learn_label"),
      desc: t("cycle.learn_desc"),
      bg: "bg-library",
      emoji: "📚",
    },
    {
      label: t("cycle.solve_label"),
      desc: t("cycle.solve_desc"),
      bg: "bg-challenge",
      emoji: "🔧",
    },
  ];

  const curriculumTopics = [
    "Biomimicry",
    "Forces",
    "Camouflage",
    "Bridges",
    "Structures",
  ];

  const kidsProjects = [
    { emoji: "🌿", title: "Leaf bridge", nickname: "Zara, age 10" },
    { emoji: "🦋", title: "Wing glider", nickname: "Mateo, age 12" },
    { emoji: "🪨", title: "Rock arch", nickname: "Isla, age 9" },
  ];

  const experts = [
    { emoji: "🧪", name: "Dr. Maya Chen", specialty: "Biomimicry scientist" },
    { emoji: "🔨", name: "Tom Nakamura", specialty: "Structural engineer" },
    { emoji: "🎨", name: "Priya Sharma", specialty: "Design educator" },
  ];

  return (
    <>
      {/* 1. Hero */}
      <section
        aria-label="hero"
        className="bg-tint-lime py-20"
      >
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="font-display text-5xl md:text-6xl font-bold text-ink leading-tight mb-6">
            {t("hero.headline")}
          </h1>
          <p className="font-body text-xl text-ink/80 max-w-2xl mx-auto mb-10">
            {t("hero.subhead")}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center mb-8">
            <Link href="/sign-up" className={btnPrimaryLg}>
              {t("hero.cta_start")}
            </Link>
            <Link href="/sign-up" className={btnSecondaryLg}>
              {t("hero.cta_watch")}
            </Link>
          </div>
          <p className="font-body text-sm text-ink/60">{t("hero.trust")}</p>
        </div>
      </section>

      {/* 2. Year preview */}
      <section
        aria-label="what a year looks like"
        className="bg-surface py-20"
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink text-center mb-12">
            {t("year_preview.heading")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ label, emoji }) => (
              <div
                key={label}
                className="rounded-card bg-tint-lime p-6 text-center"
              >
                <div className="text-4xl mb-3">{emoji}</div>
                <p className="font-display text-lg font-bold text-ink">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Creative cycle */}
      <section
        aria-label="creative cycle"
        className="bg-tint-cream py-20"
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink text-center mb-12">
            {t("cycle.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cycleSteps.map((step) => (
              <div
                key={step.label}
                className="rounded-card bg-surface p-8 text-center shadow-sm"
              >
                <span
                  className={`inline-flex items-center gap-2 ${step.bg} text-white font-display font-bold text-sm px-4 py-1.5 rounded-pill mb-4`}
                >
                  <span>{step.emoji}</span>
                  <span>{step.label}</span>
                </span>
                <p className="font-body text-ink/80 text-base mt-2">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Together */}
      <section
        aria-label="together with parents"
        className="bg-surface py-20"
      >
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-6xl mb-6" aria-hidden="true">
            👨‍👩‍👧‍👦
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
            {t("together.heading")}
          </h2>
          <p className="font-body text-xl text-ink/80 max-w-2xl mx-auto">
            {t("together.body")}
          </p>
        </div>
      </section>

      {/* 5. Curriculum */}
      <section
        aria-label="curriculum"
        className="bg-tint-lavender py-20"
      >
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
            {t("curriculum.heading")}
          </h2>
          <p className="font-body text-xl text-ink/80 max-w-2xl mx-auto mb-10">
            {t("curriculum.body")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {curriculumTopics.map((topic) => (
              <span
                key={topic}
                className="font-body font-semibold text-ink bg-surface rounded-pill px-5 py-2 text-sm shadow-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Try now */}
      <section
        aria-label="try a mission"
        className="bg-tint-blue py-20"
      >
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
            {t("try_now.heading")}
          </h2>
          <p className="font-body text-xl text-ink/80 max-w-xl mx-auto mb-10">
            {t("try_now.body")}
          </p>
          <Link href="/sign-up" className={btnPrimaryLg}>
            {t("try_now.cta")}
          </Link>
        </div>
      </section>

      {/* 7. Kids made */}
      <section
        aria-label="projects made by kids"
        className="bg-surface py-20"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-3">
              {t("kids_made.heading")}
            </h2>
            <p className="font-body text-lg text-ink/70">{t("kids_made.subhead")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {kidsProjects.map((project) => (
              <div
                key={project.nickname}
                className="rounded-card bg-tint-cream p-8 text-center"
              >
                <div className="text-6xl mb-4" aria-hidden="true">
                  {project.emoji}
                </div>
                <p className="font-display font-bold text-ink text-lg mb-1">
                  {project.title}
                </p>
                <p className="font-body text-sm text-ink/60">{project.nickname}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Experts */}
      <section
        aria-label="expert instructors"
        className="bg-sidebar py-20"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-3">
              {t("experts.heading")}
            </h2>
            <p className="font-body text-lg text-ink/70">{t("experts.subhead")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {experts.map((expert) => (
              <div
                key={expert.name}
                className="rounded-card bg-surface p-8 text-center shadow-sm"
              >
                <div
                  className="w-16 h-16 rounded-full bg-tint-lime flex items-center justify-center text-4xl mx-auto mb-4"
                  aria-hidden="true"
                >
                  {expert.emoji}
                </div>
                <p className="font-display font-bold text-ink text-lg mb-1">
                  {expert.name}
                </p>
                <p className="font-body text-sm text-ink/60">{expert.specialty}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Pricing teaser */}
      <section
        aria-label="pricing"
        className="bg-tint-cream py-20"
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink text-center mb-12">
            {t("pricing_teaser.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free card */}
            <div className="rounded-card bg-surface p-8 shadow-sm flex flex-col">
              <div className="font-display font-bold text-xl text-ink mb-1">
                {t("pricing_teaser.free_label")}
              </div>
              <div className="font-display text-4xl font-bold text-ink mb-1">
                $0
              </div>
              <p className="font-body text-sm text-ink/60 mb-6">Always free</p>
              <Link href="/sign-up" className={`mt-auto ${btnSecondaryMd}`}>
                {t("pricing_teaser.cta_free")}
              </Link>
            </div>

            {/* Standard card */}
            <div className="rounded-card bg-tint-lavender border-2 border-pricing p-8 shadow-sm flex flex-col relative">
              <span className="absolute -top-3 right-6 bg-pricing text-white font-body font-bold text-xs px-3 py-1 rounded-pill">
                {t("pricing_teaser.savings_badge")}
              </span>
              <div className="font-display font-bold text-xl text-ink mb-1">
                {t("pricing_teaser.standard_label")}
              </div>
              <div className="font-display text-4xl font-bold text-ink mb-0.5">
                {t("pricing_teaser.monthly_price")}
                <span className="text-lg font-body font-normal text-ink/60">
                  /mo
                </span>
              </div>
              <p className="font-body text-sm text-ink/60 mb-1">
                or {t("pricing_teaser.annual_price")}/yr (
                {t("pricing_teaser.annual_per_month")})
              </p>
              <p className="font-body text-xs text-ink/50 mb-6">
                {t("pricing_teaser.cancel_anytime")}
              </p>
              <Link href="/sign-up" className={`mt-auto ${btnPrimaryMd}`}>
                {t("pricing_teaser.cta_standard")}
              </Link>
            </div>
          </div>
          <p className="font-body text-xs text-ink/50 text-center mt-6">
            {tPricing("kid_note")}
          </p>
        </div>
      </section>

      {/* 10. FAQ */}
      <section
        aria-label="frequently asked questions"
        className="bg-surface py-20"
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink text-center mb-12">
            {t("faq.heading")}
          </h2>
          <div className="max-w-2xl mx-auto">
            <FaqAccordion items={faqItems} />
          </div>
        </div>
      </section>

      {/* 11. Penguin helper */}
      <section
        aria-label="meet the penguin helper"
        className="bg-tint-lime py-20"
      >
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
            {t("penguin_helper.heading")}
          </h2>
          <p className="font-body text-xl text-ink/80 max-w-xl mx-auto mb-10">
            {t("penguin_helper.body")}
          </p>
          <div className="flex justify-center">
            <PenguinMascot label="Hi, I'm Idea Pop!" />
          </div>
        </div>
      </section>
    </>
  );
}
