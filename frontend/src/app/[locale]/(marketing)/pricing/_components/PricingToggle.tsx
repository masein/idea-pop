"use client";

import { useState } from "react";
import PricingCard from "@/components/marketing/PricingCard";

interface PricingToggleProps {
  labels: {
    monthly: string;
    annual: string;
    freeLabel: string;
    freePrice: string;
    freeForever: string;
    freeFeatures: string[];
    ctaFree: string;
    standardLabel: string;
    monthlyPrice: string;
    annualPrice: string;
    billingMonthly: string;
    billingAnnual: string;
    annualSavings: string;
    standardFeatures: string[];
    ctaStandard: string;
    cancelAnytime: string;
    kidNote: string;
  };
}

export default function PricingToggle({ labels }: PricingToggleProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div>
      {/* Monthly / Annual toggle */}
      <div
        className="mb-10 flex items-center justify-center gap-3"
        role="group"
        aria-label="Billing period"
      >
        <span
          className={`text-sm font-semibold transition-colors ${
            !isAnnual ? "text-ink" : "text-ink/40"
          }`}
        >
          {labels.monthly}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isAnnual}
          onClick={() => setIsAnnual((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 ${
            isAnnual ? "bg-explore" : "bg-ink/20"
          }`}
        >
          <span className="sr-only">Toggle annual billing</span>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              isAnnual ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span
          className={`text-sm font-semibold transition-colors ${
            isAnnual ? "text-ink" : "text-ink/40"
          }`}
        >
          {labels.annual}
        </span>
      </div>

      {/* Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:max-w-3xl lg:mx-auto">
        <PricingCard
          label={labels.freeLabel}
          price={labels.freePrice}
          billingLabel={labels.freeForever}
          features={labels.freeFeatures}
          ctaLabel={labels.ctaFree}
          ctaHref="/sign-up"
        />
        <PricingCard
          label={labels.standardLabel}
          price={isAnnual ? labels.annualPrice : labels.monthlyPrice}
          billingLabel={
            isAnnual ? labels.billingAnnual : labels.billingMonthly
          }
          savingsBadge={isAnnual ? labels.annualSavings : undefined}
          features={labels.standardFeatures}
          ctaLabel={labels.ctaStandard}
          ctaHref="/sign-up"
          isPrimary
        />
      </div>

      {/* Below-card notes */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-sm text-ink/50">{labels.cancelAnytime}</p>
        <div className="rounded-card border border-explore/20 bg-tint-lime px-5 py-3 text-center">
          <p className="text-sm text-ink/70">{labels.kidNote}</p>
        </div>
      </div>
    </div>
  );
}
