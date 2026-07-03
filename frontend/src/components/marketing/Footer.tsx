import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import LocaleSwitcher from "./LocaleSwitcher";
import ParentLetterForm from "./ParentLetterForm";
import logoBadge from "../../../public/landing/idea-pop-logo.svg";
import logoText from "../../../public/landing/idea-pop-text.svg";

const colHeading =
  "mb-3 text-xs font-bold uppercase tracking-widest text-[#CDEB5A]";
const colLink =
  "text-sm text-white/75 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDEB5A] rounded";

export default async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  const productLinks = [
    { label: t("links2.exploring"), href: "/explore" as const },
    { label: t("links2.library_studios"), href: "/library" as const },
    { label: t("links2.challenges"), href: "/challenges" as const },
    { label: t("links2.pricing_gifts"), href: "/pricing" as const },
  ];

  const methodLinks = [
    { label: t("links2.how_works"), href: "/method" as const },
    { label: t("links2.path3"), href: "/method" as const },
    { label: t("links2.tools12"), href: "/method" as const },
    { label: t("links2.sample_challenge"), href: "/challenges" as const },
    { label: t("links2.teachers_free"), href: "/for-teachers" as const },
  ];

  const safetyLinks = [
    { label: t("links2.safety_promise"), href: "/legal/privacy-kids" as const },
    { label: t("links2.privacy"), href: "/legal/privacy" as const },
    { label: t("links2.parent_dashboard"), href: "/sign-up" as const },
    { label: t("links2.weekly_report"), href: "/sign-up" as const },
    { label: t("links2.contact"), href: "/legal/report" as const },
  ];

  const companyLinks = [
    { label: t("links2.about"), href: "/method" as const },
    { label: t("links2.our_experts"), href: "/method" as const },
    { label: t("links2.blog"), href: "/for-teachers" as const },
    { label: t("links2.careers"), href: "/method" as const },
  ];

  const columns = [
    { heading: t("product"), links: productLinks },
    { heading: t("method_col"), links: methodLinks },
    { heading: t("safety"), links: safetyLinks },
    { heading: t("company"), links: companyLinks },
  ];

  const trustBadges = [
    `🔒 ${t("trust_coppa")}`,
    `🚫 ${t("trust_no_ads")}`,
    `✅ ${t("trust_human")}`,
    `🤖 ${t("trust_ai")}`,
  ];

  return (
    <footer
      className="bg-[#2E5F4B] text-white"
      data-testid="site-footer"
    >
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Top row: logo + newsletter */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={logoBadge}
              alt=""
              width={111}
              height={111}
              className="h-14 w-14"
              aria-hidden="true"
            />
            <div>
              <Image
                src={logoText}
                alt="Idea Pop"
                width={156}
                height={41}
                className="h-8 w-auto"
              />
              <p className="mt-1 font-display text-xs font-bold text-[#CDEB5A]">
                {t("tagline")}
              </p>
            </div>
          </div>

          <div className="max-w-sm">
            <p className="mb-2 text-sm font-bold text-white">
              {t("newsletter_heading")}
            </p>
            <ParentLetterForm />
            <p className="mt-2 text-xs text-white/75">{t("newsletter_note")}</p>
          </div>
        </div>

        {/* Link columns */}
        <div className="mt-10 grid grid-cols-2 gap-8 border-t border-white/15 pt-8 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className={colHeading}>{col.heading}</h3>
              <ul className="space-y-2" role="list">
                {col.links.map(({ label, href }, i) => (
                  <li key={`${href}-${i}`}>
                    <Link href={href} className={colLink}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div
          className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Trust badges"
          data-testid="trust-badges"
        >
          {trustBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-pill bg-white/10 px-4 py-2 text-center text-xs font-semibold text-white/90"
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/15 pt-6 sm:flex-row">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-white/75">
              {t("legal", { year: String(year) })}
            </p>
            <Link href="/legal/privacy" className="text-xs text-white/75 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDEB5A]">
              {t("links2.privacy")}
            </Link>
            <Link href="/legal/terms" className="text-xs text-white/75 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDEB5A]">
              {t("links.terms")}
            </Link>
            <LocaleSwitcher />
          </div>
          <p className="text-xs text-white/75">{t("madewith")}</p>
        </div>
      </div>
    </footer>
  );
}
