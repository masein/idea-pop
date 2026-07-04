import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

const btnPrimaryLg =
  "inline-flex items-center justify-center rounded-pill font-body px-8 py-3.5 text-lg bg-explore text-white font-semibold transition-all duration-150 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 select-none";

type Props = {
  params: { locale: string };
};

export async function generateMetadata() {
  return {
    title: "The Idea Pop Method — Creative learning through nature",
    description:
      "A structured weekly creative cycle: SEE, LEARN, SOLVE. Built on biomimicry and maker education for ages 8–14.",
  };
}

const powerEmojis: Record<string, string> = {
  Observation: "👁️",
  Questioning: "❓",
  Connecting: "🔗",
  Making: "🛠️",
  Sharing: "📤",
  Reflecting: "🪞",
};

const whatYouSeeIcons = ["📧", "🎬", "🧑‍🏫", "🏗️", "⭐"];

export default async function MethodPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "method" });

  const powers = t.raw("creativity.powers") as string[];
  const whatYouSeeItems = t.raw("what_you_see.items") as string[];

  const cycleSteps = [
    { step: "1", label: "SEE", color: "bg-explore text-white" },
    { step: "2", label: "LEARN", color: "bg-library text-white" },
    { step: "3", label: "SOLVE", color: "bg-challenge text-white" },
  ];

  return (
    <>
      {/* 1. Hero */}
      <section
        aria-label="method hero"
        className="bg-tint-lime pt-32 pb-20"
      >
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="font-display text-5xl md:text-6xl font-bold text-ink leading-tight mb-6">
            {t("hero.heading")}
          </h1>
          <p className="font-body text-xl text-ink/80 max-w-2xl mx-auto">
            {t("hero.subhead")}
          </p>
        </div>
      </section>

      {/* 2. Why we built it */}
      <section
        aria-label="why we built idea pop"
        className="bg-surface py-20"
      >
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-5xl mb-6" aria-hidden="true">
            💡
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
            {t("why.heading")}
          </h2>
          <p className="font-body text-xl text-ink/80 max-w-2xl mx-auto">
            {t("why.body")}
          </p>
        </div>
      </section>

      {/* 3. One cycle, every week */}
      <section
        aria-label="the weekly creative cycle"
        className="bg-tint-cream py-20"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6">
              {t("cycle.heading")}
            </h2>
            <p className="font-body text-xl text-ink/80 max-w-2xl mx-auto">
              {t("cycle.body")}
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {cycleSteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-20 h-20 rounded-full ${step.color} flex items-center justify-center font-display text-3xl font-bold shadow-md`}
                  >
                    {step.step}
                  </div>
                  <span className="font-display font-bold text-ink mt-3 text-lg">
                    {step.label}
                  </span>
                </div>
                {i < cycleSteps.length - 1 && (
                  <div
                    className="hidden md:block text-ink/30 text-3xl font-bold"
                    aria-hidden="true"
                  >
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Essential creativity mind-map */}
      <section
        aria-label="essential creativity powers"
        className="bg-tint-lavender py-20"
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink text-center mb-12">
            {t("creativity.heading")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {powers.map((power) => (
              <div
                key={power}
                className="rounded-card bg-surface p-6 text-center shadow-sm flex flex-col items-center gap-3"
              >
                <span className="text-4xl" aria-hidden="true">
                  {powerEmojis[power] ?? "✨"}
                </span>
                <span className="font-display font-bold text-ink text-base">
                  {power}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. What you'll actually see */}
      <section
        aria-label="what you will see"
        className="bg-surface py-20"
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink text-center mb-12">
            {t("what_you_see.heading")}
          </h2>
          <ol className="max-w-2xl mx-auto space-y-6" role="list">
            {whatYouSeeItems.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-5 rounded-card bg-tint-cream p-5"
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-explore flex items-center justify-center text-white font-display font-bold text-lg">
                  {i + 1}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {whatYouSeeIcons[i] ?? "📌"}
                  </span>
                  <p className="font-body text-ink text-base">{item}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. See it works */}
      <section
        aria-label="start this week's mission"
        className="bg-tint-blue py-20"
      >
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-10">
            {t("this_week.heading")}
          </h2>
          <Link href="/sign-up" className={btnPrimaryLg}>
            {t("this_week.cta")}
          </Link>
        </div>
      </section>
    </>
  );
}
