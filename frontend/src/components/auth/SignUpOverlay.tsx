"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import PersonaCards from "./PersonaCards";

/* "Tell us who you are" as an overlay: every link to /sign-up anywhere on the site opens it in place instead of
   loading a page, so a visitor never loses where they were. The /sign-up page still exists and shows the same panel,
   for a direct visit, a new tab (ctrl-click) or a browser without JavaScript.
   It behaves like a dialog: Escape and the backdrop close it, focus moves in and cycles inside it, the page behind
   cannot scroll, and focus returns to whatever opened it. */
export default function SignUpOverlay() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const t = useTranslations("auth.persona_select");
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) opener.focus();
  }, []);

  // Catch clicks on any link to the persona step.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self")) return;
      let url: URL;
      try { url = new URL(link.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      const strip = (p: string) => p.replace(/^\/[a-z]{2}(?=\/|$)/, "").replace(/\/$/, "");
      if (strip(url.pathname) !== "/sign-up") return;
      // On the persona page itself the overlay would just repeat what is already on screen.
      if (strip(window.location.pathname) === "/sign-up") return;
      // Caught while the click travels down, before the router's own handler runs, and stopped there so nothing
      // navigates: the overlay is the whole response to the click.
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openerRef.current = link;
      setOpen(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The persona step has its own page; there the overlay would be a copy of what is already on screen.
  useEffect(() => { if (pathname === "/sign-up") setOpen(false); }, [pathname]);

  // While it is open: Escape closes, Tab stays inside, the page behind holds still, and focus starts in the panel.
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')].filter((el) => !el.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    // Focus moves to the panel itself, so a reader announces the dialog without a ring landing on the close button.
    const frame = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
    };
  }, [open, close]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/45 p-4 py-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-up-overlay-heading"
        data-testid="sign-up-overlay"
        tabIndex={-1}
        className="relative w-full max-w-[930px] rounded-[32px] bg-[#F3FFC2] px-4 py-10 shadow-[0_18px_50px_rgba(0,0,0,0.25)] outline-none md:px-10"
      >
        <SignUpPanel onClose={close} closeLabel={t("close")} />
      </div>
    </div>,
    document.body,
  );
}

/* The panel itself: the designer's heading pair, the three cards, and the way back for people who already have an
   account. The /sign-up page renders the same thing without the backdrop. */
export function SignUpPanel({ onClose, closeLabel, onChosen }: { onClose?: () => void; closeLabel?: string; onChosen?: () => void }) {
  const t = useTranslations("auth.persona_select");
  const heading = "[font-family:var(--font-cherry)] font-normal text-[clamp(1.5rem,1.1rem+1.7vw,2.5rem)] leading-[1.28] text-[#194D3D] text-center";

  return (
    <>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-[#194D3D] transition-colors hover:bg-[#194D3D]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18785A] md:end-6 md:top-6"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <h1 id="sign-up-overlay-heading" className={heading}>
        {t("heading")}
      </h1>
      <p className={`${heading} mt-1 mb-9`}>{t("subhead")}</p>
      <PersonaCards onChosen={onChosen} />
      <p className="mt-8 text-center [font-family:var(--font-adlam)] font-normal text-[15px] text-[#4F4F4F]">
        {t("already")}{" "}
        <Link href="/login" className="font-bold text-[#194D3D] underline underline-offset-2 hover:text-[#0F4C39]">
          {t("log_in")}
        </Link>
      </p>
    </>
  );
}
