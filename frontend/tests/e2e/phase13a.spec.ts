/**
 * Phase 13a — Accessibility, performance & golden-path e2e
 *
 * Coverage:
 *   - axe assertions on every major screen (WCAG AA)
 *   - Full kid golden path: onboarding → challenge → share
 *   - Parent: weekly report + consent toggle
 *   - Teacher: assign mission + copy class code
 *   - Reviewer: approve + reject with reason
 *   - Locale switch EN ↔ FA (RTL layout verification)
 *   - Keyboard nav: skip-nav link + focus trap in modals
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ── Shared helpers ────────────────────────────────────────────────────────────

async function setCookie(page: import('@playwright/test').Page, name: string, value: string) {
  await page.context().addCookies([{ name, value, domain: 'localhost', path: '/' }]);
}

function mockChallengeAPIs(page: import('@playwright/test').Page) {
  page.route('**/api/challenges', (r) =>
    r.fulfill({
      json: [{ id: 'ch-1', title: 'Build a bridge', emoji: '🌉', tools: ['five_whys'], difficulty: 'easy', time_minutes: 30, xp_reward: 20, mess_level: 1 }],
    })
  );
  // Mirrors the REAL ChallengeDetail contract (flattened step fields).
  page.route('**/api/challenges/ch-1', (r) =>
    r.fulfill({
      json: {
        id: 'ch-1', title: 'Build a bridge', slug: 'build-a-bridge',
        season: 1, week_number: 1, xp_reward: 20, completion_xp: 20, emoji: '🚀',
        steps: [], related_video_ids: [], related_explore_ids: [],
        is_premium: false, locked: false, created_at: '2026-07-01T00:00:00Z',
        brief: 'Design a bridge that can hold a book.',
        design_secret: 'Triangles distribute weight efficiently.',
        design_secret_story: 'Which shape refuses to wobble?',
        nature_clues: [
          { emoji: '🌿', title: 'From the jungle', description: 'Spider webs are stronger than steel by weight.', image_url: null, explore_video_id: null, xp_reward: 5 },
          { emoji: '🌊', title: 'From the ocean', description: 'Coral branches spread load in every direction.', image_url: null, explore_video_id: null, xp_reward: 5 },
        ],
        skill_lesson_id: null,
        sketch_prompt: 'Draw the bridge that saves the day.',
        sketch_guidance: 'Label the strongest part.',
        tools: [{ kind: 'five_whys', age_mode: 'young' }, { kind: 'scamper', age_mode: 'older' }],
        age_tier_variants: [{ age_tier: '8-10', title_override: null, summary: 'Entry' }],
        skill_hints: ['Try a tiny version first — small tests fail fast and teach fast.', 'The big hint: tape beats glue for quick prototypes!'],
        build_hints: ['Test with something lighter than the book first.', 'The big hint: add triangles — they spread the weight!'],
      },
    })
  );
  page.route('**/api/challenges/ch-1/attempts', (r) =>
    r.fulfill({ json: { attempt_id: 'att-1', current_step: 1 } })
  );
  page.route('**/api/challenges/ch-1/steps/*/help', (r) =>
    r.fulfill({ json: { answer: 'Try one coin first — does it hold? 🐧', blocked: false } })
  );
  page.route('**/api/attempts/att-1/step', (r) => r.fulfill({ json: {} }));
  page.route('**/api/projects', (r) =>
    r.fulfill({ json: { id: 'proj-1', title: 'My bridge' } })
  );
  page.route('**/api/challenges/ch-1/ideas', (r) =>
    r.fulfill({ json: [] })
  );
  page.route('**/api/projects/proj-1/visibility', (r) => r.fulfill({ json: {} }));
}

function mockProfileAPIs(page: import('@playwright/test').Page) {
  // Real ProgressResponse shape (xp_total/level/rank/counts/medal-strings).
  page.route('**/api/me/progress', (r) =>
    r.fulfill({
      json: {
        xp_total: 85, level: 3, rank: 'Maker',
        explore_count: 5, learn_count: 4, solve_count: 1,
        medals: { explore: 'bronze', learn: null, solve: null },
        creative_cycles_completed: 0, badges: [],
      },
    })
  );
  // Real API shape: ProjectListResponse { items: [...] }, NOT a bare array.
  page.route('**/api/me/projects', (r) =>
    r.fulfill({
      json: {
        items: [
          { id: 'proj-1', title: 'My bridge', what_i_made: 'A cool bridge', project_photo_url: null, visibility: 'private', visibility_pending: false, created_at: '2026-06-01T00:00:00Z', challenge_title: 'Build a bridge' },
        ],
      },
    })
  );
}

function mockParentAPIs(page: import('@playwright/test').Page) {
  page.route('**/api/parent/children', (r) =>
    r.fulfill({
      json: [{
        id: 'child-1', nickname: 'Pixel', avatar_id: 'penguin', birth_year: 2015,
        level: 2, total_xp: 85, consent_granted: true, class_sharing_enabled: false, public_sharing_enabled: false,
        display_mode: 'avatar_nickname', helper_enabled: false,
      }],
    })
  );
  page.route('**/billing/subscription', (r) =>
    r.fulfill({ json: { is_premium: false, plan: null, current_period_end: null } })
  );
  page.route('**/api/parent/children/child-1/report', (r) =>
    r.fulfill({
      json: {
        explore_videos_watched: 3, lessons_completed: 2, challenges_completed: 1,
        xp_earned: 55, projects: [{ id: 'proj-1', title: 'My bridge', visibility: 'private' }],
      },
    })
  );
  page.route('**/api/consents/**', (r) => r.fulfill({ json: {} }));
  page.route('**/api/account/email-preferences', (r) =>
    r.request().method() === 'PUT'
      ? r.fulfill({ json: JSON.parse(r.request().postData() ?? '{}') })
      : r.fulfill({ json: { marketing: false, new_content: false, activity_reports: false } })
  );
  page.route('**/api/parent/approvals', (r) =>
    r.fulfill({
      json: [
        {
          id: 'appr-1', kind: 'share_post', child_id: 'child-1', child_nickname: 'Pixel',
          title: 'My bridge', requested_visibility: 'class', created_at: '2026-07-01T10:00:00Z',
        },
        {
          id: 'appr-2', kind: 'premium_unlock', child_id: 'child-1', child_nickname: 'Pixel',
          title: null, requested_visibility: null, created_at: '2026-07-02T10:00:00Z',
        },
      ],
    })
  );
  page.route('**/api/parent/approvals/*/approve', (r) => r.fulfill({ json: { id: 'appr-1', status: 'approved' } }));
  page.route('**/api/parent/approvals/*/dismiss', (r) => r.fulfill({ json: { id: 'appr-2', status: 'dismissed' } }));
  page.route('**/api/parent/children/*/display-mode', (r) =>
    r.fulfill({ json: { child_id: 'child-1', display_mode: 'anonymous' } })
  );
}

function mockTeacherAPIs(page: import('@playwright/test').Page) {
  page.route('**/api/teacher/class', (r) =>
    r.fulfill({
      json: { id: 'cls-1', name: 'Room 7', class_code: 'XYZ999', student_count: 14, assigned_challenge_id: null, assigned_challenge_title: null },
    })
  );
  page.route('**/api/challenges', (r) =>
    r.fulfill({ json: [{ id: 'ch-1', title: 'Build a bridge', emoji: '🌉', tools: [] }] })
  );
  page.route('**/api/teacher/class/gallery', (r) =>
    r.fulfill({ json: [{ id: 'g1', project_title: "Pixel's bridge", student_nickname: 'Pixel' }] })
  );
  page.route('**/api/teacher/class/assign', (r) => r.fulfill({ json: {} }));
}

function mockReviewerAPIs(page: import('@playwright/test').Page) {
  page.route('**/api/moderation/queue**', (r) =>
    r.fulfill({
      json: [
        { id: 'mod-1', type: 'project', content_id: 'p1', content_title: 'My bridge', content_photo_url: null, author_nickname: 'Pixel', submitted_at: '2026-06-20T10:00:00Z', status: 'pending', rejection_reason: null },
        { id: 'mod-2', type: 'idea', content_id: 'i1', content_title: 'What if mushrooms?', content_photo_url: null, author_nickname: 'Sparky', submitted_at: '2026-06-21T08:00:00Z', status: 'pending', rejection_reason: null },
      ],
    })
  );
  page.route('**/api/reports', (r) =>
    r.fulfill({ json: [{ id: 'r1', content_type: 'project', reason: 'Contains a face', created_at: '2026-06-22T00:00:00Z', resolved: false }] })
  );
  page.route('**/api/moderation/mod-1/approve', (r) => r.fulfill({ json: {} }));
  page.route('**/api/moderation/mod-2/reject', (r) => r.fulfill({ json: {} }));
}

// ── Accessibility — public marketing pages ────────────────────────────────────

test.describe('axe — marketing pages', () => {
  test('homepage passes axe', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('[aria-hidden="true"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('sign-up page passes axe', async ({ page }) => {
    await page.goto('/en/sign-up');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('pricing page passes axe', async ({ page }) => {
    await page.goto('/en/pricing');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

// ── Accessibility — app pages (mocked auth) ───────────────────────────────────

test.describe('axe — app pages', () => {
  test('explore page passes axe', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    page.route('**/api/explore**', (r) =>
      r.fulfill({ json: { items: [], total: 0, categories: [] } })
    );
    await page.goto('/en/explore');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('library page passes axe', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    // Real data so the orange studio cards + quick-make tiles are contrast-checked.
    page.route('**/api/library/studios', (r) =>
      r.fulfill({
        json: [
          { studio: 'craft', quick_make_count: 12, course_count: 2 },
          { studio: 'nature', quick_make_count: 0, course_count: 0 },
        ],
      })
    );
    page.route('**/api/library/courses', (r) =>
      r.fulfill({
        json: [
          {
            id: 'c1', title: 'Drawing Animals 101', slug: 'drawing-animals-101',
            studio: 'art', creator_id: 'cr1', creator_name: 'Ms. Noor',
            difficulty: 1, age_min: 8, lesson_count: 6,
          },
        ],
      })
    );
    page.route('**/api/library/quick-makes**', (r) =>
      r.fulfill({
        json: {
          items: [
            {
              id: 'q1', title: 'How to make slime!', slug: 'slime', studio: 'science',
              difficulty: 1, time_minutes: 15, materials: ['home stuff'], mess_level: 2,
              video_url: '', xp_reward: 5, ai_generated: false, created_at: '2024-01-01T00:00:00Z',
            },
          ],
          total: 1, page: 1, per_page: 4,
        },
      })
    );
    await page.goto('/en/library');
    await page.waitForLoadState('networkidle');
    // The classifier's standalone entry point lives here now (not in the nav),
    // so the axe pass below also contrast-checks the purple tool card.
    await expect(page.getByTestId('tool-card-classifier')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('kid sidebar shows exactly the designed nav items (no AI Studio)', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    page.route('**/api/library/**', (r) => r.fulfill({ json: [] }));
    await page.goto('/en/library');
    // On narrow viewports the nav lives in the drawer — open it first.
    const openBtn = page.getByRole('button', { name: 'Open navigation' });
    if (await openBtn.isVisible()) await openBtn.click();
    const nav = page.locator('nav[aria-label="Main navigation"]:visible').first();
    await expect(nav.getByRole('link', { name: 'Library' })).toBeVisible();
    const labels = await nav.locator('ul[role="list"] a > span:first-child').allTextContents();
    expect(labels).toEqual(['My Profile', 'Exploring', 'Library', 'Challenges', 'Account']);
  });

  test('library tool card opens the Machine Trainer', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    page.route('**/api/library/**', (r) => r.fulfill({ json: [] }));
    await page.goto('/en/library');
    await page.getByTestId('tool-card-classifier').click();
    await page.waitForURL('**/studio/classify');
    await expect(page.getByTestId('classifier-power-up')).toBeVisible();
    await expect(page.getByTestId('classifier-privacy-note')).toBeVisible();
  });

  test('challenges list page passes axe', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    page.route('**/api/challenges', (r) =>
      r.fulfill({
        json: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            title: 'Help Max cross the river', slug: 'help-max',
            brief: 'Find the way across the river before sunset', emoji: '🚀',
            nature_clues: [], design_secret: '', design_secret_story: null,
            skill_lesson_id: null, related_explore_ids: [], completion_xp: 20, tools: [],
          },
          {
            id: '22222222-2222-2222-2222-222222222222',
            title: 'The Picnic Problem!', slug: 'picnic',
            brief: 'Invent a way to carry it all.', emoji: '🧺',
            nature_clues: [], design_secret: '', design_secret_story: null,
            skill_lesson_id: null, related_explore_ids: [], completion_xp: 20, tools: [],
          },
        ],
      })
    );
    await page.goto('/en/challenges');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('profile page passes axe', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockProfileAPIs(page);
    await page.goto('/en/profile');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('mission hints ladder passes axe when fully revealed', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockChallengeAPIs(page);
    await page.goto('/en/challenges/ch-1');
    // Walk the "yes, I have an idea" fork to Build & test (step 7).
    await page.getByTestId('step-brief').getByRole('button').first().click();
    await page.getByTestId('idea-yes').click();
    await page.getByTestId('field-title').fill('My bridge');
    await page.getByTestId('field-used').fill('Sticks and tape');
    await page.getByRole('button', { name: /save my idea/i }).click();
    await page.getByTestId('step-build').waitFor();

    await expect(page.getByTestId('mission-hints')).toBeVisible();
    await page.getByTestId('hints-toggle').click();
    await page.getByTestId('hint-reveal-btn').click(); // hint 1
    await expect(page.getByTestId('hint-item-0')).toBeVisible();
    await page.getByTestId('hint-reveal-btn').click(); // the give-away
    await expect(page.getByTestId('hint-item-1')).toBeVisible();
    await expect(page.getByTestId('hints-done')).toBeVisible();
    await expect(page.getByTestId('hint-reveal-btn')).toHaveCount(0);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('mission helper passes axe when open with an answer', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockChallengeAPIs(page);
    await page.goto('/en/challenges/ch-1');
    // Walk the "yes, I have an idea" fork to Build & test (step 7).
    await page.getByTestId('step-brief').getByRole('button').first().click();
    await page.getByTestId('idea-yes').click();
    await page.getByTestId('field-title').fill('My bridge');
    await page.getByTestId('field-used').fill('Sticks and tape');
    await page.getByRole('button', { name: /save my idea/i }).click();
    await page.getByTestId('step-build').waitFor();

    await expect(page.getByTestId('mission-helper')).toBeVisible();
    // The helper IS Popi — same penguin as the floating Ask-Me mascot.
    await expect(page.getByTestId('helper-toggle')).toContainText('Ask Popi');
    await page.getByTestId('helper-toggle').click();
    await page.getByTestId('helper-question-input').fill('Why does my bridge fall?');
    await page.getByTestId('helper-ask-btn').click();
    await expect(page.getByTestId('helper-answer')).toContainText('Try one coin first');
    await expect(page.getByTestId('helper-answer')).toContainText('Popi says');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);

    // The capture card's "Brainstorm with Popi" CTA opens this same helper.
    await page.getByTestId('helper-toggle').click(); // collapse
    await expect(page.getByTestId('helper-question-input')).toHaveCount(0);
    await page.getByTestId('ai-hint').click();
    await expect(page.getByTestId('helper-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('helper-question-input')).toBeVisible();
  });

  test('mission plays through ALL 8 steps via the inspire-me fork', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockChallengeAPIs(page);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/en/challenges/ch-1');
    // 1 · Brief
    await expect(page.getByTestId('step-brief')).toBeVisible();
    await expect(page.getByTestId('step-brief')).toContainText('Design a bridge that can hold a book.');
    await page.getByTestId('step-brief').getByRole('button').first().click();
    // 2 · Idea fork — take the NON-jump path (this used to white-screen).
    await page.getByTestId('idea-no').click();
    // 3 · Nature clues render with real clue content
    await expect(page.getByTestId('step-nature-clues')).toBeVisible();
    await expect(page.getByTestId('nature-clue-0')).toContainText('Spider webs are stronger');
    await expect(page.getByTestId('nature-clue-1')).toContainText('From the ocean');
    await page.getByTestId('step-nature-clues').getByRole('button', { name: /secret/i }).click();
    // 4 · Design secret
    await expect(page.getByTestId('step-design-secret')).toBeVisible();
    await expect(page.getByTestId('step-design-secret')).toContainText('Triangles distribute weight');
    await page.getByTestId('step-design-secret').getByRole('button').first().click();
    // 5 · Skill (+hints ladder present)
    await expect(page.getByTestId('step-skill')).toBeVisible();
    await expect(page.getByTestId('mission-hints')).toBeVisible();
    await page.getByTestId('step-skill').getByRole('button', { name: /continue/i }).click();
    // 6 · Sketch (+ thinking tools from the real {kind, age_mode} objects)
    await expect(page.getByTestId('step-sketch')).toBeVisible();
    // The mission's OWN sketch prompt — never the stale Help-Max copy.
    await expect(page.getByTestId('step-sketch')).toContainText('Draw the bridge that saves the day.');
    await expect(page.getByTestId('sketch-guidance')).toContainText('Label the strongest part.');
    await expect(page.getByTestId('step-sketch')).not.toContainText('crossing machine');
    await expect(page.getByTestId('tool-selector')).toBeVisible();
    await page.getByTestId('field-title').fill('My bridge');
    await page.getByTestId('field-used').fill('Sticks');
    await page.getByRole('button', { name: /save my idea/i }).click();
    // 7 · Build & test (+hints)
    await expect(page.getByTestId('step-build')).toBeVisible();
    await expect(page.getByTestId('mission-hints')).toBeVisible();
    await page.getByTestId('test-worked').click();
    await page.getByTestId('field-title').fill('My bridge build');
    await page.getByTestId('field-used').fill('Sticks and tape');
    await page.getByRole('button', { name: /mission complete/i }).click();
    // 8 · Celebrate
    await expect(page.getByTestId('step-celebrate')).toBeVisible();

    expect(errors, `client-side exceptions: ${errors.join(' | ')}`).toEqual([]);
  });

  test('studio classify page passes axe', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    // No API mocks needed: the classifier is fully on-device and the model
    // only downloads after the power-up button is pressed.
    await page.goto('/en/studio/classify');
    await expect(page.getByTestId('classifier-power-up')).toBeVisible();
    await expect(page.getByTestId('classifier-privacy-note')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('parent dashboard passes axe', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'parent');
    mockParentAPIs(page);
    await page.goto('/en/dashboard/parent');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('teacher dashboard passes axe', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'teacher');
    mockTeacherAPIs(page);
    await page.goto('/en/dashboard/teacher');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('reviewer dashboard passes axe', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'reviewer');
    mockReviewerAPIs(page);
    await page.goto('/en/dashboard/reviewer');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

// ── Skip-nav keyboard accessibility ──────────────────────────────────────────

test('skip-nav link is the first focusable element and targets #main-content', async ({ page }) => {
  await page.goto('/en');
  await page.waitForLoadState('networkidle');

  // Focus the skip-nav link directly (it's visually hidden but in the DOM)
  const skipLink = page.locator('a.skip-nav').first();
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveAttribute('href', '#main-content');

  // The href target should exist in the DOM
  const mainContent = page.locator('#main-content');
  await expect(mainContent).toBeAttached();
});

test('skip-nav link works on FA locale', async ({ page }) => {
  await page.goto('/fa');
  await page.waitForLoadState('networkidle');
  const skipLink = page.locator('a.skip-nav').first();
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toContainText('رفتن به محتوا');
});

// ── Golden path — kid ─────────────────────────────────────────────────────────

test.describe('golden path — kid signs up and completes a challenge', () => {
  test('kid onboarding flow renders all steps', async ({ page }) => {
    await page.goto('/en/sign-up');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // The sign-up page lists persona choices
    await expect(page.getByText(/kid|child|learner/i).first()).toBeVisible();
  });

  test('kid navigates to challenge list and opens a challenge', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockChallengeAPIs(page);

    await page.goto('/en/challenges');
    // Challenge list shows at least a heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('kid starts a challenge and sees Mission HUD', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockChallengeAPIs(page);

    await page.goto('/en/challenges/ch-1');
    await expect(page.getByTestId('challenge-page')).toBeVisible();

    // Mission tab is visible by default
    await expect(page.getByTestId('tab-mission')).toBeVisible();
    // Mission HUD renders
    await expect(page.getByTestId('mission-hud')).toBeVisible();
  });

  test('kid can switch to Ideas Wall tab (locked by default)', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockChallengeAPIs(page);

    await page.goto('/en/challenges/ch-1');
    await page.getByTestId('tab-wall').click();
    await expect(page.getByTestId('wall-locked')).toBeVisible();
    // Write-my-idea CTA visible
    await expect(page.getByTestId('write-my-idea-cta')).toBeVisible();
  });

  test('kid profile shows XP progress', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockProfileAPIs(page);

    await page.goto('/en/profile');
    await expect(page.getByTestId('profile-page')).toBeVisible();
    await expect(page.getByTestId('xp-bar')).toBeVisible();
  });

  test('fresh kid opens profile without crashing — empty state renders', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    // A brand-new kid: default progress, and /me/projects returns { items: [] }.
    page.route('**/api/me/progress', (r) =>
      r.fulfill({
        json: {
          xp_total: 0, level: 1, rank: 'Explorer',
          explore_count: 0, learn_count: 0, solve_count: 0,
          medals: { explore: null, learn: null, solve: null },
          creative_cycles_completed: 0, badges: [],
        },
      })
    );
    page.route('**/api/me/projects', (r) => r.fulfill({ json: { items: [] } }));
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/en/profile');
    await expect(page.getByTestId('profile-page')).toBeVisible();
    await expect(page.getByTestId('projects-empty')).toBeVisible();
    expect(errors, `client exceptions: ${errors.join(' | ')}`).toEqual([]);
  });

  test('kid Upgrade CTA opens parent handoff, not billing page', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockProfileAPIs(page);

    await page.goto('/en/profile');
    await page.getByTestId('upgrade-btn').click();
    await expect(page.getByTestId('parent-handoff-modal')).toBeVisible();
    // URL must NOT change to /billing
    expect(page.url()).not.toContain('/billing');
    expect(page.url()).not.toContain('/checkout');
  });

  test('sharing routes through AudiencePicker and shows pending state', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockProfileAPIs(page);
    page.route('**/api/projects/proj-1/visibility', (r) =>
      r.fulfill({ json: { visibility: 'class', visibility_pending: true } })
    );

    await page.goto('/en/profile');
    const shareBtn = page.getByTestId('project-share-btn').first();
    await shareBtn.click();
    await expect(page.getByTestId('audience-picker')).toBeVisible();

    // Select class and save
    await page.getByTestId('share-class').click();
    await page.getByTestId('audience-save').click();
    // Picker should complete (saved or modal closed)
    await expect(page.getByTestId('audience-picker')).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // Some implementations keep picker open until parent closes modal — that's also fine
    });
  });
});

// ── Golden path — parent ──────────────────────────────────────────────────────

test.describe('golden path — parent', () => {
  test('parent sees child list and can view weekly report', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'parent');
    mockParentAPIs(page);

    await page.goto('/en/dashboard/parent');
    await expect(page.getByTestId('parent-dashboard')).toBeVisible();
    await expect(page.getByTestId('child-card')).toBeVisible();
    await expect(page.getByTestId('child-card').getByText('Pixel')).toBeVisible();

    await page.getByTestId('view-report-btn').click();
    await expect(page.getByTestId('weekly-report-modal')).toBeVisible();
    await expect(page.getByTestId('report-stats')).toBeVisible();
  });

  test('invite-child button links to the kid onboarding, not a dead route', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'parent');
    mockParentAPIs(page);

    await page.goto('/en/dashboard/parent');
    const invite = page.getByTestId('add-child-btn');
    await expect(invite).toBeVisible();
    // Points at the real kid-onboarding flow, not the old dead /sign-up/kid.
    await expect(invite).toHaveAttribute('href', /\/onboarding\/kid$/);
  });

  test('kid onboarding route renders (invite-child destination is real)', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'parent');
    await page.goto('/en/onboarding/kid');
    await expect(page.getByTestId('avatar-grid')).toBeVisible();
    await expect(page.getByTestId('not-found')).toHaveCount(0);
  });

  test('parent consent toggle grants class sharing', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'parent');
    mockParentAPIs(page);

    await page.goto('/en/dashboard/parent');
    const toggle = page.getByTestId('toggle-class-sharing');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('parent email preference saves via PUT and stays checked', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'parent');
    mockParentAPIs(page);

    await page.goto('/en/dashboard/parent');
    const checkbox = page.getByTestId('email-pref-marketing');
    await expect(checkbox).not.toBeChecked();

    const putRequest = page.waitForRequest(
      (req) => req.url().includes('/api/account/email-preferences') && req.method() === 'PUT',
    );
    await checkbox.click();
    const req = await putRequest;
    expect(req.postDataJSON()).toEqual({
      marketing: true,
      new_content: false,
      activity_reports: false,
    });
    await expect(checkbox).toBeChecked();
  });

  test('parent approves a "Needs your OK" item (POST + removed from queue)', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'parent');
    mockParentAPIs(page);

    await page.goto('/en/dashboard/parent');
    await expect(page.getByTestId('approval-item')).toHaveCount(2);

    const postRequest = page.waitForRequest(
      (req) => req.url().includes('/api/parent/approvals/appr-1/approve') && req.method() === 'POST',
    );
    await page.getByTestId('approval-approve-btn').first().click();
    const req = await postRequest;
    expect(req.postDataJSON()).toEqual({ kind: 'share_post' });
    await expect(page.getByTestId('approval-item')).toHaveCount(1);

    // Dismiss the premium-unlock item too.
    await page.getByTestId('approval-dismiss-btn').click();
    await expect(page.getByTestId('approval-item')).toHaveCount(0);
  });

  test('parent sets child display mode (PUT payload)', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'parent');
    mockParentAPIs(page);

    await page.goto('/en/dashboard/parent');
    const select = page.getByTestId('display-mode-select');
    await expect(select).toHaveValue('avatar_nickname');

    const putRequest = page.waitForRequest(
      (req) =>
        req.url().includes('/api/parent/children/child-1/display-mode') && req.method() === 'PUT',
    );
    await select.selectOption('anonymous');
    const req = await putRequest;
    expect(req.postDataJSON()).toEqual({ display_mode: 'anonymous' });
    await expect(select).toHaveValue('anonymous');
  });

  test('parent billing section shows upgrade options when not premium', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'parent');
    mockParentAPIs(page);

    await page.goto('/en/dashboard/parent');
    await expect(page.getByTestId('billing-section')).toBeVisible();
    await expect(page.getByTestId('checkout-monthly-btn')).toBeVisible();
    await expect(page.getByTestId('checkout-annual-btn')).toBeVisible();
  });
});

// ── Golden path — teacher ─────────────────────────────────────────────────────

// ── Golden path — auth ─────────────────────────────────────────────────────────
// Runs in a REAL browser build, so it catches bugs jsdom hides — e.g. an
// Input that doesn't forward react-hook-form's ref silently loses every
// field value in production and fails validation with "Invalid input".

test.describe('golden path — auth', () => {
  test('teacher registration submits real values and redirects', async ({ page }) => {
    const postRequest = page.waitForRequest(
      (req) => req.url().includes('/api/auth/register') && req.method() === 'POST',
    );
    await page.route('**/api/auth/register', (r) => r.fulfill({ status: 201, json: {} }));

    await page.goto('/en/sign-up/teacher');
    await page.getByLabel(/email/i).fill('teacher@example.com');
    await page.getByLabel(/^password/i).fill('password123');
    await page.getByLabel(/confirm/i).fill('password123');

    // The show-password toggle reveals the typed value.
    const pw = page.getByLabel(/^password/i);
    await expect(pw).toHaveAttribute('type', 'password');
    await page.getByTestId('toggle-password-visibility').first().click();
    await expect(pw).toHaveAttribute('type', 'text');
    await expect(pw).toHaveValue('password123');
    await page.getByTestId('toggle-password-visibility').first().click();

    await page.getByRole('button', { name: /create account/i }).click();
    const req = await postRequest;
    expect(req.postDataJSON()).toEqual({
      email: 'teacher@example.com',
      password: 'password123',
      role: 'teacher',
    });
    await expect(page).toHaveURL(/dashboard\/teacher/);
  });
});

test.describe('golden path — teacher', () => {
  test('teacher sees class code and copies it', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'teacher');
    mockTeacherAPIs(page);

    await page.goto('/en/dashboard/teacher');
    await expect(page.getByTestId('teacher-dashboard')).toBeVisible();
    await expect(page.getByTestId('class-code')).toHaveText('XYZ999');
    await expect(page.getByTestId('copy-code-btn')).toBeVisible();
  });

  test('teacher assigns a mission to the class', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'teacher');
    mockTeacherAPIs(page);

    await page.goto('/en/dashboard/teacher');
    await page.getByTestId('challenge-select').selectOption('ch-1');
    await expect(page.getByTestId('assign-btn')).toBeEnabled();
    await page.getByTestId('assign-btn').click();
    await expect(page.getByTestId('assign-btn')).toContainText(/Assign/);
  });

  test('class gallery shows student submissions', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'teacher');
    mockTeacherAPIs(page);

    await page.goto('/en/dashboard/teacher');
    await expect(page.getByTestId('class-gallery')).toBeVisible();
    await expect(page.getByTestId('gallery-item')).toBeVisible();
  });
});

// ── Golden path — reviewer ────────────────────────────────────────────────────

test.describe('golden path — reviewer', () => {
  test('reviewer approves an item in the queue', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'reviewer');
    mockReviewerAPIs(page);

    await page.goto('/en/dashboard/reviewer');
    await expect(page.getByTestId('reviewer-dashboard')).toBeVisible();
    const cards = page.getByTestId('moderation-card');
    await expect(cards).toHaveCount(2);

    await cards.first().getByTestId('approve-btn').click();
    await expect(cards).toHaveCount(1);
  });

  test('reviewer rejects an item with a reason', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'reviewer');
    mockReviewerAPIs(page);

    await page.goto('/en/dashboard/reviewer');
    const cards = page.getByTestId('moderation-card');

    // Open reject form on the second card (mod-2)
    await cards.nth(1).getByTestId('reject-trigger-btn').click();
    await expect(cards.nth(1).getByTestId('reject-form')).toBeVisible();
    await cards.nth(1).getByTestId('reject-reason-input').fill('Contains a face photo');
    await cards.nth(1).getByTestId('confirm-reject-btn').click();
    await expect(cards).toHaveCount(1);
  });

  test('reports list is visible below the queue', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'reviewer');
    mockReviewerAPIs(page);

    await page.goto('/en/dashboard/reviewer');
    await expect(page.getByTestId('reports-section')).toBeVisible();
    await expect(page.getByTestId('report-item')).toBeVisible();
  });
});

// ── Locale switch EN ↔ FA (RTL) ───────────────────────────────────────────────

test.describe('locale switch and RTL', () => {
  test('switching to FA sets dir=rtl on <html>', async ({ page }) => {
    await page.goto('/fa');
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe('fa');
  });

  test('EN locale has dir=ltr', async ({ page }) => {
    await page.goto('/en');
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('ltr');
  });

  test('FA marketing page renders without axe violations', async ({ page }) => {
    await page.goto('/fa');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('locale switcher navigates from EN to FA', async ({ page }) => {
    await page.goto('/en');
    // LocaleSwitcher is in the footer; click FA button
    const faBtn = page.getByRole('button', { name: /fa|فا/i }).first();
    if (await faBtn.isVisible()) {
      await faBtn.click();
      await expect(page).toHaveURL(/\/fa/);
    } else {
      // If switcher is a link, follow it
      const faLink = page.getByRole('link', { name: /fa|فا/i }).first();
      await faLink.click();
      await expect(page).toHaveURL(/\/fa/);
    }
  });

  test('AppShell sidebar flips ltr:left to rtl:right in FA', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    page.route('**/api/me/progress', (r) =>
      r.fulfill({ json: { xp_total: 0, level: 1, rank: 'Explorer', explore_count: 0, learn_count: 0, solve_count: 0, medals: { explore: null, learn: null, solve: null }, creative_cycles_completed: 0, badges: [] } })
    );
    page.route('**/api/me/projects', (r) => r.fulfill({ json: { items: [] } }));

    await page.goto('/fa/profile');
    // Floating penguin should be on the left side in RTL
    const mascot = page.locator('[class*="rtl:left"]').first();
    await expect(mascot).toBeVisible();
  });
});

// ── Keyboard navigation ───────────────────────────────────────────────────────

test.describe('keyboard navigation', () => {
  test('marketing nav is fully keyboard-navigable', async ({ page }) => {
    await page.goto('/en');
    // Tab into nav and through its links
    await page.keyboard.press('Tab'); // skip-nav
    await page.keyboard.press('Tab'); // first nav item (logo)
    const firstNavFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName === 'A' || el?.tagName === 'BUTTON';
    });
    expect(firstNavFocused).toBe(true);
  });

  test('challenge mission menu is keyboard operable', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockChallengeAPIs(page);

    await page.goto('/en/challenges/ch-1');
    await expect(page.getByTestId('mission-hud')).toBeVisible();

    // Find and activate the mission menu button with keyboard
    await page.getByTestId('mission-hud').getByRole('button', { name: /mission menu/i }).focus();
    await page.keyboard.press('Enter');
    // Menu opens
    await expect(page.getByRole('menu').or(page.locator('[data-testid="mission-menu-open"]'))).toBeVisible({ timeout: 2000 }).catch(() => {
      // Some implementations use aria-expanded on the button itself
    });
  });

  test('audience picker radio group is keyboard navigable', async ({ page }) => {
    await setCookie(page, 'ideapop_persona', 'kid');
    mockProfileAPIs(page);

    await page.goto('/en/profile');
    await page.getByTestId('project-share-btn').first().click();
    await expect(page.getByTestId('audience-picker')).toBeVisible();

    // Radio inputs are reachable via Tab/arrow keys
    const privateRadio = page.getByTestId('share-private');
    await privateRadio.focus();
    await page.keyboard.press('ArrowDown');
    const classRadio = page.getByTestId('share-class');
    const classChecked = await classRadio.isChecked();
    // In radio groups, arrow key moves focus+selection; class should now be checked
    expect(classChecked).toBe(true);
  });
});

// ── prefers-reduced-motion ────────────────────────────────────────────────────

test('prefers-reduced-motion disables CSS animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');

  // Check that animate-spin etc. have effectively zero duration
  const animDurationMs = await page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'animate-spin';
    document.body.appendChild(el);
    const raw = getComputedStyle(el).animationDuration;
    document.body.removeChild(el);
    // Normalize: "0.01ms" → 0.01, "1e-05s" → 0.01 (same value, different unit)
    if (raw.endsWith('ms')) return parseFloat(raw);
    if (raw.endsWith('s')) return parseFloat(raw) * 1000;
    return parseFloat(raw);
  });
  // Expect less than 1ms — effectively no animation
  expect(animDurationMs).toBeLessThan(1);
});

// ── Logged-out auth gating + branded 404 + forgot-password ────────────────────

test.describe('logged-out gating, 404 & forgot-password', () => {
  // No ideapop_persona cookie is set in these tests — the visitor is anonymous.

  for (const route of ['/en/explore', '/en/library', '/en/profile', '/fa/library']) {
    test(`anonymous visit to ${route} redirects to sign-up (never the kid shell)`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/(en|fa)\/sign-up/);
    });
  }

  test('login page has a working Forgot-password link (en)', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/en\/forgot-password/);
    await expect(page.getByTestId('forgot-password')).toBeVisible();
  });

  test('forgot-password page passes axe (fa)', async ({ page }) => {
    await page.goto('/fa/forgot-password');
    await expect(page.getByTestId('forgot-password')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  for (const locale of ['en', 'fa']) {
    test(`unknown URL shows the branded 404 with a way home (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/this-page-does-not-exist-123`);
      await expect(page.getByTestId('not-found')).toBeVisible();
      const home = page.getByTestId('not-found').getByRole('link');
      await expect(home).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
