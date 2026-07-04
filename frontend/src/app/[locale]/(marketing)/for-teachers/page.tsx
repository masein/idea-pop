import { getTranslations } from "next-intl/server";
import Image, { type StaticImageData } from "next/image";
import { Link } from "@/i18n/routing";
import SamplePlanForm from "./_components/SamplePlanForm";

import classroom from "../../../../../public/for-teachers/classroom.jpg";
import stepCreate from "../../../../../public/for-teachers/step-create.png";
import stepShare from "../../../../../public/for-teachers/step-share.png";
import stepAssign from "../../../../../public/for-teachers/step-assign.png";
import stepGallery from "../../../../../public/for-teachers/step-gallery.png";
import getDashboard from "../../../../../public/for-teachers/get-dashboard.png";
import getSheets from "../../../../../public/for-teachers/get-sheets.png";
import getLetters from "../../../../../public/for-teachers/get-letters.png";
import scientistGirl from "../../../../../public/landing/start-free-girl.png";

const LIME = "#CDEB5A";
const DEEP = "#2E5F4B";

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "for_teachers" });
  return {
    title: `${t("hero_heading")} — Idea Pop`,
    description: t("hero_sub"),
  };
}

const btnLime =
  "inline-flex items-center justify-center rounded-pill font-display font-bold px-8 py-3 text-lg text-[#1F4D33] transition-all duration-150 hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2 select-none shadow-sm";

export default async function ForTeachersPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "for_teachers" });
  const safeItems = t.raw("safe_items") as string[];

  const steps: { img: StaticImageData; title: string; sub: string }[] = [
    { img: stepCreate, title: t("s1_title"), sub: t("s1_sub") },
    { img: stepShare, title: t("s2_title"), sub: t("s2_sub") },
    { img: stepAssign, title: t("s3_title"), sub: t("s3_sub") },
    { img: stepGallery, title: t("s4_title"), sub: t("s4_sub") },
  ];

  const gets: { img: StaticImageData; title: string; sub: string }[] = [
    { img: getDashboard, title: t("dashboard_title"), sub: t("dashboard_sub") },
    { img: getSheets, title: t("sheets_title"), sub: t("sheets_sub") },
    { img: getLetters, title: t("letters_title"), sub: t("letters_sub") },
  ];

  return (
    <>
      {/* 1. Hero */}
      <section aria-label="Hero" className="bg-[#F3FFC2] px-4 pt-28 pb-0">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
            {t("hero_heading")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-body text-lg font-semibold text-ink/80">
            {t("hero_sub")}
          </p>
          <div className="mt-8">
            <Link
              href="/sign-up"
              className={btnLime}
              style={{ backgroundColor: LIME }}
            >
              {t("hero_cta")}
            </Link>
          </div>
          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-t-[2rem]">
            <Image
              src={classroom}
              alt=""
              aria-hidden="true"
              priority
              className="h-auto w-full"
              sizes="(min-width: 768px) 56rem, 100vw"
            />
          </div>
        </div>
      </section>

      {/* 2. How it works in class */}
      <section aria-label="How it works in class" className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-ink md:text-4xl">
            {t("how_heading")}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.title}
                className="rounded-[1.5rem] bg-[#EDF6C5] px-5 pb-6 pt-4 text-center"
              >
                <div className="flex h-32 items-center justify-center">
                  <Image
                    src={s.img}
                    alt=""
                    aria-hidden="true"
                    className="max-h-32 w-auto object-contain"
                    sizes="200px"
                  />
                </div>
                <p className="mt-3 font-display text-lg font-bold text-ink">
                  {s.title}
                </p>
                <p className="mt-1 font-body text-sm font-semibold text-ink/70">
                  {s.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. What you get */}
      <section aria-label="What you get" className="bg-[#F3FFC2] py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-ink md:text-4xl">
            {t("get_heading")}
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {gets.map((g) => (
              <div
                key={g.title}
                className="rounded-[1.5rem] bg-white px-5 pb-8 pt-5 text-center shadow-sm"
              >
                <div className="flex h-32 items-center justify-center">
                  <Image
                    src={g.img}
                    alt=""
                    aria-hidden="true"
                    className="max-h-32 w-auto object-contain"
                    sizes="200px"
                  />
                </div>
                <p className="mt-3 font-display text-lg font-bold text-ink">
                  {g.title}
                </p>
                <p className="mt-1 font-body text-sm font-semibold text-ink/70">
                  {g.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Classroom-safe by design */}
      <section aria-label="Classroom-safe by design" className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-8 text-center font-display text-3xl font-bold text-ink md:text-4xl">
            {t("safe_heading")}
          </h2>
          <ul className="mx-auto flex max-w-2xl flex-col gap-4" role="list">
            {safeItems.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span
                  className="mt-0.5 font-bold text-explore"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span className="font-body font-bold text-ink">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Download sample plan */}
      <section aria-label="Download sample plan" className="relative overflow-hidden bg-[#DDF0E3]">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="text-center font-display text-2xl font-bold text-ink md:text-3xl">
            <span aria-hidden="true">📥 </span>
            {t("pdf_heading")}
          </h2>
          <div className="mx-auto mt-8 max-w-2xl">
            <SamplePlanForm
              label={t("pdf_label")}
              placeholder={t("pdf_placeholder")}
              button={t("pdf_button")}
              success={t("pdf_success")}
            />
          </div>
        </div>
        <Image
          src={scientistGirl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2 right-0 hidden h-56 w-auto object-contain lg:block"
          sizes="320px"
        />
      </section>

      {/* 6. CTA band */}
      <section aria-label="Create your class" className="bg-white px-3 pb-0 md:px-6 md:pb-6 md:pt-6">
        <div
          className="relative mx-auto max-w-6xl overflow-hidden rounded-t-[2.5rem] px-6 md:rounded-[2.5rem] md:px-14"
          style={{ backgroundColor: DEEP }}
        >
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
            <div className="py-10 text-center md:py-16 md:text-start">
              <h2 className="mb-8 font-display text-3xl font-bold leading-snug text-[#EDF6C5] md:text-4xl">
                {t("cta_1")}
                <br />
                {t("cta_2")}
              </h2>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-pill border-2 border-[#CDEB5A] px-8 py-3 font-display text-lg font-bold text-[#EDF6C5] transition-all duration-150 hover:bg-[#CDEB5A] hover:text-[#1F4D33] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDEB5A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E5F4B]"
              >
                {t("cta_button")}
              </Link>
            </div>
            <div className="relative flex justify-center md:justify-end">
              <Image
                src={scientistGirl}
                alt=""
                aria-hidden="true"
                className="h-64 w-auto object-contain drop-shadow-xl md:-mt-10 md:h-96"
                sizes="(min-width: 768px) 24rem, 16rem"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
