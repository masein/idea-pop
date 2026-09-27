import { test, expect } from '@playwright/test';

test.describe('Marketing landing page', () => {
  test('visitor lands on homepage and sees hero', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(/Idea Pop/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ask nature');
  });

  test('Start free CTA opens the persona overlay over the page', async ({ page }) => {
    await page.goto('/en');
    // The redesigned hero CTAs are "Start Exploring" / "Start a simple
    // challenge"; the "Start free" sign-up entry point lives in the nav. It now
    // opens the persona step over the page instead of loading /sign-up.
    const nav = page.getByTestId('marketing-nav');
    const startLink = nav.getByRole('link', { name: /start free/i }).first();
    await expect(startLink).toBeVisible();
    await startLink.click();
    const overlay = page.getByTestId('sign-up-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByRole('button', { name: /kid/i })).toBeVisible();
    expect(page.url()).not.toContain('/sign-up');
    // Escape closes it and leaves the visitor where they were.
    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('the persona step still has its own page', async ({ page }) => {
    await page.goto('/en/sign-up');
    await expect(page.getByTestId('persona-select')).toBeVisible();
    await expect(page.getByTestId('sign-up-overlay')).toBeHidden();
  });

  test('nav is visible and has correct links', async ({ page }) => {
    await page.goto('/en');
    const nav = page.getByTestId('marketing-nav');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: /the method/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /pricing/i })).toBeVisible();
  });

  test('footer shows trust badges', async ({ page }) => {
    await page.goto('/en');
    const footer = page.getByTestId('site-footer');
    await expect(footer).toBeVisible();
    await expect(footer.getByText('COPPA-friendly')).toBeVisible();
    await expect(footer.getByText('No ads')).toBeVisible();
  });

  test('FA locale loads with RTL direction', async ({ page }) => {
    await page.goto('/fa');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'fa');
  });
});
