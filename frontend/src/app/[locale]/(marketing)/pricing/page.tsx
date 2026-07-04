import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import PricingPlans from "../_components/PricingPlans";
import scientistGirl from "../../../../../public/landing/start-free-girl.png";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Idea Pop",
  description:
    "Start free, upgrade when your family loves it. Simple, honest pricing for Idea Pop.",
};

const DEEP = "#2E5F4B";

/** Table cells: green for included/unlimited, red for excluded, ink otherwise. */
const GREEN = new Set(["all", "full", "✓", "همه", "کامل"]);
function cellClass(v: string) {
  if (v === "—") return "text-[#C0392B]";
  if (GREEN.has(v) || v.startsWith("∞")) return "text-[#2E7D32]";
  return "text-ink";
}

type Row = { feature: string; free: string; plus: string; family: string };
type Faq = { q: string; a: string };

type Props = { params: { locale: string } };

export default async function PricingPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "pricing" });
  const tm = await getTranslations({ locale, namespace: "marketing.pricing_teaser" });

  const rows = t.raw("rows") as Row[];
  const faq = t.raw("faq") as Faq[];

  return (
    <div className="bg-[#F3FFC2]">
      {/* 1. Hero + plans */}
      <section aria-label="Pricing plans" className="px-4 pt-28 pb-16">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-10 text-center font-display text-4xl font-bold text-ink md:text-5xl">
            {t("heading")}
          </h1>
          <PricingPlans
            labels={{
              monthly: tm("monthly"),
              annual: tm("annual"),
              freeName: tm("free_name"),
              freePrice: tm("free_price"),
              freeFeatures: [
                tm("free_f1"),
                tm("free_f2"),
                tm("free_f3"),
                tm("free_f4"),
                tm("free_f5"),
              ],
              ctaFree: tm("cta_free"),
              plusName: tm("plus_name"),
              plusPrice: tm("plus_price"),
              plusBillingAnnual: tm("plus_billing_annual"),
              plusBillingMonthly: tm("plus_billing_monthly"),
              plusIntro: tm("plus_intro"),
              plusFeatures: [
                tm("plus_f1"),
                tm("plus_f2"),
                tm("plus_f3"),
                tm("plus_f4"),
              ],
              ctaPlus: tm("cta_plus"),
              badgePopular: tm("badge_popular"),
              familyName: tm("family_name"),
              familyPrice: tm("family_price"),
              familyBillingAnnual: tm("family_billing_annual"),
              familyBillingMonthly: tm("family_billing_monthly"),
              familyIntro: tm("family_intro"),
              familyFeatures: [
                tm("family_f1"),
                tm("family_f2"),
                tm("family_f3"),
              ],
              ctaFamily: tm("cta_family"),
              badgeValue: tm("badge_value"),
            }}
          />
        </div>
      </section>

      {/* 2. Compare everything */}
      <section aria-label="Compare plans" className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink md:text-3xl">
            {t("compare_heading")}
          </h2>
          <div className="overflow-x-auto rounded-card">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#EDF6C5]">
                  <th className="px-5 py-3 font-body text-sm font-bold text-ink">
                    {t("col_feature")}
                  </th>
                  <th className="px-4 py-3 text-center font-body text-sm font-bold text-ink">
                    {t("col_free")}
                  </th>
                  <th className="px-4 py-3 text-center font-body text-sm font-bold text-ink">
                    {t("col_plus")}
                  </th>
                  <th className="px-4 py-3 text-center font-body text-sm font-bold text-ink">
                    {t("col_family")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.feature} className={i % 2 === 0 ? "bg-white" : "bg-[#FBFDF0]"}>
                    <td className="px-5 py-3 font-body text-sm font-bold text-ink">
                      {r.feature}
                    </td>
                    {(["free", "plus", "family"] as const).map((col) => (
                      <td
                        key={col}
                        className={`px-4 py-3 text-center font-body text-sm font-bold ${cellClass(r[col])}`}
                      >
                        {r[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. FAQ */}
      <section aria-label="Billing questions" className="px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <ul className="space-y-3" role="list">
            {faq.map((item) => (
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

      {/* 4. CTA band */}
      <section aria-label="Every plan starts free" className="px-3 pb-0 pt-8 md:px-6 md:pb-6">
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
              <div className="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-pill bg-[#CDEB5A] px-8 py-3 font-display text-lg font-bold text-[#1F4D33] shadow-sm transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDEB5A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E5F4B]"
                >
                  {t("cta_start")}
                </Link>
                <Link
                  href="/challenges"
                  prefetch={false}
                  className="inline-flex items-center justify-center rounded-pill border-2 border-[#CDEB5A] px-8 py-3 font-display text-lg font-bold text-[#CDEB5A] transition-all hover:bg-[#CDEB5A] hover:text-[#1F4D33] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDEB5A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E5F4B]"
                >
                  {t("cta_watch")}
                </Link>
              </div>
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
    </div>
  );
}
