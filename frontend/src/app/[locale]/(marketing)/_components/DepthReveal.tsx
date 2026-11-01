"use client";

import { useEffect } from "react";

/**
 * The layered title on the Animals and Train pictures (susan, 2026-11-01, after the Arpeggio reference): the title is
 * shown clearly, holds, then moves back, and the girl / the boy comes in front of it. It plays once, by itself, when the
 * picture is well on screen; scrolling only starts it, it is never scrubbed. The server HTML is the finished composition
 * (title behind the subject), so the page reads the same without JavaScript, with reduced motion and on phones, where
 * the title stays in the band above the picture (motion.css only animates from 768px).
 */
export default function DepthReveal() {
  useEffect(() => {
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(min-width: 768px)").matches
    )
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          el.dataset.depthState = "play";
        }
      },
      { threshold: 0.45 },
    );
    const boxes = [...document.querySelectorAll<HTMLElement>("[data-depth]")];
    for (const el of boxes) {
      el.dataset.depthState = "ready";
      observer.observe(el);
    }
    return () => {
      observer.disconnect();
      for (const el of boxes) delete el.dataset.depthState;
    };
  }, []);
  return null;
}
