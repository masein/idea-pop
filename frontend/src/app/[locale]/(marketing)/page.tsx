import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import PricingPlans from "./_components/PricingPlans";
import AskIdeaPop from "./_components/AskIdeaPop";

import heroBg from "../../../../public/landing/hero-bg.jpg";
import heroKid1 from "../../../../public/landing/hero-kid-1.png";
import heroKid2 from "../../../../public/landing/hero-kid-2.png";
import heroKid3 from "../../../../public/landing/hero-kid-3.png";
import heroKid4 from "../../../../public/landing/hero-kid-4.png";
import heroKid5 from "../../../../public/landing/hero-kid-5.png";
import heroBear from "../../../../public/landing/hero-bear.png";
import heroDeer from "../../../../public/landing/hero-deer.png";
import heroCrab from "../../../../public/landing/hero-crab.png";
import heroTurtle from "../../../../public/landing/hero-turtle.png";
import heroWorm from "../../../../public/landing/hero-worm.png";
import heroDino from "../../../../public/landing/hero-dinasour.png";
import heroParrot from "../../../../public/landing/hero-parrot.png";
import heroMechBird from "../../../../public/landing/hero-mechanical-bird.png";
import heroRopeBox from "../../../../public/landing/hero-rope-box.png";
import heroPainting from "../../../../public/landing/hero-painting.png";
import thinkingToolsAvatar from "../../../../public/landing/thinking-tools-avatar.png";
import realMakesAvatar from "../../../../public/landing/real-makes-avatar.png";
import portfolioAvatar from "../../../../public/landing/portfolio-avatar.png";
import seeTheWorld from "../../../../public/landing/see-the-world.png";
import learnCircle from "../../../../public/landing/learn.png";
import solveAndMake from "../../../../public/landing/solve-and-make.png";
import tryMissionBg from "../../../../public/landing/try-mission-bg.jpg";
import startFreeGirl from "../../../../public/landing/start-free-girl.png";

const LIME = "#CDEB5A";
const DEEP = "#2E5F4B";

const btnLime =
  "inline-flex items-center justify-center rounded-pill font-display font-bold px-8 py-3 text-lg text-[#1F4D33] transition-all duration-150 hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2 select-none shadow-sm";
const btnWhite =
  "inline-flex items-center justify-center rounded-pill font-display font-bold px-8 py-3 text-lg bg-white text-[#1F4D33] border border-[#1F4D33]/25 transition-all duration-150 hover:bg-[#F4FADD] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2 select-none shadow-sm";
const btnOutlineGreen =
  "inline-flex items-center justify-center rounded-pill font-display font-bold px-8 py-2.5 text-base bg-white text-[#2E5F4B] border-2 border-[#2E5F4B]/70 transition-all duration-150 hover:bg-[#2E5F4B] hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5F4B] focus-visible:ring-offset-2 select-none";

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

/* Hero scene layers: [image, alt-less decorative] positioned in % of the
   2880x1648 workshop canvas. Tuned to match the Figma composition. */
const heroLayers: Array<{
  src: typeof heroKid1;
  left?: string;
  right?: string;
  bottom?: string;
  top?: string;
  width: string;
  z?: number;
}> = [
  { src: heroWorm, left: "2.5%", bottom: "19%", width: "5%" },
  { src: heroTurtle, left: "8.5%", bottom: "0.5%", width: "10%" },
  { src: heroKid1, left: "9.5%", bottom: "5%", width: "13.5%", z: 2 },
  { src: heroKid2, left: "21.5%", bottom: "9%", width: "12%", z: 2 },
  { src: heroMechBird, left: "26.5%", bottom: "2.5%", width: "12%" },
  { src: heroKid3, left: "34%", bottom: "7%", width: "13%", z: 2 },
  { src: heroRopeBox, left: "37%", bottom: "0.5%", width: "10.5%" },
  { src: heroBear, left: "43.5%", bottom: "4.5%", width: "10.5%", z: 3 },
  { src: heroDeer, left: "47%", bottom: "19%", width: "10.5%" },
  { src: heroCrab, left: "56%", bottom: "14%", width: "6%", z: 2 },
  { src: heroPainting, left: "56.5%", bottom: "0.5%", width: "17%" },
  { src: heroKid4, left: "64.5%", bottom: "6%", width: "13.5%", z: 2 },
  { src: heroDino, left: "74.5%", bottom: "3%", width: "8.5%" },
  { src: heroKid5, left: "84%", bottom: "3.5%", width: "12.5%", z: 2 },
  { src: heroParrot, left: "70.5%", top: "12%", width: "12%" },
];

export default async function LandingPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "marketing" });

  const faqItems = t.raw("faq.items") as Array<{ q: string; a: string }>;

  const yearCards = [
    {
      img: thinkingToolsAvatar,
      title: t("year.card1_title"),
      sub: t("year.card1_sub"),
    },
    {
      img: realMakesAvatar,
      title: t("year.card2_title"),
      sub: t("year.card2_sub"),
    },
    {
      img: portfolioAvatar,
      title: t("year.card3_title"),
      sub: t("year.card3_sub"),
    },
  ];

  const cycleCards = [
    {
      img: seeTheWorld,
      label: t("cycle.see_label"),
      desc: t("cycle.see_desc"),
      color: "text-[#2E7D32]",
    },
    {
      img: learnCircle,
      label: t("cycle.learn_label"),
      desc: t("cycle.learn_desc"),
      color: "text-[#B3271E]",
    },
    {
      img: solveAndMake,
      label: t("cycle.solve_label"),
      desc: t("cycle.solve_desc"),
      color: "text-[#1565C0]",
    },
  ];

  /* Tile colors are AA-checked for white bold 16px text (≥4.5:1). */
  const spineTiles = [
    { label: t("curriculum.spine_1"), bg: "bg-[#3B63C4]", emoji: "🖼️" },
    { label: t("curriculum.spine_2"), bg: "bg-[#C0392B]", emoji: "📷" },
    { label: t("curriculum.spine_3"), bg: "bg-[#9A6A00]", emoji: "💡" },
    { label: t("curriculum.spine_4"), bg: "bg-[#7A3CB8]", emoji: "✂️" },
    { label: t("curriculum.spine_5"), bg: "bg-[#0F7079]", emoji: "📋" },
    { label: t("curriculum.spine_6"), bg: "bg-[#2E7D32]", emoji: "🎤" },
  ];

  const experts = [
    { name: t("experts.e1_name"), role: t("experts.e1_role"), bg: "bg-[#F7E3DC]" },
    { name: t("experts.e2_name"), role: t("experts.e2_role"), bg: "bg-[#E2E7FA]" },
    { name: t("experts.e3_name"), role: t("experts.e3_role"), bg: "bg-[#DFE9E0]" },
    { name: t("experts.e4_name"), role: t("experts.e4_role"), bg: "bg-[#E9DEF5]" },
  ];

  return (
    <div className="bg-[#F4FADD]">
      {/* 1. Hero — composited workshop scene */}
      <section aria-label="hero" className="relative" dir="ltr">
        <div className="relative w-full overflow-hidden min-h-[540px] md:min-h-0 md:aspect-[2880/1648]">
          <Image
                unoptimized
            src={heroBg}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />

          {/* scene layers (decorative) */}
          <div aria-hidden="true" className="hidden md:block">
            {heroLayers.map((l, i) => (
              <Image
                unoptimized
                key={i}
                src={l.src}
                alt=""
                className="absolute h-auto select-none pointer-events-none"
                style={{
                  left: l.left,
                  right: l.right,
                  bottom: l.bottom,
                  top: l.top,
                  width: l.width,
                  zIndex: l.z ?? 1,
                }}
                sizes="20vw"
              />
            ))}
          </div>

          {/* hero copy */}
          <div
            className="absolute inset-x-0 top-[16%] md:top-[13%] z-10 px-4 text-center"
            dir={locale === "fa" ? "rtl" : "ltr"}
          >
            <h1 className="font-display font-bold leading-tight text-4xl md:text-5xl lg:text-6xl">
              <span className="text-[#3FA33E]">{t("hero.headline_1")}</span>{" "}
              <span className="text-[#1E5B2E]">{t("hero.headline_2")}</span>
            </h1>
            <p className="font-display font-bold text-2xl md:text-3xl mt-2">
              <span className="text-[#256B37]">{t("hero.sub_1")}</span>{" "}
              <span className="text-library">{t("hero.sub_2")}</span>
            </p>
            <p className="font-body font-semibold text-[#2F4A38] text-sm md:text-base max-w-xl mx-auto mt-3">
              {t("hero.body")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-5">
              <Link
                href="/sign-up"
                className={btnLime}
                style={{ backgroundColor: LIME }}
              >
                {t("hero.cta_explore")}
              </Link>
              <Link href="/challenges" prefetch={false} className={btnWhite}>
                {t("hero.cta_challenge")}
              </Link>
            </div>
            <p className="font-body font-bold text-xs md:text-sm text-[#233D2C] mt-3">
              {t("hero.trust")}
            </p>
          </div>
        </div>
      </section>

      {/* 2. What a year looks like */}
      <section aria-label="what a year looks like" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink text-center mb-12">
            {t("year.heading")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto">
            {yearCards.map((card) => (
              <div key={card.title} className="relative pt-16">
                <div className="rounded-[2rem] bg-[#EDF6C5] px-6 pt-20 pb-8 text-center h-full">
                  <p className="font-display text-xl font-bold text-ink">
                    {card.title}
                  </p>
                  <p className="font-body text-sm font-semibold text-ink/70 mt-1">
                    {card.sub}
                  </p>
                </div>
                <Image
                unoptimized
                  src={card.img}
                  alt=""
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full object-cover object-top"
                  sizes="128px"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-12">
            <p className="rounded-pill bg-[#EDF6C5] border border-[#2E5F4B]/15 px-5 py-1.5 text-xs md:text-sm font-body text-ink/80">
              <span className="font-bold text-ink">{t("year.steps_label")}</span>{" "}
              {t("year.steps")}
            </p>
          </div>
        </div>
      </section>

      {/* 3. How it works — creative cycle */}
      <section aria-label="how it works" className="px-3 md:px-6">
        <div
          className="max-w-6xl mx-auto rounded-[2.5rem] px-6 pt-14 pb-10 md:px-12"
          style={{ backgroundColor: DEEP }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#EDF6C5] text-center mb-20">
            {t("cycle.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 max-w-4xl mx-auto pb-4">
            {cycleCards.map((card) => (
              <div key={card.label} className="relative pt-14">
                <div className="rounded-[1.75rem] bg-[#EDF6C5] px-5 pt-20 pb-6 text-center h-full">
                  <p className={`font-display font-bold text-lg ${card.color}`}>
                    {card.label}
                  </p>
                  <p className="font-body text-sm font-semibold text-ink/80 mt-1">
                    {card.desc}
                  </p>
                </div>
                <Image
                unoptimized
                  src={card.img}
                  alt=""
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full object-cover ring-4 ring-[#EDF6C5]"
                  sizes="112px"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Paint together banner */}
      <section
        aria-label="paint together"
        className="relative mt-16 overflow-hidden bg-gradient-to-r from-[#FDF6E3] via-[#EAF3F7] to-[#F9E7DE]"
      >
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid grid-cols-1 md:grid-cols-2 items-center gap-10">
          <div className="text-center md:text-start">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink leading-snug">
              {t("paint.heading")}
            </h2>
            <div className="mt-6">
              <Link href="/explore" prefetch={false} className={btnOutlineGreen}>
                {t("paint.cta")}
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
                unoptimized
              src={heroPainting}
              alt=""
              aria-hidden="true"
              className="w-full max-w-md h-auto"
              sizes="(min-width: 768px) 28rem, 90vw"
            />
          </div>
        </div>
      </section>

      {/* 5. Curriculum — design-thinking spine */}
      <section aria-label="curriculum" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#1E5B2E] mb-3">
            {t("curriculum.heading")}
          </h2>
          <p className="font-body text-lg md:text-xl font-bold text-ink">
            {t("curriculum.sub")}
          </p>
          <p className="font-body text-sm font-semibold text-ink/70 max-w-3xl mx-auto mt-1 mb-10">
            {t("curriculum.note")}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 max-w-4xl mx-auto">
            {spineTiles.map((tile) => (
              <div
                key={tile.label}
                className={`${tile.bg} aspect-[3/4] flex flex-col items-center justify-between p-4`}
              >
                <span className="text-4xl md:text-5xl mt-6" aria-hidden="true">
                  {tile.emoji}
                </span>
                <span className="font-display font-bold text-white text-sm md:text-base leading-tight pb-1">
                  {tile.label}
                </span>
              </div>
            ))}
          </div>
          <p className="font-body text-[11px] uppercase tracking-widest font-bold text-ink/50 text-start max-w-4xl mx-auto mt-2">
            {t("curriculum.spine_credit")}
          </p>

          <h3 className="font-display text-2xl md:text-3xl font-bold text-ink mt-16 mb-4">
            {t("curriculum.path_heading")}
          </h3>
          <p className="font-body font-bold text-ink/90 text-sm md:text-base">
            {t("curriculum.path_line1")}
          </p>
          <p className="font-body font-bold text-ink/90 text-sm md:text-base mt-1">
            {t("curriculum.path_line2")}
          </p>
          <div className="mt-8">
            <Link href="/method" className={btnOutlineGreen}>
              {t("curriculum.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Try one mission */}
      <section aria-label="try a mission">
        <div className="py-12 md:py-14 text-center px-4" style={{ backgroundColor: "#E5F5A3" }}>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2">
            {t("try_now.heading")}
          </h2>
          <p className="font-body font-bold text-ink/80 mb-6">{t("try_now.body")}</p>
          <Link href="/challenges" prefetch={false} className={btnWhite}>
            {t("try_now.cta")}
          </Link>
        </div>
        <Image
                unoptimized
          src={tryMissionBg}
          alt=""
          aria-hidden="true"
          className="w-full h-auto"
          sizes="100vw"
        />
      </section>

      {/* 7. Made by kids this month */}
      <section aria-label="made by kids" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink text-center mb-12">
            {t("kids_made.heading")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-card bg-[#F3EDE4]"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 8. Real experts */}
      <section aria-label="experts" className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-12">
            {t("experts.heading")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {experts.map((e) => (
              <div key={e.name} className="flex flex-col items-center">
                <div
                  className={`w-24 h-24 rounded-full ${e.bg}`}
                  aria-hidden="true"
                />
                <p className="font-body font-bold text-ink mt-4">{e.name}</p>
                <p className="font-body font-semibold text-sm text-ink/70">
                  {e.role}
                </p>
              </div>
            ))}
          </div>
          <p className="font-body font-bold text-sm text-ink/80 mt-12">
            {t("experts.note")}
          </p>
        </div>
      </section>

      {/* 9. Pricing */}
      <section aria-label="pricing" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink text-center mb-10">
            {t("pricing_teaser.heading")}
          </h2>
          <PricingPlans
            labels={{
              monthly: t("pricing_teaser.monthly"),
              annual: t("pricing_teaser.annual"),
              freeName: t("pricing_teaser.free_name"),
              freePrice: t("pricing_teaser.free_price"),
              freeFeatures: [
                t("pricing_teaser.free_f1"),
                t("pricing_teaser.free_f2"),
                t("pricing_teaser.free_f3"),
                t("pricing_teaser.free_f4"),
                t("pricing_teaser.free_f5"),
              ],
              ctaFree: t("pricing_teaser.cta_free"),
              plusName: t("pricing_teaser.plus_name"),
              plusPrice: t("pricing_teaser.plus_price"),
              plusBillingAnnual: t("pricing_teaser.plus_billing_annual"),
              plusBillingMonthly: t("pricing_teaser.plus_billing_monthly"),
              plusIntro: t("pricing_teaser.plus_intro"),
              plusFeatures: [
                t("pricing_teaser.plus_f1"),
                t("pricing_teaser.plus_f2"),
                t("pricing_teaser.plus_f3"),
                t("pricing_teaser.plus_f4"),
              ],
              ctaPlus: t("pricing_teaser.cta_plus"),
              badgePopular: t("pricing_teaser.badge_popular"),
              familyName: t("pricing_teaser.family_name"),
              familyPrice: t("pricing_teaser.family_price"),
              familyBillingAnnual: t("pricing_teaser.family_billing_annual"),
              familyBillingMonthly: t("pricing_teaser.family_billing_monthly"),
              familyIntro: t("pricing_teaser.family_intro"),
              familyFeatures: [
                t("pricing_teaser.family_f1"),
                t("pricing_teaser.family_f2"),
                t("pricing_teaser.family_f3"),
              ],
              ctaFamily: t("pricing_teaser.cta_family"),
              badgeValue: t("pricing_teaser.badge_value"),
            }}
          />
        </div>
      </section>

      {/* 10. FAQ */}
      <section aria-label="questions parents ask" className="py-8 md:py-12">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-ink text-center mb-8">
            {t("faq.heading")}
          </h2>
          <ul className="space-y-3" role="list">
            {faqItems.map((item) => (
              <li
                key={item.q}
                className="rounded-pill bg-white px-6 py-3 shadow-sm font-body text-sm md:text-base text-ink"
              >
                <span className="font-bold">{item.q}</span>
                <span className="text-ink/80"> — {item.a}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 11. Ask Idea Pop */}
      <AskIdeaPop
        heading={t("ask.heading")}
        sub={t("ask.sub")}
        placeholder={t("ask.placeholder")}
        inputLabel={t("ask.input_label")}
        sendLabel={t("ask.send_label")}
        micLabel={t("ask.mic_label")}
      />

      {/* 12. CTA band */}
      <section aria-label="start for free" className="px-3 md:px-6 pb-0">
        <div
          className="max-w-6xl mx-auto rounded-t-[2.5rem] rounded-b-none md:rounded-[2.5rem] px-6 md:px-14 pt-10 md:pt-0 relative overflow-visible"
          style={{ backgroundColor: DEEP }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
            <div className="py-6 md:py-16 text-center md:text-start">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-[#EDF6C5] leading-snug mb-8">
                {t("cta_band.heading")}
              </h2>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-pill font-display font-bold px-8 py-3 text-lg border-2 border-[#CDEB5A] text-[#EDF6C5] transition-all duration-150 hover:bg-[#CDEB5A] hover:text-[#1F4D33] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDEB5A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E5F4B] select-none"
              >
                {t("cta_band.cta")}
              </Link>
            </div>
            <div className="relative flex justify-center md:justify-end">
              <Image
                unoptimized
                src={startFreeGirl}
                alt=""
                aria-hidden="true"
                className="w-64 md:w-96 h-auto md:-mt-28 drop-shadow-xl"
                sizes="(min-width: 768px) 24rem, 16rem"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
