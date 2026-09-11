"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import logoBadge from "../../../public/landing/idea-pop-logo.png";

/* Spec: nav links ADLaM Display #18785A (5.4:1 on the white pill); the Start
   free CTA is Montserrat ExtraBold at the fluid button size — it keeps the
   darker #1F4D33 because the spec's #18785A only hits 4.04:1 on lime.
   Every size in the bar is the spec value × 1.05: the designer wanted the
   whole nav a touch larger than the hero spec table's baseline. */
const pillLink =
  "flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-[clamp(0.919rem,0.83rem+0.53vw,1.05rem)] [font-family:var(--font-adlam)] font-normal text-[#18785A] transition-colors hover:text-[#194D3D] hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore";

const ctaBase =
  "inline-flex items-center justify-center whitespace-nowrap rounded-pill bg-[#CDEB5A] px-[2.1rem] py-[0.7875rem] text-[clamp(0.984rem,0.756rem+0.95vw,1.3125rem)] [font-family:var(--font-montserrat)] font-extrabold text-[#1F4D33] shadow-sm transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2";

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-[1.575rem] w-[1.575rem]"
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
  // open book
  method:
    "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  // simple card: outline + one divider + a short dash
  pricing:
    "M2.25 9h19.5M5.25 13.5h4.5M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  // flag on a pole with list lines (per the Figma)
  teachers: "M5.25 3v18M5.25 4.5h13.5v7.5H5.25M8.25 7h6M8.25 9.25h4",
  // login: arrow pointing INTO the bracket (was pointing out, like a logout)
  signup:
    "M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15m-3 0l3-3m0 0l-3-3m3 3H2.25",
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
    <header className="absolute top-0 z-50 w-full" data-testid="marketing-nav">
      {/* The logo and CTA sit in equal flex-1 sides, so the pill lands on the
          true screen centre — the same centre the hero copy is aligned to.
          justify-between would offset it by half the logo/CTA width gap. On a
          narrow tablet the wider side keeps its content and the pill drifts a
          few px rather than the row overflowing. */}
      <nav
        className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-4 pt-[clamp(1.5rem,0.97rem+2.25vw,3rem)]"
        aria-label="Main navigation"
      >
        <div className="flex flex-1 justify-start">
          <Link
            href="/"
            aria-label="Idea Pop home"
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
          >
            <Image
              unoptimized
              src={logoBadge}
              alt="Idea Pop"
              width={160}
              height={160}
              className="h-[4.852rem] w-[4.852rem] md:h-[6.238rem] md:w-[6.238rem]"
              priority
            />
          </Link>
        </div>

        {/* Floating pill (desktop) */}
        <ul
          className="hidden items-center gap-1 rounded-pill bg-white px-[clamp(1.05rem,0.84rem+1.05vw,1.8375rem)] py-[clamp(0.525rem,0.42rem+0.53vw,0.7875rem)] shadow-md md:flex"
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

        {/* Right side: CTA on desktop, hamburger on mobile. */}
        <div className="flex flex-1 items-center justify-end">
          <div className="hidden md:block">
            <Link href="/sign-up" className={ctaBase}>
              {t("start_free")}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="rounded-pill bg-white p-[0.656rem] text-ink/70 shadow-md hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <svg
                className="h-[1.3125rem] w-[1.3125rem]"
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
                className="h-[1.3125rem] w-[1.3125rem]"
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
        </div>
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
                className="block w-full rounded-pill bg-[#CDEB5A] px-[2.1rem] py-[0.7875rem] text-center text-[clamp(0.984rem,0.756rem+0.95vw,1.3125rem)] [font-family:var(--font-montserrat)] font-extrabold text-[#1F4D33] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2"
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
