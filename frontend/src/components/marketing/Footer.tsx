import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import LocaleSwitcher from "./LocaleSwitcher";
import ParentLetterForm from "./ParentLetterForm";
import logoBadge from "../../../public/landing/idea-pop-logo.png";
import logoText from "../../../public/landing/idea-pop-text.svg";

// Figma: column headings Montserrat Bold 15 in #D1EF5A, links in #F3FFC2; links follow the quiet-link hover
// (2px underline and a small lift that does not move the list).
const colHeading =
  "mb-1 [font-family:var(--font-montserrat)] text-[15px] font-bold uppercase text-[#D1EF5A]";
const colLink =
  "inline-block origin-left rtl:origin-right [font-family:var(--font-montserrat)] text-[15px] font-semibold text-[#F3FFC2] transition-all duration-150 hover:text-white hover:underline hover:decoration-2 hover:underline-offset-4 hover:scale-[1.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D1EF5A] rounded";
// The small print: Figma sets 9.5px, raised to 12px so the Privacy and Terms links stay readable.
const smallPrint =
  "[font-family:var(--font-montserrat)] text-[12px] font-bold text-[#F3FFC2]";

export default async function Footer() {
  const t = await getTranslations("footer");
  // The year in the page's own digits (۲۰۲۶ on Persian pages), without a thousands separator.
  const year = new Intl.NumberFormat(await getLocale(), { useGrouping: false }).format(new Date().getFullYear());

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
      className="bg-[#2E574D] text-white"
      data-testid="site-footer"
    >
      <div className="mx-auto max-w-[1340px] px-4 pt-[76px] pb-12">
        {/* Top row: logo + newsletter */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <Image
                unoptimized
              src={logoBadge}
              alt=""
              width={111}
              height={111}
              className="h-20 w-20"
              aria-hidden="true"
            />
            <div>
              <Image
                unoptimized
                src={logoText}
                alt="Idea Pop"
                width={156}
                height={41}
                className="h-10 w-auto"
              />
              <p className="mt-1 [font-family:var(--font-cherry)] text-[14px] text-[#D1EF5A]">
                {t("tagline")}
              </p>
            </div>
          </div>

          <div className="w-full max-w-[440px]">
            <p className="mb-2 [font-family:var(--font-montserrat)] text-[12px] font-bold text-[#D7F26A]">
              {t("newsletter_heading")}
            </p>
            <ParentLetterForm />
            <p className="mt-2 [font-family:var(--font-montserrat)] text-[12px] font-medium text-[#F3FFC2]">{t("newsletter_note")}</p>
          </div>
        </div>

        {/* Link columns */}
        <div className="mt-10 grid grid-cols-2 gap-8 border-t-[0.5px] border-[#F3FFC2] pt-8 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className={colHeading}>{col.heading}</h3>
              <ul className="space-y-1" role="list">
                {col.links.map(({ label, href }, i) => (
                  <li key={`${href}-${i}`}>
                    {/* prefetch off: several targets are app routes that need
                        the backend; footer prefetches are wasted work anyway */}
                    <Link href={href} prefetch={false} className={colLink}>
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
              className="flex min-h-[34px] items-center justify-center rounded-pill bg-[#2F4E45] px-4 text-center [font-family:var(--font-montserrat)] text-[12px] font-bold text-[#D7F26A]"
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t-[0.5px] border-[#F3FFC2] pt-6 sm:flex-row">
          <div className="flex flex-wrap items-center gap-3">
            <p className={smallPrint}>
              {t("legal", { year })}
            </p>
            <Link href="/legal/privacy" className={`${smallPrint} rounded hover:text-white hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D1EF5A]`}>
              {t("links2.privacy")}
            </Link>
            <Link href="/legal/terms" className={`${smallPrint} rounded hover:text-white hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D1EF5A]`}>
              {t("links.terms")}
            </Link>
            <LocaleSwitcher />
          </div>
          <p className={smallPrint}>{t("madewith")}</p>
        </div>
      </div>
    </footer>
  );
}
