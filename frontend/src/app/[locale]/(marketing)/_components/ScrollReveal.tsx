"use client";

import { useEffect } from "react";

// Longest entrance in motion.css (the 1700ms grow), plus a little slack.
const ENTRANCE_MS = 1800;

/**
 * Plays the landing page's "first time on screen" entrances (motion.css). The server HTML shows every block in place,
 * so the page reads fine without JavaScript or with reduced motion. Once this runs, blocks marked data-reveal that are
 * still below the fold are hidden and then brought in as they scroll into view, each once.
 */
export default function ScrollReveal() {
  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers: number[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          el.dataset.revealState = "shown";
          // Once it has played, hand the element back to its normal styles.
          const delay = parseFloat(getComputedStyle(el).getPropertyValue("--motion-delay")) || 0;
          timers.push(window.setTimeout(() => el.removeAttribute("data-reveal-state"), delay + ENTRANCE_MS));
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );

    const fold = window.innerHeight * 0.92;
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().top < fold) return;
      el.dataset.revealState = "hidden";
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return null;
}
