import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import FaqAccordion from "@/components/marketing/FaqAccordion";
import PricingToggle from "./_components/PricingToggle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Idea Pop",
  description:
    "Start free, upgrade when your family loves it. Simple, honest pricing for Idea Pop — the kids' creative learning platform.",
};

export default async function PricingPage() {
  const t = await getTranslations("pricing");

  const freeFeatures = t.raw("free_features") as string[];
  const standardFeatures = t.raw("standard_features") as string[];
  const faqs = t.raw("faqs") as Array<{ q: string; a: string }>;

  return (
    <>
      {/* 1. Hero */}
      <section
        aria-label="Pricing hero"
        className="bg-tint-lavender px-4 pt-32 pb-20 text-center"
      >
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
            {t("heading")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/70">
            {t("subhead")}
          </p>
        </div>
      </section>

      {/* 2. Plan toggle + cards */}
      <section
        aria-label="Pricing plans"
        className="bg-surface px-4 py-16"
      >
        <div className="mx-auto max-w-5xl">
          <PricingToggle
            labels={{
              monthly: "Monthly",
              annual: "Annual",
              freeLabel: t("free_label"),
              freePrice: t("free_price"),
              freeForever: t("free_forever"),
              freeFeatures,
              ctaFree: t("cta_free"),
              standardLabel: t("standard_label"),
              monthlyPrice: t("monthly_price"),
              annualPrice: t("annual_price"),
              billingMonthly: t("billing_monthly"),
              billingAnnual: t("billing_annual"),
              annualSavings: t("annual_savings"),
              standardFeatures,
              ctaStandard: t("cta_standard"),
              cancelAnytime: t("cancel_anytime"),
              kidNote: t("kid_note"),
            }}
          />
        </div>
      </section>

      {/* 3. School / district */}
      <section
        aria-label="School and district pricing"
        className="bg-tint-blue px-4 py-16 text-center"
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-ink">
            {t("school_heading")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            {t("school_body")}
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-pill bg-challenge px-8 py-3 font-semibold text-white transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge focus-visible:ring-offset-2"
            >
              {t("school_cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* 4. FAQ */}
      <section
        aria-label="Billing frequently asked questions"
        className="bg-sidebar px-4 py-16"
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display mb-8 text-3xl font-bold text-ink">
            {t("faq_heading")}
          </h2>
          <FaqAccordion items={faqs} />
        </div>
      </section>
    </>
  );
}
