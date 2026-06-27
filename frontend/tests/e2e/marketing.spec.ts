import { test, expect } from '@playwright/test';

test.describe('Marketing landing page', () => {
  test('visitor lands on homepage and sees hero', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(/Idea Pop/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ask nature');
  });

  test('Start free CTA navigates to sign-up', async ({ page }) => {
    await page.goto('/en');
    // Find the first "Start free" link in the hero section
    const heroSection = page.getByRole('region', { name: /hero/i });
    const startLink = heroSection.getByRole('link', { name: /start free/i });
    await expect(startLink).toBeVisible();
    await startLink.click();
    await page.waitForURL(/sign-up/, { timeout: 5000 });
    expect(page.url()).toContain('/sign-up');
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
