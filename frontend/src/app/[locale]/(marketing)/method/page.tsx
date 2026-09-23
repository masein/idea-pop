import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import ScrollReveal from "../_components/ScrollReveal";
import ClosingBand from "../_components/ClosingBand";
import { cardShape, cardShapeLime, keepTogether, motionDelay, pagePhoto, pageTop } from "../_components/ui";
import "../motion.css";

// The designer's frame pictures. The workshop scene and the creativity map carry their words inside them, so each
// language has its own file; the three cycle icons are cut from her picture and sit on cards of the same colour.
import workshopEn from "../../../../../public/method/workshop-en.webp";
import workshopFa from "../../../../../public/method/workshop-fa.webp";
import creativityEn from "../../../../../public/method/creativity-en.webp";
import creativityFa from "../../../../../public/method/creativity-fa.webp";
import iconSee from "../../../../../public/method/icon-see.webp";
import iconLearn from "../../../../../public/method/icon-learn.webp";
import iconSolve from "../../../../../public/method/icon-solve.webp";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata() {
  return {
    title: "The Idea Pop Method — Creative learning through nature",
    description:
      "One cycle every week: SEE, LEARN, SOLVE. Structured creativity tools in hands-on, nature-inspired projects for ages 8+.",
  };
}

export default async function MethodPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "method" });
  const fa = locale === "fa";

  const steps = t.raw("cycle.steps") as string[];
  const whyCards = t.raw("why.cards") as { title: string; sub: string }[];

  // The three cycle cards, in the designer's colours; each icon sits on its own card colour so it blends in.
  const cycleCards = [
    { icon: iconSee, bg: "bg-[#D7E9D5]", color: "text-[#296E2C]", title: t("cycle.see_title"), sub: t("cycle.see_sub") },
    { icon: iconLearn, bg: "bg-[#EDD6BD]", color: "text-[#B3271E]", title: t("cycle.learn_title"), sub: t("cycle.learn_sub") },
    { icon: iconSolve, bg: "bg-[#CAD6E6]", color: "text-[#1460B7]", title: t("cycle.solve_title"), sub: t("cycle.solve_sub") },
  ];

  const heading = "[font-family:var(--font-cherry)] font-normal text-[#4F4F4F] leading-[1.15]";
  const body = "[font-family:var(--font-adlam)] font-normal text-[#4F4F4F]";

  return (
    // overflow-x-clip for the same reason as the landing page: nothing that pops or slides may scroll the page sideways.
    <div className="bg-[#F3FFC2] overflow-x-clip">
      <ScrollReveal />

      {/* 1. Hero: the page title over the designer's workshop scene */}
      <section aria-label="method hero" className={`${pageTop} pb-8 md:pb-12`}>
        <div className="max-w-[1180px] mx-auto px-4">
          {/* The page title is 40px like Pricing's and For Teachers', on the shared heading line. */}
          <h1 className={`${heading} text-[clamp(1.75rem,1.4rem+1.5vw,2.5rem)] md:leading-[40px] text-center mb-6 md:mb-10`} data-reveal="grow">
            {keepTogether(t("hero.heading"))}
          </h1>
          <Image
            src={fa ? workshopFa : workshopEn}
            alt={t("hero.image_alt")}
            priority
            className={`w-full h-auto ${pagePhoto}`}
            sizes="(min-width: 1180px) 1100px, 92vw"
            data-reveal="grow"
            style={motionDelay(150)}
          />
        </div>
      </section>

      {/* 2. Why we built it: the problems the method answers, then the promise */}
      <section aria-label="why we built idea pop" className="py-8 md:py-12">
        <div className="max-w-[1180px] mx-auto px-4 text-center">
          <h2 className={`${heading} text-[clamp(1.625rem,1.3rem+1.4vw,2.25rem)] mb-6 md:mb-8`} data-reveal="grow">
            {keepTogether(t("why.heading"))}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {whyCards.map((card, i) => (
              <div
                key={card.title}
                className={`${cardShapeLime} bg-[#EEFFA9] px-6 py-6 md:py-7 text-start`}
                data-reveal="grow"
                style={motionDelay(i * 120)}
              >
                <p className={`[font-family:var(--font-adlam)] font-normal text-[#194D3D] text-[clamp(1.125rem,0.95rem+0.8vw,1.5rem)] leading-[1.3]`}>
                  {keepTogether(card.title)}
                </p>
                <p className={`${body} text-[clamp(0.9375rem,0.85rem+0.4vw,1.125rem)] mt-2`}>{card.sub}</p>
              </div>
            ))}
          </div>
          <p
            className="[font-family:var(--font-adlam)] font-normal text-[#18785A] text-[clamp(1rem,0.9rem+0.5vw,1.25rem)] mt-6 md:mt-7"
            data-reveal="grow"
            style={motionDelay(whyCards.length * 120)}
          >
            {keepTogether(t("why.line"))}
          </p>
        </div>
      </section>

      {/* 3. One cycle, every week: the designer's framed diagram, rebuilt so the words translate and stack on phones */}
      <section aria-label="the weekly creative cycle" className="py-8 md:py-12">
        <div className="max-w-[1240px] mx-auto px-4">
          <div className="rounded-[28px] md:rounded-[44px] border-[3px] border-[#E4D493] px-4 md:px-9 pt-5 md:pt-7 pb-4 md:pb-6" data-reveal="grow">
            <h2 className={`${heading} text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)] text-center mb-4 md:mb-6`}>
              {keepTogether(t("cycle.heading"))}
            </h2>
            {/* Desktop: three cards in a row with an arrow between them. Phones: the same cards stacked. */}
            <div className="flex flex-col md:flex-row items-stretch justify-center gap-3 md:gap-4">
              {cycleCards.map((card, i) => (
                <div key={card.title} className="contents">
                  {i > 0 && (
                    <div
                      className="self-center text-[#E0C98A] text-[26px] md:text-[34px] leading-none rotate-90 md:rotate-0 rtl:md:-scale-x-100"
                      aria-hidden="true"
                    >
                      →
                    </div>
                  )}
                  <div
                    className={`flex-1 ${cardShape} ${card.bg} px-5 py-4 md:py-5 text-center`}
                    data-reveal="pop"
                    style={motionDelay(i * 150)}
                  >
                    <Image src={card.icon} alt="" aria-hidden="true" className="mx-auto h-[54px] md:h-[76px] w-auto" sizes="76px" />
                    <p className={`[font-family:var(--font-adlam)] font-normal ${card.color} text-[clamp(1.1875rem,1rem+0.8vw,1.5rem)] leading-[1.25] mt-1`}>
                      {card.title}
                    </p>
                    <p className={`${body} text-[clamp(0.875rem,0.8rem+0.35vw,1.0625rem)] mt-1`}>{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* The eight steps of every mission, on one pill */}
            <p
              className={`${body} rounded-pill bg-[#EAECD3] px-4 md:px-7 py-2.5 md:py-3 mt-4 md:mt-5 text-center text-[clamp(0.875rem,0.78rem+0.35vw,1.0625rem)] leading-[1.5]`}
              data-reveal="grow"
              style={motionDelay(200)}
            >
              <span className="text-[#1F3D34]">{t("cycle.anatomy_label")}</span>
              {steps.map((step) => {
                const [num, ...rest] = step.split(" ");
                return (
                  // No dots between the steps, like the landing page's mission band. Each step holds together, and the
                  // em-spaces between them are the only places the line may break — so it stacks tidily on a phone.
                  <Fragment key={step}>
                    {"\u2003"}
                    <span className="whitespace-nowrap">
                      <span className="text-[#1F3D34]">{num}</span> {rest.join(" ")}
                    </span>
                  </Fragment>
                );
              })}
            </p>
            <p className={`${body} text-[#707070] text-center text-[clamp(0.875rem,0.8rem+0.3vw,1rem)] mt-3`} data-reveal="grow" style={motionDelay(280)}>
              {keepTogether(t("cycle.caption"))}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Mastering innovation: the paragraph and the designer's creativity map */}
      <section aria-label="mastering innovation" className="py-8 md:py-12">
        <div className="max-w-[1180px] mx-auto px-4">
          <h2 className={`${heading} text-[clamp(1.625rem,1.3rem+1.4vw,2.25rem)] text-start`} data-reveal="grow">
            {t("innovation.heading")}
          </h2>
          <p className={`${body} text-[clamp(0.9375rem,0.87rem+0.35vw,1.125rem)] leading-[1.6] mt-2 md:mt-3`} data-reveal="grow" style={motionDelay(140)}>
            {t("innovation.body")}
          </p>
          <Image
            src={fa ? creativityFa : creativityEn}
            alt={t("innovation.image_alt")}
            className="w-full h-auto rounded-[20px] md:rounded-[28px] mt-5 md:mt-7 shadow-[0_6px_18px_rgba(0,0,0,0.14)]"
            sizes="(min-width: 1180px) 1100px, 92vw"
            data-reveal="grow"
            style={motionDelay(220)}
          />
        </div>
      </section>

      {/* 5. What you'll actually see: the weekly report, next to what the child keeps */}
      <section aria-label="what you will see" className="py-8 md:py-12">
        <div className="max-w-[1180px] mx-auto px-4">
          <h2 className={`${heading} text-[clamp(1.625rem,1.3rem+1.4vw,2.25rem)] text-center mb-6 md:mb-8`} data-reveal="grow">
            {keepTogether(t("what_you_see.heading"))}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
            <div
              className="rounded-[20px] bg-[#EEFFA9] shadow-[inset_0_0_0_2px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] px-6 py-6 text-center h-full flex flex-col"
              data-reveal="grow"
            >
              <p className="[font-family:var(--font-cherry)] font-normal text-[#18785A] text-[clamp(1rem,0.9rem+0.5vw,1.25rem)]">
                {t("what_you_see.report_title")}
              </p>
              <p className={`${body} text-[clamp(0.875rem,0.82rem+0.3vw,1rem)] leading-[1.6] mt-4`}>{keepTogether(t("what_you_see.report_body"))}</p>
              <p className={`${body} text-[#1F3D34] text-[clamp(0.9375rem,0.87rem+0.35vw,1.0625rem)] mt-4`}>{t("what_you_see.report_quote")}</p>
              <p className={`${body} text-[#707070] text-[clamp(0.875rem,0.84rem+0.15vw,0.9375rem)] mt-auto pt-6`}>{t("what_you_see.report_note")}</p>
            </div>
            <div className="grid gap-4 md:gap-6">
              {[
                { title: t("what_you_see.portfolio_title"), sub: t("what_you_see.portfolio_sub") },
                { title: t("what_you_see.certificate_title"), sub: t("what_you_see.certificate_sub") },
              ].map((card, i) => (
                <div key={card.title} className={`${cardShape} bg-white px-6 py-5 text-center`} data-reveal="grow" style={motionDelay(160 + i * 160)}>
                  <p className="[font-family:var(--font-cherry)] font-normal text-[#296E2C] text-[clamp(0.9375rem,0.87rem+0.4vw,1.1875rem)] leading-[1.3]">
                    {card.title}
                  </p>
                  <p className={`${body} text-[clamp(0.875rem,0.82rem+0.3vw,1rem)] mt-2`}>{card.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. See it works — this week: the landing page's closing band, with the sample link beside it */}
      <ClosingBand
        label="start this week"
        heading={keepTogether(t("this_week.heading"))}
        primary={{ href: "/sign-up", text: t("this_week.cta_free") }}
        secondary={{ href: "/challenges", text: t("this_week.cta_sample") }}
      />
    </div>
  );
}
