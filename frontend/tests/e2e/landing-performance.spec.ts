import { expect, test, type Page } from "@playwright/test";

/* Landing performance guard (2026-11-07). The deployed landing once scrolled at under one frame a second: an oversized
   white layer in the hero and a bird that redrew itself every frame. CI machines have no graphics card, which is the
   worst case for both, so these budgets catch that kind of regression long before it reaches people:
   - nothing inside the hero is far larger than the artwork (the 8000px veil would fail this),
   - scrolling the whole page keeps a usable frame rate,
   - the page's own scripts stay light while scrolling (a per-frame redraw loop would fail this). */

const MIN_FPS = 8;
const MAX_SCRIPT_MS = 2500;
const MAX_HERO_ELEMENT_PX = 3000;

async function scrollThrough(page: Page, ms: number) {
  return page.evaluate(async (duration) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    let frames = 0;
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const step = (t: number) => {
        frames++;
        const e = t - t0;
        if (e < duration) {
          scrollTo(0, (max * e) / duration);
          requestAnimationFrame(step);
        } else done();
      };
      requestAnimationFrame(step);
    });
    return frames / (duration / 1000);
  }, ms);
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test(`landing stays light to scroll on ${name}`, async ({ browser, browserName }) => {
    test.skip(browserName !== "chromium", "frame and script timing come from Chromium's DevTools metrics");
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport, isMobile: name === "phone" });
    const page = await context.newPage();
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hero-viewport[data-state]", { timeout: 60_000 });
    await page.waitForTimeout(4000);

    const widest = await page.evaluate(() =>
      Math.max(...[...document.querySelectorAll<HTMLElement>(".hero-viewport *")].map((el) => el.offsetWidth || 0)),
    );
    expect(widest, "an element inside the hero is much larger than the artwork").toBeLessThanOrEqual(MAX_HERO_ELEMENT_PX);

    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const metric = async (key: string) =>
      (await cdp.send("Performance.getMetrics")).metrics.find((m) => m.name === key)?.value ?? 0;
    const script0 = await metric("ScriptDuration");
    const fps = await scrollThrough(page, 8000);
    const scriptMs = ((await metric("ScriptDuration")) - script0) * 1000;

    expect(fps, `scrolling ran at ${fps.toFixed(1)} frames a second`).toBeGreaterThanOrEqual(MIN_FPS);
    expect(scriptMs, `page scripts took ${scriptMs.toFixed(0)} ms while scrolling`).toBeLessThanOrEqual(MAX_SCRIPT_MS);
    await context.close();
  });
}
