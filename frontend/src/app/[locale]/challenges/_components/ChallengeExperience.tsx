"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import Reveal from "./Reveal";

import riverScene from "../../../../../public/landing/try-mission-bg.jpg";
import thinkingBoy from "../../../../../public/landing/thinking-tools-avatar.png";
import robot from "../../../../../public/landing/robot.png";
import scientistGirl from "../../../../../public/landing/start-free-girl.png";

const ACCENT = "#1B79B0"; // readable blue accent
const BTN = "#2D9CDB"; // challenge blue
const BAND = "#4FB3DD"; // CTA band blue
const INK = "#1F2D33";

export default function ChallengeExperience() {
  const t = useTranslations("challenge");
  const router = useRouter();
  const goSignUp = () => router.push("/sign-up");

  // rich-text renderers for <b> (blue accent) and <g> (green accent)
  const rich = {
    b: (chunks: React.ReactNode) => (
      <span className="font-bold" style={{ color: ACCENT }}>
        {chunks}
      </span>
    ),
    g: (chunks: React.ReactNode) => (
      <span className="font-bold text-[#2E7D32]">{chunks}</span>
    ),
  };

  return (
    <div className="min-h-screen bg-[#C0F0FF]" style={{ color: INK }}>
      {/* Sticky mission header */}
      <header className="sticky top-0 z-40 border-b border-[#1B79B0]/10 bg-[#C0F0FF]/95 px-4 py-4 text-center backdrop-blur-sm">
        <h1 className="font-display text-3xl font-bold md:text-4xl" style={{ color: INK }}>
          {t("header_title")}
        </h1>
        <p className="mt-1 font-display text-lg font-bold md:text-xl" style={{ color: INK }}>
          {t.rich("header_sub", rich)}
        </p>
      </header>

      {/* 1. Brief */}
      <section aria-label="Mission brief" className="pt-10">
        <Reveal className="mx-auto max-w-5xl px-4">
          <p className="font-display text-xl font-bold md:text-2xl" style={{ color: INK }}>
            {t.rich("brief_lead", rich)}
          </p>
          <p className="mt-3 font-body text-base leading-relaxed md:text-lg" style={{ color: INK }}>
            {t("brief_body")}
          </p>
        </Reveal>
        <Reveal className="mt-8" delay={80}>
          <Image
            src={riverScene}
            alt=""
            aria-hidden="true"
            priority
            className="h-auto w-full"
            sizes="100vw"
          />
        </Reveal>
      </section>

      {/* 2. Your idea */}
      <section aria-label="Your idea" className="px-4 py-12">
        <Reveal className="mx-auto max-w-4xl">
          <div className="rounded-[1.75rem] bg-white p-6 shadow-lg">
            <label htmlFor="idea" className="sr-only">
              {t("idea_label")}
            </label>
            <textarea
              id="idea"
              rows={3}
              placeholder={t("idea_placeholder")}
              className="w-full resize-none border-0 bg-transparent font-body text-lg text-ink placeholder:text-ink/50 focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={goSignUp}
                className="rounded-pill px-6 py-2.5 font-body font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ backgroundColor: BTN }}
              >
                {t("idea_save")}
              </button>
              <button
                type="button"
                onClick={goSignUp}
                className="rounded-pill border border-ink/20 bg-white px-6 py-2.5 font-body font-bold text-ink transition-all hover:bg-ink/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D9CDB] focus-visible:ring-offset-2"
              >
                {t("idea_share")}
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 3. No idea → thinking process */}
      <section aria-label="Get inspired" className="relative overflow-hidden px-4 py-16">
        <Reveal className="mx-auto max-w-4xl text-center">
          <p className="font-display text-xl font-bold md:text-2xl" style={{ color: INK }}>
            {t("noidea_lead")}
          </p>
          <p className="mx-auto mt-3 max-w-3xl font-body text-base leading-relaxed md:text-lg" style={{ color: INK }}>
            {t.rich("noidea_body", rich)}
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={goSignUp}
              className="rounded-pill px-7 py-3 font-body font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ backgroundColor: BTN }}
            >
              {t("noidea_cta")}
            </button>
          </div>
        </Reveal>
        <Reveal
          from="right"
          delay={120}
          className="pointer-events-none absolute -bottom-4 right-0 hidden w-64 lg:block xl:w-80"
        >
          <Image
            src={thinkingBoy}
            alt=""
            aria-hidden="true"
            className="h-auto w-full object-contain"
            sizes="20rem"
          />
        </Reveal>
      </section>

      {/* 4. Brainstorm with AI */}
      <section aria-label="Brainstorm with Idea Pop AI" className="relative overflow-hidden px-4 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-end gap-4 md:grid-cols-[200px_1fr]">
          <Reveal from="left" className="flex justify-center md:justify-start">
            <Image
              src={robot}
              alt=""
              aria-hidden="true"
              className="h-auto w-40 object-contain md:w-52"
              sizes="13rem"
            />
          </Reveal>
          <Reveal delay={100}>
            <p className="mb-3 ms-1 font-display text-lg font-bold md:text-xl" style={{ color: INK }}>
              {t.rich("brainstorm_lead", rich)}
            </p>
            <div className="relative rounded-[1.75rem] bg-white p-5 shadow-lg">
              <label htmlFor="brainstorm" className="sr-only">
                {t("brainstorm_label")}
              </label>
              <textarea
                id="brainstorm"
                rows={2}
                placeholder={t("brainstorm_placeholder")}
                className="w-full resize-none border-0 bg-transparent pe-24 font-body text-lg text-ink placeholder:text-ink/50 focus:outline-none"
              />
              <div className="absolute bottom-4 end-4 flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t("brainstorm_mic")}
                  onClick={goSignUp}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D9CDB]"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={t("brainstorm_send")}
                  onClick={goSignUp}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ backgroundColor: BAND }}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
                  </svg>
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5. CTA band */}
      <section aria-label="Try Idea Pop" className="bg-[#1E6E8C] px-3 pb-0 pt-10 md:px-6 md:pt-16">
        <Reveal className="mx-auto max-w-6xl">
          <div
            className="relative overflow-hidden rounded-t-[2.5rem] px-6 md:rounded-[2.5rem] md:px-14"
            style={{ backgroundColor: BAND }}
          >
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
              <div className="py-10 text-center md:py-16 md:text-start">
                <h2 className="mb-8 font-display text-3xl font-bold leading-snug md:text-4xl" style={{ color: INK }}>
                  {t("cta_1")}
                  <br />
                  {t("cta_2")}
                  <br />
                  {t("cta_3")}
                </h2>
                <button
                  type="button"
                  onClick={goSignUp}
                  className="rounded-pill bg-white px-8 py-3 font-display text-lg font-bold text-[#1E6E8C] shadow-sm transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                  style={{ ["--tw-ring-offset-color" as string]: BAND }}
                >
                  {t("cta_button")}
                </button>
              </div>
              <div className="relative flex justify-center md:justify-end">
                <Image
                  src={scientistGirl}
                  alt=""
                  aria-hidden="true"
                  className="h-64 w-auto object-contain drop-shadow-xl md:-mt-10 md:h-[26rem]"
                  sizes="(min-width: 768px) 26rem, 16rem"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
