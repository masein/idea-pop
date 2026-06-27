import { test, expect } from '@playwright/test';

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PROGRESS_OLDER = {
  level: 2,
  total_xp: 180,
  xp_this_level: 30,
  xp_to_next_level: 150,
  rank: 'Maker',
  explore_xp: 50,
  learn_xp: 80,
  solve_xp: 50,
  creative_cycle_active: true,
  stickers: ['ant-bridge', 'lotus-leaf'],
  medals: { bronze: 1, silver: 0, gold: 0 },
};

const MOCK_PROGRESS_YOUNG = {
  ...MOCK_PROGRESS_OLDER,
  level: 1,
  total_xp: 15,
  xp_this_level: 15,
  xp_to_next_level: 150,
  rank: 'Explorer',
  stickers: ['ant-bridge'],
  medals: { bronze: 0, silver: 0, gold: 0 },
};

const MOCK_PROJECTS = [
  {
    id: 'proj-1',
    title: 'My rope bridge',
    what_i_made: 'A bridge from sticks',
    project_photo_url: null,
    visibility: 'private',
    visibility_pending: false,
    created_at: '2026-06-27T00:00:00Z',
    challenge_title: 'Help Max Cross The River',
  },
  {
    id: 'proj-2',
    title: 'Leaf shelter',
    what_i_made: 'A shelter from leaves',
    project_photo_url: null,
    visibility: 'class',
    visibility_pending: true,
    created_at: '2026-06-27T00:00:00Z',
    challenge_title: 'Plan the Perfect Picnic',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockProfileRoutes(
  page: import('@playwright/test').Page,
  progressData = MOCK_PROGRESS_OLDER,
) {
  page.route('**/api/me/progress', async (route) => {
    await route.fulfill({ json: progressData, status: 200 });
  });

  page.route('**/api/me/projects', async (route) => {
    await route.fulfill({ json: MOCK_PROJECTS, status: 200 });
  });

  page.route('**/api/projects/*/visibility', async (route) => {
    const body = await route.request().postDataJSON();
    await route.fulfill({
      json: { id: 'proj-1', title: 'My rope bridge', visibility: body.visibility, created_at: '' },
      status: 200,
    });
  });
}

async function setYoungProfile(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('kidProfile', JSON.stringify({ birth_year: 2015, nickname: 'Maya' }));
  });
}

async function setOlderProfile(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('kidProfile', JSON.stringify({ birth_year: 2009, nickname: 'Alex' }));
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Phase 12a — Kid dashboard, portfolio & sharing', () => {

  test('1 · Profile page renders with XP card, projects, stickers', async ({ page }) => {
    mockProfileRoutes(page);
    await setOlderProfile(page);
    await page.goto('/en/profile');

    await expect(page.locator('[data-testid="profile-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="kid-xp-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="projects-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="kid-sticker-book"]')).toBeVisible();
  });

  test('2 · Older mode shows XP numbers, bar label, and adventure breakdown', async ({ page }) => {
    mockProfileRoutes(page);
    await setOlderProfile(page);
    await page.goto('/en/profile');

    // XP numbers + bar label visible
    await expect(page.locator('[data-testid="xp-numbers"]')).toBeVisible();
    await expect(page.locator('[data-testid="xp-bar-label"]')).toBeVisible();
    const barLabel = await page.locator('[data-testid="xp-bar-label"]').textContent();
    expect(barLabel).toContain('30/150');

    // Adventure breakdown visible
    await expect(page.locator('[data-testid="xp-breakdown"]')).toBeVisible();
  });

  test('3 · Young mode hides XP numbers; shows picture jar instead', async ({ page }) => {
    mockProfileRoutes(page, MOCK_PROGRESS_YOUNG);
    await setYoungProfile(page);
    await page.goto('/en/profile');

    // NO XP numbers
    await expect(page.locator('[data-testid="xp-numbers"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="xp-bar-label"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="xp-breakdown"]')).not.toBeVisible();

    // Visual jar visible
    await expect(page.locator('[data-testid="xp-jar"]')).toBeVisible();
  });

  test('4 · Medals only visible in older mode', async ({ page }) => {
    mockProfileRoutes(page);
    await setOlderProfile(page);
    await page.goto('/en/profile');
    await expect(page.locator('[data-testid="kid-medals"]')).toBeVisible();

    // Reload in young mode
    await setYoungProfile(page);
    await page.reload();
    await expect(page.locator('[data-testid="kid-medals"]')).not.toBeVisible();
  });

  test('5 · Open project → share → audience picker modal appears', async ({ page }) => {
    mockProfileRoutes(page);
    await setOlderProfile(page);
    await page.goto('/en/profile');

    // Wait for projects to load
    await expect(page.locator('[data-testid="project-card"]').first()).toBeVisible();

    // Click share on first project
    await page.locator('[data-testid="project-share-btn"]').first().click();

    // Audience picker modal should open
    await expect(page.locator('[data-testid="audience-picker-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="audience-picker"]')).toBeVisible();
  });

  test('6 · Sharing routes through moderation — class/public shows pending', async ({ page }) => {
    mockProfileRoutes(page);
    await setOlderProfile(page);
    await page.goto('/en/profile');

    await expect(page.locator('[data-testid="project-card"]').first()).toBeVisible();

    // Second project already has visibility_pending = true
    const visLabels = await page.locator('[data-testid="project-visibility"]').allTextContents();
    expect(visLabels.some((v) => v.includes('Pending review'))).toBe(true);
  });

  test('7 · Upgrade button opens parent handoff modal (no billing route)', async ({ page }) => {
    mockProfileRoutes(page);
    await setOlderProfile(page);
    await page.goto('/en/profile');

    // Upgrade button should be present
    await expect(page.locator('[data-testid="upgrade-btn"]')).toBeVisible();
    await page.locator('[data-testid="upgrade-btn"]').click();

    // Parent handoff modal appears, NOT a billing page
    await expect(page.locator('[data-testid="parent-handoff-modal"]')).toBeVisible();

    // URL must NOT change to billing
    expect(page.url()).not.toContain('billing');
    expect(page.url()).not.toContain('checkout');
  });

  test('8 · Themes bar locked below Level 4; shows message', async ({ page }) => {
    mockProfileRoutes(page, { ...MOCK_PROGRESS_OLDER, level: 2 });
    await setOlderProfile(page);
    await page.goto('/en/profile');

    await expect(page.locator('[data-testid="themes-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="themes-locked-msg"]')).toBeVisible();
    expect(await page.locator('[data-testid="themes-locked-msg"]').textContent()).toContain('Level 4');
  });
});
