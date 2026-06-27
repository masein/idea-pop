import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Logo from "@/components/Logo";
import LocaleSwitcher from "./LocaleSwitcher";
import ParentLetterForm from "./ParentLetterForm";

export default async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  const productLinks = [
    { label: t("links.method"), href: "/method" as const },
    { label: t("links.challenges"), href: "/challenges" as const },
    { label: t("links.library"), href: "/library" as const },
    { label: t("links.explore"), href: "/explore" as const },
  ];

  const safetyLinks = [
    { label: t("links.privacy"), href: "/legal/privacy" as const },
    { label: t("links.privacy_kids"), href: "/legal/privacy-kids" as const },
    { label: t("links.coppa"), href: "/legal/coppa" as const },
    { label: t("links.report"), href: "/legal/report" as const },
    { label: t("links.terms"), href: "/legal/terms" as const },
  ];

  return (
    <footer
      className="border-t border-ink/10 bg-sidebar"
      data-testid="site-footer"
    >
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo size="sm" showWordmark />
            <div
              className="flex flex-wrap gap-2"
              aria-label="Trust badges"
              data-testid="trust-badges"
            >
              {[t("trust_coppa"), t("trust_no_ads"), t("trust_ai")].map(
                (badge) => (
                  <span
                    key={badge}
                    className="rounded-pill border border-explore/30 bg-tint-lime px-2.5 py-0.5 text-xs font-semibold text-explore"
                  >
                    {badge}
                  </span>
                )
              )}
            </div>
            <LocaleSwitcher />
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/60">
              {t("product")}
            </h3>
            <ul className="space-y-2" role="list">
              {productLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-ink/60 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore rounded"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/60">
              {t("safety")}
            </h3>
            <ul className="space-y-2" role="list">
              {safetyLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-ink/60 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore rounded"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/60">
              {t("stay_close")}
            </h3>
            <ParentLetterForm />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-ink/10 pt-6 sm:flex-row">
          <p className="text-xs text-ink/60">
            {t("legal").replace("{year}", String(year))}
          </p>
          <div className="flex flex-wrap gap-4">
            {safetyLinks.slice(0, 2).map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-ink/60 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore rounded"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/legal/terms"
              className="text-xs text-ink/60 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore rounded"
            >
              {t("links.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
