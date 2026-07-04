"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import logoBadge from "../../../public/landing/idea-pop-logo.png";

const pillLink =
  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-xs font-body font-bold text-ink/80 transition-colors hover:text-ink hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore";

const ctaBase =
  "inline-flex items-center justify-center rounded-pill bg-[#CDEB5A] px-6 py-2.5 text-base font-display font-bold text-[#1F4D33] shadow-sm transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2";

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const icons = {
  method:
    "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  pricing:
    "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  teachers:
    "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342",
  signup:
    "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9",
};

export default function MarketingNav() {
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: t("method"), href: "/method" as const, icon: icons.method },
    { label: t("pricing"), href: "/pricing" as const, icon: icons.pricing },
    {
      label: t("for_teachers"),
      href: "/for-teachers" as const,
      icon: icons.teachers,
    },
    { label: t("sign_up"), href: "/sign-up" as const, icon: icons.signup },
  ];

  return (
    <header
      className="absolute top-0 z-50 w-full"
      data-testid="marketing-nav"
    >
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          aria-label="Idea Pop home"
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
        >
          <Image
                unoptimized
            src={logoBadge}
            alt="Idea Pop"
            width={111}
            height={111}
            className="h-12 w-12 md:h-14 md:w-14"
            priority
          />
        </Link>

        {/* Floating pill (desktop) */}
        <ul
          className="hidden items-center gap-1 rounded-pill bg-white px-4 py-1.5 shadow-md md:flex"
          role="list"
        >
          {navLinks.map(({ label, href, icon }) => (
            <li key={href}>
              <Link href={href} className={pillLink}>
                <span>{label}</span>
                <NavIcon d={icon} />
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden shrink-0 md:block">
          <Link href="/sign-up" className={ctaBase}>
            {t("start_free")}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-pill bg-white p-2.5 text-ink/70 shadow-md hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore md:hidden"
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
          className="mx-4 rounded-card bg-white px-4 pb-4 pt-2 shadow-lg md:hidden"
        >
          <ul className="space-y-1" role="list">
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
            <li className="pt-1">
              <Link
                href="/sign-up"
                className="block w-full rounded-pill bg-[#CDEB5A] px-6 py-2.5 text-center text-base font-display font-bold text-[#1F4D33] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2"
                onClick={() => setMenuOpen(false)}
              >
                {t("start_free")}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
