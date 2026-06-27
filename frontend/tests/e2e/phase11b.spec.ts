import { test, expect } from '@playwright/test';

// ── Mock data ────────────────────────────────────────────────────────────────

const PICNIC_CHALLENGE = {
  id: 'c-picnic',
  title: 'Plan the Perfect Picnic',
  slug: 'perfect-picnic',
  brief: 'Design a shelter that keeps food dry in the rain.',
  emoji: '🧺',
  nature_clues: [
    {
      title: "Lotus leaf waterproof surface",
      description: 'Microscopic bumps repel water.',
      explore_video_id: null,
      emoji: '🌸',
      xp_reward: 5,
    },
  ],
  design_secret: 'Tiny bumps on surfaces make water bead and roll away!',
  design_secret_story: null,
  skill_lesson_id: null,
  related_explore_ids: [],
  completion_xp: 20,
  tools: ['five_whys', 'scamper', 'mind_map'] as const,
};

const MOCK_ATTEMPT = {
  id: 'a-1',
  challenge_id: 'c-picnic',
  step: 1,
  started_at: '2026-06-27T00:00:00Z',
};

const MOCK_XP = {
  xp_earned: 5,
  xp_total: 50,
  level: 1,
  rank: 'Explorer',
  is_new: false,
  cycle_bonus_earned: false,
};

const MOCK_PROJECT = {
  id: 'proj-1',
  title: 'My shelter',
  visibility: 'private',
  created_at: '2026-06-27T00:00:00Z',
};

const MOCK_IDEA = {
  id: 'idea-1',
  challenge_id: 'c-picnic',
  author_nickname: 'Aria',
  author_avatar_id: '🦋',
  project_photo_url: null,
  caption: 'A shelter made from leaves!',
  clap_count: 3,
  star_count: 1,
  lightbulb_count: 2,
  remix_count: 0,
  created_at: '2026-06-27T00:00:00Z',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockChallengeRoutes(
  page: import('@playwright/test').Page,
  ideasUnlocked = false,
) {
  page.route('**/api/challenges/c-picnic', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: PICNIC_CHALLENGE, status: 200 });
    } else {
      await route.continue();
    }
  });

  page.route('**/api/challenges/c-picnic/attempt', async (route) => {
    await route.fulfill({ json: MOCK_ATTEMPT, status: 201 });
  });

  page.route('**/api/challenges/c-picnic/ideas', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      // Only return ideas if wall is unlocked
      await route.fulfill({ json: ideasUnlocked ? [MOCK_IDEA] : [], status: 200 });
    } else if (method === 'POST') {
      await route.fulfill({ json: { id: 'idea-new' }, status: 201 });
    } else {
      await route.continue();
    }
  });

  page.route('**/api/attempts/**', async (route) => {
    await route.fulfill({ json: MOCK_XP, status: 200 });
  });

  page.route('**/api/projects', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: MOCK_PROJECT, status: 201 });
    } else {
      await route.continue();
    }
  });

  page.route('**/api/projects/*/visibility', async (route) => {
    await route.fulfill({ json: { ...MOCK_PROJECT, visibility: 'private' }, status: 200 });
  });

  page.route('**/api/ideas/*/react', async (route) => {
    await route.fulfill({ json: {}, status: 200 });
  });

  page.route('**/api/ideas/*/remix', async (route) => {
    await route.fulfill({ json: { attempt_id: 'a-new' }, status: 201 });
  });
}

async function setYoungProfile(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('kidProfile', JSON.stringify({ birth_year: 2015, nickname: 'Max' }));
  });
}

async function setOlderProfile(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('kidProfile', JSON.stringify({ birth_year: 2009, nickname: 'Alex' }));
  });
}

async function setWallUnlocked(page: import('@playwright/test').Page, challengeId: string) {
  await page.evaluate((id) => {
    localStorage.setItem(`wallSubmitted_${id}`, 'true');
  }, challengeId);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Phase 11b — Ideas Wall, creativity tools & share', () => {

  test('1 · Ideas Wall tab is locked until kid submits own idea', async ({ page }) => {
    mockChallengeRoutes(page, false);
    await page.goto('/en/app/challenges/c-picnic');

    // Wall tab should be visible
    await expect(page.locator('[data-testid="tab-wall"]')).toBeVisible();

    // Click the wall tab
    await page.locator('[data-testid="tab-wall"]').click();

    // Wall should be locked
    await expect(page.locator('[data-testid="wall-locked"]')).toBeVisible();
    await expect(page.locator('[data-testid="write-my-idea-cta"]')).toBeVisible();
    expect(await page.locator('[data-testid="wall-locked"]').textContent()).toContain('Send your idea first');
  });

  test('2 · Ideas Wall unlocks after kid submits idea from Celebrate step', async ({ page }) => {
    mockChallengeRoutes(page, false);
    await page.goto('/en/app/challenges/c-picnic');

    // Navigate to step 8 via YES path
    await page.locator('[data-testid="step-brief"]').getByRole('button', { name: /Let's go/i }).click();
    await page.locator('[data-testid="idea-yes"]').click();
    await expect(page.locator('[data-testid="step-sketch"]')).toBeVisible();

    await page.locator('[data-testid="field-title"]').fill('My leaf shelter');
    await page.locator('[data-testid="field-used"]').fill('leaves, sticks');
    await page.locator('[data-testid="capture-submit"]').click();

    await expect(page.locator('[data-testid="step-build"]')).toBeVisible();
    await page.locator('[data-testid="field-title"]').fill('Finished shelter');
    await page.locator('[data-testid="field-used"]').fill('leaves, sticks, mud');
    await page.locator('[data-testid="capture-submit"]').click();

    await expect(page.locator('[data-testid="step-celebrate"]')).toBeVisible();

    // Submit to wall
    await page.locator('[data-testid="wall-submit-btn"]').click();

    // Should show "being reviewed" confirmation
    await expect(page.locator('[data-testid="wall-submitted-note"]')).toBeVisible();

    // Now switch to wall tab — it should be unlocked
    await page.locator('[data-testid="tab-wall"]').click();
    await expect(page.locator('[data-testid="wall-unlocked"]')).toBeVisible();
  });

  test('3 · Submitted idea is NOT shown in wall until approved (moderation)', async ({ page }) => {
    // IDEAS endpoint returns empty = submitted idea not yet approved
    mockChallengeRoutes(page, false);
    await setWallUnlocked(page, 'c-picnic');

    await page.goto('/en/app/challenges/c-picnic');

    await page.locator('[data-testid="tab-wall"]').click();
    await expect(page.locator('[data-testid="wall-unlocked"]')).toBeVisible();

    // No ideas shown (not yet approved)
    await expect(page.locator('[data-testid="idea-card"]')).not.toBeVisible();
    await expect(page.getByText('No ideas yet')).toBeVisible();
  });

  test('4 · Approved ideas appear; sort toggle changes sort', async ({ page }) => {
    mockChallengeRoutes(page, true);
    await setWallUnlocked(page, 'c-picnic');

    const sortCalls: string[] = [];
    await page.route('**/api/challenges/c-picnic/ideas*', async (route) => {
      const url = new URL(route.request().url());
      sortCalls.push(url.searchParams.get('sort') ?? 'newest');
      await route.fulfill({ json: [MOCK_IDEA], status: 200 });
    });

    await page.goto('/en/app/challenges/c-picnic');
    await page.locator('[data-testid="tab-wall"]').click();

    await expect(page.locator('[data-testid="idea-card"]')).toBeVisible();
    expect(await page.locator('[data-testid="idea-card"]').textContent()).toContain('A shelter made from leaves!');

    // Toggle to "most remixed"
    await page.locator('[data-testid="sort-remixed"]').click();
    await expect(page.locator('[data-testid="idea-card"]')).toBeVisible();
    expect(sortCalls).toContain('most_remixed');
  });

  test('5 · Reactions and remix work on idea cards', async ({ page }) => {
    mockChallengeRoutes(page, true);
    await setWallUnlocked(page, 'c-picnic');

    const reactCalls: string[] = [];
    let remixCalled = false;

    await page.route('**/api/ideas/idea-1/react', async (route) => {
      const body = await route.request().postDataJSON();
      reactCalls.push(body.reaction);
      await route.fulfill({ json: {}, status: 200 });
    });

    await page.route('**/api/ideas/idea-1/remix', async (route) => {
      remixCalled = true;
      await route.fulfill({ json: { attempt_id: 'a-new' }, status: 201 });
    });

    await page.goto('/en/app/challenges/c-picnic');
    await page.locator('[data-testid="tab-wall"]').click();
    await expect(page.locator('[data-testid="idea-card"]')).toBeVisible();

    await page.locator('[data-testid="react-clap"]').click();
    await page.locator('[data-testid="react-star"]').click();
    await page.locator('[data-testid="remix-btn"]').click();

    await page.waitForTimeout(500);
    expect(reactCalls).toContain('clap');
    expect(reactCalls).toContain('star');
    expect(remixCalled).toBe(true);
  });

  test('6 · Restricted kid sees friendly gate — no raw error', async ({ page }) => {
    mockChallengeRoutes(page, false);
    // Override wall submit to return 403
    await page.route('**/api/challenges/c-picnic/ideas', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 403 });
      } else {
        await route.fulfill({ json: [], status: 200 });
      }
    });

    await page.goto('/en/app/challenges/c-picnic');

    // Navigate to celebrate step
    await page.locator('[data-testid="step-brief"]').getByRole('button', { name: /Let's go/i }).click();
    await page.locator('[data-testid="idea-yes"]').click();

    await page.locator('[data-testid="field-title"]').fill('Leaf shelter');
    await page.locator('[data-testid="field-used"]').fill('leaves');
    await page.locator('[data-testid="capture-submit"]').click();

    await page.locator('[data-testid="field-title"]').fill('Built shelter');
    await page.locator('[data-testid="field-used"]').fill('leaves and sticks');
    await page.locator('[data-testid="capture-submit"]').click();

    await expect(page.locator('[data-testid="step-celebrate"]')).toBeVisible();

    // Try to submit to wall — should get friendly 403 message, not raw error
    await page.locator('[data-testid="wall-submit-btn"]').click();
    await expect(page.locator('[data-testid="wall-submit-error"]')).toBeVisible();
    expect(await page.locator('[data-testid="wall-submit-error"]').textContent()).toContain('grown-up');

    // Must NOT show a raw "403" or "Forbidden" anywhere on the page
    const pageText = await page.locator('body').textContent();
    expect(pageText).not.toContain('403');
    expect(pageText).not.toContain('Forbidden');
  });

  test('7 · Creativity tools render based on challenge.tools field (picnic has all 3)', async ({ page }) => {
    mockChallengeRoutes(page, false);
    await page.goto('/en/app/challenges/c-picnic');

    // Navigate to sketch step (step 6 via YES)
    await page.locator('[data-testid="step-brief"]').getByRole('button', { name: /Let's go/i }).click();
    await page.locator('[data-testid="idea-yes"]').click();
    await expect(page.locator('[data-testid="step-sketch"]')).toBeVisible();

    // Tool selector should be visible (picnic challenge has tools)
    await expect(page.locator('[data-testid="tool-selector"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-accordion-toggle"]')).toBeVisible();

    // Expand accordion
    await page.locator('[data-testid="tool-accordion-toggle"]').click();

    // All 3 tool tabs should be present
    await expect(page.locator('[data-testid="tool-tab-five_whys"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-tab-scamper"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-tab-mind_map"]')).toBeVisible();
  });

  test('8 · 5 Whys tool: young = 3 inputs, older = 5 inputs', async ({ page }) => {
    mockChallengeRoutes(page, false);

    // Young mode
    await setYoungProfile(page);
    await page.goto('/en/app/challenges/c-picnic');

    await page.locator('[data-testid="step-brief"]').getByRole('button', { name: /Let's go/i }).click();
    await page.locator('[data-testid="idea-yes"]').click();
    await expect(page.locator('[data-testid="step-sketch"]')).toBeVisible();

    await page.locator('[data-testid="tool-accordion-toggle"]').click();
    await page.locator('[data-testid="tool-tab-five_whys"]').click();

    await expect(page.locator('[data-testid="tool-five-whys"]')).toBeVisible();
    // Young: 3 why inputs
    const youngInputs = await page.locator('[data-testid^="why-input-"]').count();
    expect(youngInputs).toBe(3);

    // Older mode
    await setOlderProfile(page);
    await page.reload();
    await page.locator('[data-testid="step-brief"]').getByRole('button', { name: /Let's go/i }).click();
    await page.locator('[data-testid="idea-yes"]').click();
    await page.locator('[data-testid="tool-accordion-toggle"]').click();
    await page.locator('[data-testid="tool-tab-five_whys"]').click();

    const olderInputs = await page.locator('[data-testid^="why-input-"]').count();
    expect(olderInputs).toBe(5);
  });
});
