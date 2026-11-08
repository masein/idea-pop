import { expect, test } from "@playwright/test";

/* Flying bird guard (2026-11-08). After the lag fix, computers without graphics acceleration got the bird's light wing
   mode, and its wing pictures stayed visible while the bird itself was hidden, so a giant wing covered the hero during
   its entrance. CI has no graphics card, so it takes that same path: at every moment we sample, while the bird is hidden
   none of its parts may be visible, and while it is shown it must be small (never its raw 1659 px frame). */

test("the flying bird never shows its parts while hidden, nor at full size", async ({ browser, browserName }) => {
  test.skip(browserName !== "chromium", "one engine is enough for this guard");
  test.setTimeout(90_000);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 768 });
    const page = await context.newPage();
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero-viewport[data-state]", { timeout: 60_000 });
    for (let i = 0; i < 16; i++) {
      const problem = await page.evaluate(() => {
        const host = document.querySelector<HTMLElement>(".flying-bird");
        if (!host) return null;
        const style = getComputedStyle(host);
        const hidden = style.visibility === "hidden" || Number(style.opacity) < 0.001;
        const parts = [...host.querySelectorAll<HTMLElement>("img, canvas")];
        if (hidden) {
          const shown = parts.filter((p) => {
            const s = getComputedStyle(p);
            return s.visibility === "visible" && s.display !== "none" && Number(s.opacity) > 0;
          });
          return shown.length ? `bird hidden but ${shown.length} of its parts are visible` : null;
        }
        const widest = Math.max(...parts.map((p) => p.getBoundingClientRect().width));
        return widest > innerWidth * 1.2 ? `bird shown ${Math.round(widest)} px wide on a ${innerWidth} px screen` : null;
      });
      expect(problem, `at ${viewport.width} px, sample ${i}`).toBeNull();
      await page.waitForTimeout(500);
      if (i === 10) await page.evaluate(() => scrollTo(0, innerHeight * 2));
    }
    await context.close();
  }
});
