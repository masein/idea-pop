import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import PricingPlans from "./_components/PricingPlans";
import AskIdeaPop from "./_components/AskIdeaPop";

// The designer's own composited workshop scene (2884×1648) — characters and
// props are baked in, replacing the old bg + 15 runtime-positioned layers.
import heroScene from "../../../../public/landing/hero-scene.webp";
import paintingGirl from "../../../../public/landing/hero-painting-girl.jpg";
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

/* Spec: buttons are Montserrat ExtraBold #18785A. On the LIME button that
   colour only hits 4.04:1 (fails AA at the mobile 15px size), so lime keeps
   the darker #1F4D33; the white button takes the spec colour (5.4:1). */
const btnLime =
  "inline-flex items-center justify-center rounded-pill [font-family:var(--font-montserrat)] font-extrabold px-8 py-3 text-[clamp(0.9375rem,0.79rem+0.68vw,1.125rem)] text-[#1F4D33] transition-all duration-150 hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2 select-none shadow-sm";
const btnWhite =
  "inline-flex items-center justify-center rounded-pill [font-family:var(--font-montserrat)] font-extrabold px-8 py-3 text-[clamp(0.9375rem,0.79rem+0.68vw,1.125rem)] bg-white text-[#18785A] border border-[#18785A]/25 transition-all duration-150 hover:bg-[#F4FADD] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18785A] focus-visible:ring-offset-2 select-none shadow-sm";
const btnOutlineGreen =
  "inline-flex items-center justify-center rounded-pill font-display font-bold px-8 py-2.5 text-base bg-white text-[#2E5F4B] border-2 border-[#2E5F4B]/70 transition-all duration-150 hover:bg-[#2E5F4B] hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5F4B] focus-visible:ring-offset-2 select-none";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
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


export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
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
    <div className="bg-[#F3FFC2]">
      {/* 1. Hero — composited workshop scene */}
      <section aria-label="hero" className="relative" dir="ltr">
        {/* The scene's own aspect would make the canvas only ~439px tall at
            768 — shorter than the phone canvas, and too short for the copy —
            so it keeps a floor until the aspect ratio overtakes it (~955px). */}
        <div className="relative w-full overflow-hidden min-h-[540px] md:min-h-[34rem] md:aspect-[2884/1648]">
          {/* One composited image; next/image serves responsive sizes from it.
              Stored as WebP at the designer's full 2884×1648: the source PNG
              was 5.3MB and took over a minute to run through the image
              optimiser at w=2048, stalling the page load on retina screens. */}
          <Image
            src={heroScene}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />

          {/* hero copy — fluid type per the designer's responsive spec
              (clamp() from a 375px mobile floor to the 1440px design size).
              The % keeps the copy composed with the artwork on tall canvases;
              the px floor keeps it clear of the nav on short ones, where the
              scene is only ~514px tall but the nav still needs ~152px. */}
          <div
            className="absolute inset-x-0 top-[max(17.5%,7.9rem)] md:top-[max(17%,clamp(9.85rem,8.74rem+2.23vw,10.75rem))] z-10 px-[clamp(1rem,-1rem+8vw,6rem)] text-center"
            dir={locale === "fa" ? "rtl" : "ltr"}
          >
            {/* Cherry Bomb One ships a single 400 weight — the spec's Regular. */}
            <h1 className="[font-family:var(--font-cherry)] font-normal leading-tight text-[clamp(2rem,1.16rem+4.2vw,4rem)]">
              <span className="text-[#194D3D]">{t("hero.headline_1")}</span>{" "}
              <span className="text-[#18785A]">{t("hero.headline_2")}</span>
            </h1>
            <p className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.375rem,0.87rem+2.5vw,2.5rem)] mt-[clamp(0.5rem,0.3rem+1vw,1.25rem)]">
              <span className="text-[#194D3D]">{t("hero.sub_1")}</span>{" "}
              <span className="text-[#F2994A]">{t("hero.sub_2")}</span>
            </p>
            <p className="[font-family:var(--font-adlam)] font-normal text-[#4F4F4F] text-[clamp(0.9375rem,0.79rem+0.68vw,1.125rem)] max-w-xl mx-auto mt-3">
              {t("hero.body")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-[clamp(1.5rem,1rem+2vw,2.5rem)]">
              <Link
                href="/exploring"
                className={btnLime}
                style={{ backgroundColor: LIME }}
              >
                {t("hero.cta_explore")}
              </Link>
              <Link href="/challenges" prefetch={false} className={btnWhite}>
                {t("hero.cta_challenge")}
              </Link>
            </div>
            {/* On phones the composited scene sits right behind this line —
                a translucent pill keeps it readable over the characters. */}
            <p className="[font-family:var(--font-adlam)] font-normal text-[clamp(0.6875rem,0.6rem+0.36vw,0.8125rem)] text-[#4F4F4F] mt-3 max-md:mx-auto max-md:w-fit max-md:rounded-pill max-md:bg-white/75 max-md:px-3 max-md:py-1 max-md:backdrop-blur-[2px]">
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

      {/* 4. Paint together banner — full-bleed image with overlaid copy */}
      <section
        aria-label="paint together"
        className="relative mt-16 overflow-hidden"
      >
        <Image
          unoptimized
          src={paintingGirl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-right"
          sizes="100vw"
        />
        {/* left scrim so the heading stays legible over the mural (WCAG AA);
            kept on the physical left in both LTR and FA/RTL to match the art */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent"
        />
        <div className="relative mx-auto flex min-h-[380px] max-w-6xl items-center px-4 py-16 md:min-h-[520px]">
          <div className="max-w-sm text-center md:mr-auto md:text-left">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink leading-snug">
              {t("paint.heading")}
            </h2>
            <div className="mt-6">
              <Link href="/explore" prefetch={false} className={btnOutlineGreen}>
                {t("paint.cta")}
              </Link>
            </div>
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
