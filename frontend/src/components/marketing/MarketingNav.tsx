"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Logo from "@/components/Logo";

const linkBase =
  "text-sm font-semibold text-ink/70 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 rounded";

const ctaBase =
  "inline-flex items-center justify-center rounded-pill bg-explore px-4 py-1.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2";

export default function MarketingNav() {
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: t("method"), href: "/method" as const },
    { label: t("pricing"), href: "/pricing" as const },
    { label: t("for_teachers"), href: "/for-teachers" as const },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-ink/10 bg-surface/95 backdrop-blur-sm"
      data-testid="marketing-nav"
    >
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"
        aria-label="Main navigation"
      >
        <Link href="/" aria-label="Idea Pop home">
          <Logo size="sm" showWordmark />
        </Link>

        <ul className="hidden items-center gap-6 md:flex" role="list">
          {navLinks.map(({ label, href }) => (
            <li key={href}>
              <Link href={href} className={linkBase}>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/sign-up" className={linkBase}>
            {t("sign_up")}
          </Link>
          <Link href="/sign-up" className={ctaBase}>
            Start
          </Link>
        </div>

        <button
          className="rounded p-2 text-ink/70 hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </nav>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-ink/10 bg-surface px-4 pb-4 md:hidden"
        >
          <ul className="mt-2 space-y-1" role="list">
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block rounded px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/sign-up"
                className="block rounded px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
                onClick={() => setMenuOpen(false)}
              >
                {t("sign_up")}
              </Link>
            </li>
            <li className="pt-1">
              <Link
                href="/sign-up"
                className="block w-full text-center rounded-pill bg-explore px-6 py-2.5 text-base font-semibold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2"
                onClick={() => setMenuOpen(false)}
              >
                Start
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
