"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import logoBadge from "../../../public/landing/idea-pop-logo.png";

/* Spec: nav links ADLaM Display #18785A (5.4:1 on the white pill); the Start
   free CTA is Montserrat ExtraBold #18785A too — the designer's call, though
   it's ~4.2:1 on the #D1EF5A lime. */
const pillLink =
  "flex flex-col items-center gap-1 whitespace-nowrap rounded-xl px-1.5 lg:px-2 py-0.5 text-[clamp(0.75rem,0.1rem+1.35vw,0.875rem)] [font-family:var(--font-adlam)] font-normal text-[#146047] transition-all duration-150 hover:text-[#0F4C39] hover:bg-ink/5 hover:scale-[1.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore";

/* The page you are on is where you already are, so its label ignores the pointer, and it is set heavier and in the
   darker green: the circle is not the only thing saying which page this is. */
const pillLinkCurrent = pillLink
  .replace(/ hover:\S+/g, "")
  .replace("font-normal", "font-bold")
  .replace("text-[#146047]", "text-[#0F4C39]");

// The 1px stroke is an inset shadow (Figma "inside"), so it doesn't change the button's size.
const ctaBase =
  "inline-flex items-center justify-center whitespace-nowrap rounded-pill bg-[#D1EF5A] px-[1.89rem] py-[0.709rem] text-[clamp(0.886rem,0.68rem+0.855vw,1.181rem)] [font-family:var(--font-montserrat)] font-extrabold text-[#1F4D33] shadow-[inset_0_0_0_1px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] transition-all duration-150 hover:brightness-105 hover:scale-[1.11] hover:shadow-[inset_0_0_0_2px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] active:scale-[0.97] active:bg-[#B8D24F] active:shadow-[inset_0_0_0_2px_#18785A,0_2px_2px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2";

// The designer's nav icons (Figma export: 22×21, 2px round strokes). The language globe is drawn to match them.
function NavIcon({ paths, className = "" }: { paths: readonly string[]; className?: string }) {
  return (
    <svg
      className={`h-[1.2rem] w-[1.257rem] ${className}`}
      fill="none"
      viewBox="0 0 22 21"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/* The pill's outline, read off the designer's frame: a rounded rectangle whose bottom edge sweeps into the notch.
   The sweep is an arc tangent to both the straight edge and the notch circle — her S-curve. Where an item sits too
   close to a rounded end for that arc to fit, the notch and the end simply meet. Every measurement is a fraction of
   the pill's height, so it holds at any width: circle 0.92, the gap around it 0.044, how far its centre sits below
   the edge 0.061, and the sweep 0.567. */
const NOTCH = { diameter: 0.92, gap: 0.044, drop: 0.061, fillet: 0.567, ms: 420, swap: 140, fade: 120 };

function pillOutline(w: number, h: number, cx: number) {
  const r = h / 2;
  const cut = h * (NOTCH.diameter / 2 + NOTCH.gap); // the hole: the circle plus its gap
  const drop = h * NOTCH.drop;
  const want = h * NOTCH.fillet;
  const n = (v: number) => Math.round(v * 100) / 100;

  // The largest sweep that fits in the straight edge left on this side, if any.
  const side = (dir: 1 | -1) => {
    const room = dir > 0 ? w - r - cx : cx - r;
    const fits = room > 0 ? (room * room - cut * cut + drop * drop) / (2 * (cut - drop)) : 0;
    if (fits > 0) {
      const f = Math.min(want, fits);
      const a = Math.sqrt((cut + f) ** 2 - (f + drop) ** 2); // where the sweep leaves the straight edge
      const tx = (f * a) / (cut + f); // and where it meets the notch
      const ty = (f * (f + drop)) / (cut + f);
      return { fillet: f, tangent: cx + dir * a, meet: { x: cx + dir * (a - tx), y: h - f + ty } };
    }
    // No straight edge left: where the notch crosses the rounded end.
    const end = { x: dir > 0 ? w - r : r, y: h - r };
    const dx = cx - end.x;
    const dy = h + drop - end.y;
    const d = Math.hypot(dx, dy);
    const along = (d * d + r * r - cut * cut) / (2 * d);
    const off = Math.sqrt(Math.max(0, r * r - along * along));
    const mx = end.x + (along * dx) / d;
    const my = end.y + (along * dy) / d;
    const a = { x: mx - (off * dy) / d, y: my + (off * dx) / d };
    const b = { x: mx + (off * dy) / d, y: my - (off * dx) / d };
    return { fillet: 0, tangent: 0, meet: dir > 0 ? (a.x > b.x ? a : b) : a.x < b.x ? a : b };
  };

  const right = side(1);
  const left = side(-1);
  const p = [`M ${n(r)} 0`, `H ${n(w - r)}`, `A ${n(r)} ${n(r)} 0 0 1 ${n(w)} ${n(r)}`, `V ${n(h - r)}`];
  if (right.fillet > 0) {
    p.push(
      `A ${n(r)} ${n(r)} 0 0 1 ${n(w - r)} ${n(h)}`,
      `H ${n(right.tangent)}`,
      `A ${n(right.fillet)} ${n(right.fillet)} 0 0 1 ${n(right.meet.x)} ${n(right.meet.y)}`,
    );
  } else {
    p.push(`A ${n(r)} ${n(r)} 0 0 1 ${n(right.meet.x)} ${n(right.meet.y)}`);
  }
  p.push(`A ${n(cut)} ${n(cut)} 0 0 0 ${n(left.meet.x)} ${n(left.meet.y)}`);
  if (left.fillet > 0) {
    p.push(
      `A ${n(left.fillet)} ${n(left.fillet)} 0 0 1 ${n(left.tangent)} ${n(h)}`,
      `H ${n(r)}`,
      `A ${n(r)} ${n(r)} 0 0 1 0 ${n(h - r)}`,
    );
  } else {
    p.push(`A ${n(r)} ${n(r)} 0 0 1 0 ${n(h - r)}`);
  }
  p.push(`V ${n(r)}`, `A ${n(r)} ${n(r)} 0 0 1 ${n(r)} 0`, "Z");
  return p.join(" ");
}

const icons = {
  // open book
  method: [
    "M11 21C9.6442 19.0208 7.42857 17.6667 1.71429 17.6667C1.27322 17.6667 1.00001 17.2474 1.00001 16.7328V1.83334C0.999651 1.72379 1.01788 1.61524 1.05366 1.51395C1.08943 1.41266 1.14203 1.32063 1.20842 1.24316C1.27482 1.1657 1.35371 1.10433 1.44053 1.0626C1.52735 1.02087 1.62039 0.999593 1.71429 1.00001C7.58795 1.03074 10.2857 2.71042 11 6C11.7143 2.71042 14.4121 1.03074 20.2857 1.00001C20.3796 0.999593 20.4727 1.02087 20.5595 1.0626C20.6463 1.10433 20.7252 1.1657 20.7916 1.24316C20.858 1.32063 20.9106 1.41266 20.9463 1.51395C20.9821 1.61524 21.0004 1.72379 21 1.83334V16.8333C21 17.0543 20.9247 17.2663 20.7908 17.4226C20.6568 17.5789 20.4752 17.6667 20.2857 17.6667C14.5714 17.6667 12.3638 19.0109 11 21ZM11 6V21",
  ],
  // card
  pricing: [
    "M19 1H3C1.89543 1 1 2.27919 1 3.85714V18.1429C1 19.7208 1.89543 21 3 21H19C20.1046 21 21 19.7208 21 18.1429V3.85714C21 2.27919 20.1046 1 19 1Z",
    "M1 8.14288H21",
  ],
  // teacher at a board
  teachers: [
    "M1 1H16.5556C18.6511 1 19.6978 1 20.3489 1.586C21 2.172 21 3.114 21 5V11C21 12.886 21 13.828 20.3489 14.414C19.6978 15 18.6511 15 16.5556 15H8.77778M9.88889 5.5H16.5556M1 16V12C1 11.057 1 10.586 1.32556 10.293C1.65111 10 2.17444 10 3.22222 10H5.44444M1 16H5.44444M1 16V21M5.44444 10V16M5.44444 10H12.1111M5.44444 16V21",
    "M5.44444 5.5C5.44444 6.03043 5.21032 6.53914 4.79357 6.91421C4.37682 7.28929 3.81159 7.5 3.22222 7.5C2.63285 7.5 2.06762 7.28929 1.65087 6.91421C1.23413 6.53914 1 6.03043 1 5.5C1 4.96957 1.23413 4.46086 1.65087 4.08579C2.06762 3.71071 2.63285 3.5 3.22222 3.5C3.81159 3.5 4.37682 3.71071 4.79357 4.08579C5.21032 4.46086 5.44444 4.96957 5.44444 5.5Z",
  ],
  // arrow into a door
  signup: [
    "M9.00533 21H18.3333C19.8067 21 21 19.7211 21 18.1433V3.85556C21 2.27889 19.8067 1 18.3333 1H9",
    "M9.66659 14.8889L14.3333 11L9.66659 7.11108M0.999919 10.9955H14.3333",
  ],
  // globe, same size and stroke as the four above
  language: [
    "M20.5 10.5C20.5 15.7467 16.2467 20 11 20C5.75329 20 1.5 15.7467 1.5 10.5C1.5 5.25329 5.75329 1 11 1C16.2467 1 20.5 5.25329 20.5 10.5Z",
    "M1.5 10.5H20.5",
    "M11 1C13.4 3.6 14.6 6.8 14.6 10.5C14.6 14.2 13.4 17.4 11 20C8.6 17.4 7.4 14.2 7.4 10.5C7.4 6.8 8.6 3.6 11 1Z",
  ],
} as const;

// Each language is written in its own script, so a reader finds theirs without reading the other one.
const languages = [
  { code: "en", label: "English" },
  { code: "fa", label: "فارسی" },
] as const;

export default function MarketingNav() {
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLLIElement>(null);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // The desktop language menu closes on a click elsewhere or Escape.
  useEffect(() => {
    if (!langOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!langRef.current?.contains(e.target as Node)) setLangOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [langOpen]);

  function switchLocale(next: "en" | "fa") {
    setLangOpen(false);
    setMenuOpen(false);
    if (next === locale) return;
    // Same route in the other language (pathname is locale-stripped by next-intl).
    startTransition(() => router.replace(pathname, { locale: next }));
  }

  /* "You are here": the pill takes a notch under the current page's item and that item's icon drops into a circle
     sitting in it (the designer's frame). The notch is a mask, and a mask clips its element's children — so it sits
     on the pill's white skin alone, and the circle is a sibling of the pill. Measured: the items differ in width. */
  const pillRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);
  const [notch, setNotch] = useState<{ x: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const pill = pillRef.current;
    const item = activeItemRef.current;
    if (!pill || !item) {
      setNotch(null);
      return;
    }
    const measure = () => {
      const p = pill.getBoundingClientRect();
      const i = item.getBoundingClientRect();
      if (p.width === 0) return; // the pill is hidden on phones
      setNotch({ x: i.left + i.width / 2 - p.left, width: p.width, height: p.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pill);
    observer.observe(item);
    return () => observer.disconnect();
  }, [pathname, locale]);

  /* The circle travels from the old item to the new one. For a beat after the click it is empty — the leaving page's
     icon is back in its own slot by then — and it then takes the new page's icon and carries it the rest of the way. */
  const [swapping, setSwapping] = useState(false);
  // Read once, on the client: it has to be known during render, before any effect has run.
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const settledRef = useRef<string | undefined>(undefined); // the page the circle is settled on
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const drawnRef = useRef<number | null>(null); // where the notch is drawn right now, mid-travel included

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

  // next-intl hands back the path without the locale, so "/method" matches on both languages.
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const current = navLinks.find((link) => isCurrent(link.href));

  const currentHref = current?.href;
  /* The circle is settled on one page at a time. The moment the route changes, that no longer matches — and this is
     read during render, not after an effect, or the new icon would show at full strength for one frame before the
     old one had faded. While they differ the circle still carries the leaving page's icon, fading out. */
  const leavingIcon =
    !reduced && settledRef.current !== undefined && settledRef.current !== currentHref
      ? navLinks.find((link) => link.href === settledRef.current)?.icon
      : undefined;
  const fading = leavingIcon !== undefined || swapping;

  useEffect(() => {
    const from = settledRef.current;
    if (from === currentHref) return;
    if (from === undefined || !currentHref || reduced) {
      settledRef.current = currentHref; // the first page seen, or a reader who asked for less motion: nothing fades
      return;
    }
    setSwapping(true);
    const timer = setTimeout(() => {
      settledRef.current = currentHref;
      setSwapping(false);
    }, NOTCH.swap);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHref]);

  /* The notch and the circle travel together. A CSS transition cannot carry an SVG path, so both are moved frame by
     frame from where the notch is drawn now to where it belongs. The first paint, and a reader who asked for less
     motion, jump straight there. */
  useEffect(() => {
    if (!notch) {
      drawnRef.current = null;
      return;
    }
    const { x: to, width: w, height: h } = notch;
    const size = NOTCH.diameter * h;
    const paint = (x: number) => {
      drawnRef.current = x;
      pathRef.current?.setAttribute("d", pillOutline(w, h, x));
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(calc(-50% + ${x - w / 2}px), ${h + NOTCH.drop * h - size / 2}px)`;
      }
    };
    const from = drawnRef.current;
    if (from === null || Math.abs(to - from) < 0.5 || reduced) {
      paint(to);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / NOTCH.ms);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; // the same shape as the CSS curve elsewhere
      paint(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [notch]);

  return (
    <header className="absolute top-0 z-50 w-full" data-testid="marketing-nav">
      {/* The logo and CTA sit in equal flex-1 sides, so the pill lands on the
          true screen centre — the same centre the hero copy is aligned to.
          justify-between would offset it by half the logo/CTA width gap. On a
          narrow tablet the wider side keeps its content and the pill drifts a
          few px rather than the row overflowing. */}
      <nav
        className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-4 pt-[clamp(1.5rem,0.97rem+2.25vw,3rem)] md:pt-3"
        aria-label="Main navigation"
      >
        <div className="flex flex-1 justify-start">
          {/* md: -top centres the logo on the CTA; the PNG's ~14px transparent margin keeps the circle itself on-screen. */}
          <Link
            href="/"
            aria-label="Idea Pop home"
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore md:relative md:-top-[1.115rem]"
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

        {/* Floating pill (desktop) — positioned directly against the header
            (which is itself the nearest positioned ancestor, being
            absolute), so it's dead-centered on the viewport regardless of
            the logo/CTA width imbalance, and sits near the top of the hero. */}
        <ul
          ref={pillRef}
          className="relative hidden w-max items-center gap-1 rounded-pill px-[clamp(1.5rem,0.35rem+2.4vw,2.5rem)] py-[clamp(0.35rem,0.28rem+0.35vw,0.5rem)] md:flex md:absolute md:left-1/2 md:top-3 md:-translate-x-1/2"
          role="list"
        >
          {/* The pill's white skin, on its own layer behind the links: an outline, so the stroke can follow the notch
              the way the designer drew it. Before the notch has been measured — and on a page with no current item —
              it is a plain rounded box, which is also what the server renders. */}
          <li aria-hidden="true" data-nav-notch className="pointer-events-none absolute inset-0 -z-10">
            {notch ? (
              <svg
                width={notch.width}
                height={notch.height}
                viewBox={`0 0 ${notch.width} ${notch.height}`}
                className="block overflow-visible [filter:drop-shadow(0_4px_4px_rgba(0,0,0,0.25))]"
              >
                <path
                  ref={pathRef}
                  d={pillOutline(notch.width, notch.height, drawnRef.current ?? notch.x)}
                  fill="#fff"
                  stroke="#D1EF5A"
                  strokeWidth={1}
                />
              </svg>
            ) : (
              <span className="block h-full w-full rounded-pill bg-white shadow-[inset_0_0_0_1px_#D1EF5A,0_4px_4px_rgba(0,0,0,0.25)]" />
            )}
          </li>
          {navLinks.map(({ label, href, icon }) => {
            const active = isCurrent(href);
            return (
              <li key={href} ref={active ? activeItemRef : undefined}>
                <Link
                  href={href}
                  className={active ? pillLinkCurrent : pillLink}
                  aria-current={active ? "page" : undefined}
                >
                  <span>{label}</span>
                  {/* On the current page the icon shows in the circle below instead; the space it left keeps the pill's size.
                      For the beat while the circle is empty, every slot shows its own icon again. */}
                  <NavIcon paths={icon} className={active && notch && !fading ? "invisible" : ""} />
                </Link>
              </li>
            );
          })}
          {/* Language: a setting rather than a page, so it sits after a thin divider and opens a two-line menu. */}
          <li aria-hidden="true" className="mx-1 w-px self-stretch bg-[#D1EF5A]" />
          <li ref={langRef} className="relative">
            <button
              type="button"
              className={pillLink}
              aria-expanded={langOpen}
              aria-controls="language-menu"
              onClick={() => setLangOpen((v) => !v)}
            >
              <span>{t("language")}</span>
              <NavIcon paths={icons.language} />
            </button>
            {langOpen && (
              <ul
                id="language-menu"
                role="list"
                className="absolute left-1/2 top-full mt-3 min-w-[9.5rem] -translate-x-1/2 rounded-2xl bg-white p-1.5 shadow-[inset_0_0_0_1px_#D1EF5A,0_8px_16px_rgba(0,0,0,0.2)]"
              >
                {languages.map(({ code, label }) => (
                  <li key={code}>
                    <button
                      type="button"
                      lang={code}
                      aria-current={locale === code ? "true" : undefined}
                      onClick={() => switchLocale(code)}
                      className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3 text-start text-[15px] text-[#146047] hover:bg-[#F4FADD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore ${code === "fa" ? "[font-family:var(--font-persian)]" : "[font-family:var(--font-adlam)]"} ${locale === code ? "bg-[#EEFFA9]" : ""}`}
                    >
                      <span>{label}</span>
                      {locale === code && <span aria-hidden="true">✓</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>

        {/* The circle that sits in the notch, carrying the current page's icon. It repeats what the pill already
            says, so it's hidden from screen readers — aria-current on the link is the real marker. */}
        {current && notch && (
          <span
            aria-hidden="true"
            ref={dotRef}
            className="pointer-events-none absolute left-1/2 top-3 hidden items-center justify-center rounded-full bg-white text-[#146047] shadow-[inset_0_0_0_1px_#D1EF5A,0_6px_10px_rgba(0,0,0,0.10)] md:flex"
            data-nav-dot
            style={{
              width: NOTCH.diameter * notch.height,
              height: NOTCH.diameter * notch.height,
              transform: `translate(calc(-50% + ${(drawnRef.current ?? notch.x) - notch.width / 2}px), ${notch.height + NOTCH.drop * notch.height - (NOTCH.diameter * notch.height) / 2}px)`,
            }}
          >
            {/* The leaving page's icon fades out, then the new one fades in — the circle is never empty-looking for
                longer than the fade, and no icon slides across the pill. */}
            <NavIcon
              paths={leavingIcon ?? current.icon}
              className={`transition-opacity duration-[120ms] ${fading ? "opacity-0" : "opacity-100"}`}
            />
          </span>
        )}

        {/* Right side: CTA on desktop, hamburger on mobile. md: the nav's pt-3 and this mt centre the CTA on the capsule (top-3). */}
        <div className="flex flex-1 items-center justify-end md:mt-[0.41rem] md:self-start">
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
            <li className="mt-1 border-t border-[#D1EF5A] px-3 pt-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#146047]">
                <NavIcon paths={icons.language} />
                {t("language")}
              </p>
              <div className="mt-2 flex gap-2" role="group" aria-label={t("language")}>
                {languages.map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    lang={code}
                    aria-pressed={locale === code}
                    onClick={() => switchLocale(code)}
                    className={`min-h-[44px] flex-1 rounded-pill px-4 text-[15px] font-semibold text-[#146047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore ${code === "fa" ? "[font-family:var(--font-persian)]" : "[font-family:var(--font-montserrat)]"} ${locale === code ? "bg-[#EEFFA9] shadow-[inset_0_0_0_1px_#18785A]" : "bg-white shadow-[inset_0_0_0_1px_#D1EF5A]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </li>
            <li className="pt-1">
              <Link
                href="/sign-up"
                className="block w-full rounded-pill bg-[#D1EF5A] px-[2.1rem] py-[0.7875rem] text-center text-[clamp(0.984rem,0.756rem+0.95vw,1.3125rem)] [font-family:var(--font-montserrat)] font-extrabold text-[#1F4D33] shadow-[inset_0_0_0_1px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] transition-all duration-150 hover:brightness-105 hover:scale-[1.03] hover:shadow-[inset_0_0_0_2px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] active:scale-[0.97] active:bg-[#B8D24F] active:shadow-[inset_0_0_0_2px_#18785A,0_2px_2px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2"
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
