"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";

export interface PricingLabels {
  monthly: string;
  annual: string;
  freeName: string;
  freePrice: string;
  freeFeatures: string[];
  ctaFree: string;
  plusName: string;
  plusPrice: string;
  plusBillingAnnual: string;
  plusBillingMonthly: string;
  plusIntro: string;
  plusFeatures: string[];
  ctaPlus: string;
  badgePopular: string;
  familyName: string;
  familyPrice: string;
  familyBillingAnnual: string;
  familyBillingMonthly: string;
  familyIntro: string;
  familyFeatures: string[];
  ctaFamily: string;
  badgeValue: string;
}

function Check() {
  return (
    <span className="text-[#2E5F4B] font-bold me-1.5" aria-hidden="true">
      ✓
    </span>
  );
}

export default function PricingPlans({ labels }: { labels: PricingLabels }) {
  const [annual, setAnnual] = useState(true);

  const toggleBase =
    "rounded-pill px-5 py-1.5 text-sm font-body font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5F4B] focus-visible:ring-offset-2";

  return (
    <div data-testid="landing-pricing">
      {/* Billing period toggle */}
      <div className="flex justify-center mb-10">
        <div
          className="inline-flex items-center rounded-pill bg-white border border-[#2E5F4B]/20 p-1"
          role="group"
          aria-label="Billing period"
        >
          <button
            type="button"
            className={`${toggleBase} ${
              !annual ? "bg-[#2E5F4B] text-white" : "text-[#2E5F4B]"
            }`}
            aria-pressed={!annual}
            onClick={() => setAnnual(false)}
          >
            {labels.monthly}
          </button>
          <button
            type="button"
            className={`${toggleBase} ${
              annual ? "bg-[#2E5F4B] text-white" : "text-[#2E5F4B]"
            }`}
            aria-pressed={annual}
            onClick={() => setAnnual(true)}
          >
            {labels.annual}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">
        {/* Free */}
        <div className="rounded-card bg-white border-2 border-[#2E5F4B]/60 p-6 flex flex-col">
          <p className="font-display font-bold text-xl text-ink mb-4">
            {labels.freeName}{" "}
            <span className="font-display">{labels.freePrice}</span>
          </p>
          <ul className="space-y-2 mb-6 flex-1" role="list">
            {labels.freeFeatures.map((f) => (
              <li key={f} className="font-body text-sm font-semibold text-ink">
                <Check />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-pill font-body font-bold px-6 py-2.5 text-sm border-2 border-[#2E5F4B]/60 text-[#2E5F4B] bg-white transition-all hover:bg-[#F4FADD] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5F4B] focus-visible:ring-offset-2"
          >
            {labels.ctaFree}
          </Link>
        </div>

        {/* Plus */}
        <div className="relative rounded-card bg-white border-2 border-[#CDEB5A] shadow-lg p-6 flex flex-col">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-pill bg-[#EDF6C5] border border-[#2E5F4B]/25 px-4 py-1 text-[11px] font-body font-bold text-[#2E5F4B] tracking-wide whitespace-nowrap">
            {labels.badgePopular}
          </span>
          <p className="font-display font-bold text-xl text-ink">
            {labels.plusName}{" "}
            <span className="font-display">{labels.plusPrice}</span>
          </p>
          <p className="font-body text-xs font-semibold text-ink/50 mb-4">
            {annual ? labels.plusBillingAnnual : labels.plusBillingMonthly}
          </p>
          <p className="font-body text-sm font-bold text-ink mb-2">
            {labels.plusIntro}
          </p>
          <ul className="space-y-2 mb-6 flex-1" role="list">
            {labels.plusFeatures.map((f) => (
              <li key={f} className="font-body text-sm font-semibold text-ink">
                <Check />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-pill font-body font-bold px-6 py-2.5 text-sm bg-[#CDEB5A] text-[#1F4D33] transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2 shadow-sm"
          >
            {labels.ctaPlus}
          </Link>
        </div>

        {/* Family */}
        <div className="relative rounded-card bg-white border-2 border-[#2E5F4B]/60 p-6 flex flex-col">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-pill bg-white border border-[#2E5F4B]/40 px-4 py-1 text-[11px] font-body font-bold text-[#2E5F4B] tracking-wide whitespace-nowrap">
            {labels.badgeValue}
          </span>
          <p className="font-display font-bold text-xl text-ink">
            {labels.familyName}{" "}
            <span className="font-display">{labels.familyPrice}</span>
          </p>
          <p className="font-body text-xs font-semibold text-ink/50 mb-4">
            {annual ? labels.familyBillingAnnual : labels.familyBillingMonthly}
          </p>
          <p className="font-body text-sm font-bold text-ink mb-2">
            {labels.familyIntro}
          </p>
          <ul className="space-y-2 mb-6 flex-1" role="list">
            {labels.familyFeatures.map((f) => (
              <li key={f} className="font-body text-sm font-semibold text-ink">
                <Check />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-pill font-body font-bold px-6 py-2.5 text-sm bg-[#2E5F4B] text-white transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5F4B] focus-visible:ring-offset-2"
          >
            {labels.ctaFamily}
          </Link>
        </div>
      </div>
    </div>
  );
}
