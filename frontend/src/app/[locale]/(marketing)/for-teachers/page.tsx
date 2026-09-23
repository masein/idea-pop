import { getTranslations } from "next-intl/server";
import Image, { type StaticImageData } from "next/image";
import { Link } from "@/i18n/routing";
import SamplePlanForm from "./_components/SamplePlanForm";
import ClosingBand from "../_components/ClosingBand";
import ScrollReveal from "../_components/ScrollReveal";
import { btnLime, cardShape, cardShapeLime, fromCenter, keepTogether, motionDelay, pagePhoto, pageTop } from "../_components/ui";
import "../motion.css";

import classroom from "../../../../../public/for-teachers/classroom.jpg";
import stepCreate from "../../../../../public/for-teachers/step-create.png";
import stepShare from "../../../../../public/for-teachers/step-share.png";
import stepAssign from "../../../../../public/for-teachers/step-assign.png";
import stepGallery from "../../../../../public/for-teachers/step-gallery.png";
import getDashboard from "../../../../../public/for-teachers/get-dashboard.png";
import getSheets from "../../../../../public/for-teachers/get-sheets.png";
import getLetters from "../../../../../public/for-teachers/get-letters.png";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "for_teachers" });
  return {
    title: `${t("hero_heading")} — Idea Pop`,
    description: t("hero_sub"),
  };
}

/* The designer's For Teachers frame on the landing page's system: Cherry Bomb One headings in #4F4F4F, ADLaM Display
   text, the landing's lime button, its footer-style email field and its closing band. Sizes are the frame's at 1440
   (heading 40, section headings 36, card titles 20, card and list text 16, the hero line 24) and scale down on phones.
   In Persian every face becomes Playpen Sans Arabic through the :lang(fa) rules in globals.css. */
const heading = "[font-family:var(--font-cherry)] font-normal text-[#4F4F4F] leading-[1.15]";
const h2Size = "text-[clamp(1.625rem,1.3rem+1.4vw,2.25rem)]";
const body = "[font-family:var(--font-adlam)] font-normal";
const cardTitle = `${body} text-[20px] leading-[24px] text-[#333333]`;
const cardSub = `${body} text-[16px] leading-[20px] text-[#4F4F4F]`;

// The sample-plan form sends nothing yet, so its section stays hidden until it can (the designer's call on
// 2026-09-22, with a reminder). Without it the closing band sits on the page's lime, as on The Method and Pricing.
const SAMPLE_PLAN_READY = false;

type Card = { img: StaticImageData; pos: string; title: string; sub: string };

export default async function ForTeachersPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "for_teachers" });
  const safeItems = t.raw("safe_items") as string[];

  // Each picture is placed as in the frame: its height, and how far it rises above the top of its card.
  const steps: Card[] = [
    { img: stepCreate, pos: "-top-[37px] h-[112px]", title: t("s1_title"), sub: t("s1_sub") },
    { img: stepShare, pos: "-top-[37px] h-[103px]", title: t("s2_title"), sub: t("s2_sub") },
    { img: stepAssign, pos: "-top-[42px] h-[104px]", title: t("s3_title"), sub: t("s3_sub") },
    { img: stepGallery, pos: "-top-[37px] h-[99px]", title: t("s4_title"), sub: t("s4_sub") },
  ];
  const gets: Card[] = [
    { img: getDashboard, pos: "-top-[72px] h-[118px]", title: t("dashboard_title"), sub: t("dashboard_sub") },
    { img: getSheets, pos: "-top-[62px] h-[118px]", title: t("sheets_title"), sub: t("sheets_sub") },
    { img: getLetters, pos: "-top-[90px] h-[177px]", title: t("letters_title"), sub: t("letters_sub") },
  ];

  return (
    // overflow-x-clip for the same reason as the landing page: nothing that pops or slides may scroll the page sideways.
    <div className="bg-[#F3FFC2] overflow-x-clip">
      <ScrollReveal />

      {/* 1. Hero: heading, line and button over the classroom picture, which runs 1183 wide, rounded like The Method's.
             The heading starts on the shared line, higher than in the frame. */}
      <section aria-label="for teachers" className={`px-4 ${pageTop} pb-[clamp(3rem,1.6rem+5.71vw,6.75rem)]`}>
        <div className="max-w-[1183px] mx-auto text-center">
          <h1 className={`${heading} text-[clamp(1.75rem,1.4rem+1.5vw,2.5rem)] md:leading-[40px]`} data-reveal="grow">
            {keepTogether(t("hero_heading"))}
          </h1>
          <p
            className={`${body} text-[#4F4F4F] text-[clamp(1.0625rem,0.9rem+0.667vw,1.5rem)] leading-[1.25] mt-3 md:mt-[14px]`}
            data-reveal="grow"
            style={motionDelay(120)}
          >
            {keepTogether(t("hero_sub"))}
          </p>
          <div className="mt-6 md:mt-[26px]">
            <Link href="/sign-up" className={btnLime} data-reveal="pop" style={motionDelay(240)}>
              {t("hero_cta")}
            </Link>
          </div>
          <Image
            src={classroom}
            alt=""
            aria-hidden="true"
            priority
            className={`w-full h-auto mt-6 md:mt-[25px] ${pagePhoto}`}
            sizes="(min-width: 1215px) 1183px, calc(100vw - 32px)"
            data-reveal="grow"
            style={motionDelay(300)}
          />
        </div>
      </section>

      {/* 2. How it works in class: four lime cards on white, each picture rising out of its card's top edge.
             One row from 1280px, two columns from 640px, stacked on phones with room for the pictures between rows. */}
      <section aria-label="how it works in class" className="bg-white px-4 pt-[18px] pb-[55px]">
        <div className="max-w-[1307px] mx-auto">
          <h2 className={`${heading} ${h2Size} text-center`} data-reveal="grow">
            {keepTogether(t("how_heading"))}
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-[41px] gap-y-[64px] mt-[51px] max-w-[420px] sm:max-w-none mx-auto" role="list">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className={`relative h-[207px] ${cardShapeLime} bg-[#F3FFC2] px-3 pt-[86px] text-center`}
                data-reveal="grow"
                style={motionDelay(fromCenter(i, steps.length) * 200)}
              >
                <Image
                  unoptimized
                  src={s.img}
                  alt=""
                  aria-hidden="true"
                  className={`absolute left-1/2 -translate-x-1/2 w-auto ${s.pos}`}
                  data-reveal="pop"
                  style={motionDelay(300 + fromCenter(i, steps.length) * 200)}
                />
                <p className={cardTitle}>{s.title}</p>
                <p className={`${cardSub} mt-[10px]`}>{s.sub}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. What you get: three white cards on lime; the pictures rise further, so rows sit further apart when stacked */}
      <section aria-label="what you get" className="px-4 pt-[18px] pb-[51px]">
        <div className="max-w-[1276px] mx-auto">
          <h2 className={`${heading} ${h2Size} text-center`} data-reveal="grow">
            {keepTogether(t("get_heading"))}
          </h2>
          <ul className="grid grid-cols-1 lg:grid-cols-3 gap-x-[40px] gap-y-[110px] mt-[100px] lg:mt-[71px] max-w-[398px] lg:max-w-none mx-auto" role="list">
            {gets.map((g, i) => (
              <li
                key={g.title}
                className={`relative h-[158px] ${cardShape} bg-white px-3 pt-[73px] text-center`}
                data-reveal="grow"
                style={motionDelay(fromCenter(i, gets.length) * 200)}
              >
                <Image
                  unoptimized
                  src={g.img}
                  alt=""
                  aria-hidden="true"
                  className={`absolute left-1/2 -translate-x-1/2 w-auto ${g.pos}`}
                  data-reveal="pop"
                  style={motionDelay(300 + fromCenter(i, gets.length) * 200)}
                />
                <p className={cardTitle}>{g.title}</p>
                <p className={`${cardSub} mt-1`}>{g.sub}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Classroom-safe by design: the heading centred, the list set from the page column's start edge */}
      <section aria-label="classroom-safe by design" className="bg-white px-4 pt-[27px] pb-[30px]">
        <div className="max-w-[1190px] mx-auto">
          <h2 className={`${heading} ${h2Size} text-center`} data-reveal="grow">
            {keepTogether(t("safe_heading"))}
          </h2>
          <ul className={`${body} text-[16px] leading-[20px] text-[#333333] mt-[20px] space-y-[13px] w-fit mx-auto`} role="list">
            {safeItems.map((item, i) => (
              <li key={item} className="flex gap-2" data-reveal="grow" style={motionDelay(i * 90)}>
                <span aria-hidden="true">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. The sample plan on mint, which carries on behind the top of the closing band. The form starts under the
             heading's first letter, as in the frame. While it is hidden, lime room above the band lets the girl rise
             into the page's own colour rather than over the white section. */}
      <div className={SAMPLE_PLAN_READY ? "bg-[#E4F8ED]" : "pt-8 md:pt-[112px]"}>
        {SAMPLE_PLAN_READY && (
          <section aria-label="download a sample plan" className="px-4 pt-[44px] pb-[64px] md:pb-[99px]">
            <div className="w-fit max-w-full mx-auto">
              <h2 className={`${heading} ${h2Size} text-center`} data-reveal="grow">
                <span aria-hidden="true" className="font-emoji">📥</span> {keepTogether(t("pdf_heading"))}
              </h2>
              <div className="mt-[25px] max-w-[650px]" data-reveal="grow" style={motionDelay(150)}>
                <SamplePlanForm
                  label={t("pdf_label")}
                  placeholder={t("pdf_placeholder")}
                  button={t("pdf_button")}
                  success={t("pdf_success")}
                />
              </div>
            </div>
          </section>
        )}

        {/* 6. The landing page's closing band. Each language sets its own lines in the message: English breaks after
               "making", Persian is one sentence that only wraps where the column is too narrow for it. */}
        <ClosingBand
          label="create your class"
          heading={<span className="whitespace-pre-line">{keepTogether(t("cta_heading"))}</span>}
          primary={{ href: "/sign-up", text: t("cta_button") }}
        />
      </div>
    </div>
  );
}
