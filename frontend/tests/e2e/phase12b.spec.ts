import { test, expect, type Page } from '@playwright/test';

// ── Mock helpers ──────────────────────────────────────────────────────────────

function mockParentAPIs(page: Page) {
  page.route('**/api/parent/children', (route) =>
    route.fulfill({
      json: [
        {
          id: 'child-1',
          nickname: 'Pixel',
          avatar_id: 'penguin',
          birth_year: 2015,
          level: 3,
          total_xp: 120,
          consent_granted: true,
          class_sharing_enabled: true,
          public_sharing_enabled: false,
        },
      ],
    })
  );
  page.route('**/billing/subscription', (route) =>
    route.fulfill({ json: { is_premium: false, plan: null, current_period_end: null } })
  );
}

function mockParentReport(page: Page) {
  page.route('**/api/parent/children/child-1/report', (route) =>
    route.fulfill({
      json: {
        explore_videos_watched: 4,
        lessons_completed: 2,
        challenges_completed: 1,
        xp_earned: 75,
        projects: [{ id: 'p1', title: 'My Robot', visibility: 'private' }],
      },
    })
  );
}

function mockTeacherAPIs(page: Page) {
  page.route('**/api/teacher/class', (route) =>
    route.fulfill({
      json: {
        id: 'cls-1',
        name: 'Room 7',
        class_code: 'ABC123',
        student_count: 12,
        assigned_challenge_id: null,
        assigned_challenge_title: null,
      },
    })
  );
  page.route('**/api/challenges', (route) =>
    route.fulfill({
      json: [
        { id: 'ch-1', title: 'Build a bridge', emoji: '🌉', tools: [] },
        { id: 'ch-2', title: 'Design a shelter', emoji: '🏠', tools: [] },
      ],
    })
  );
  page.route('**/api/teacher/class/gallery', (route) =>
    route.fulfill({
      json: [
        { id: 'g1', project_title: "Pixel's bridge", student_nickname: 'Pixel' },
      ],
    })
  );
}

function mockReviewerAPIs(page: Page) {
  page.route('**/api/moderation/queue**', (route) =>
    route.fulfill({
      json: [
        {
          id: 'mod-1',
          type: 'project',
          content_id: 'p1',
          content_title: 'My Robot',
          content_photo_url: null,
          author_nickname: 'Pixel',
          submitted_at: '2026-06-20T10:00:00Z',
          status: 'pending',
          rejection_reason: null,
        },
        {
          id: 'mod-2',
          type: 'idea',
          content_id: 'i1',
          content_title: 'What if we used mushrooms?',
          content_photo_url: null,
          author_nickname: 'Starfire',
          submitted_at: '2026-06-21T08:30:00Z',
          status: 'pending',
          rejection_reason: null,
        },
      ],
    })
  );
  page.route('**/api/reports', (route) =>
    route.fulfill({
      json: [
        {
          id: 'r1',
          content_type: 'project',
          reason: 'Contains a face photo',
          created_at: '2026-06-22T09:00:00Z',
          resolved: false,
        },
      ],
    })
  );
}

function setCookie(page: Page, name: string, value: string) {
  return page.context().addCookies([
    { name, value, domain: 'localhost', path: '/' },
  ]);
}

// ── Parent tests ──────────────────────────────────────────────────────────────

test('parent dashboard — shows child list and billing section', async ({ page }) => {
  await setCookie(page, 'ideapop_persona', 'parent');
  mockParentAPIs(page);

  await page.goto('/en/dashboard/parent');
  await expect(page.getByTestId('parent-dashboard')).toBeVisible();
  await expect(page.getByTestId('child-card')).toBeVisible();
  await expect(page.getByText('Pixel')).toBeVisible();
  await expect(page.getByTestId('billing-section')).toBeVisible();
});

test('parent dashboard — views weekly report for child', async ({ page }) => {
  await setCookie(page, 'ideapop_persona', 'parent');
  mockParentAPIs(page);
  mockParentReport(page);

  await page.goto('/en/dashboard/parent');
  await page.getByTestId('view-report-btn').click();
  await expect(page.getByTestId('weekly-report-modal')).toBeVisible();
  await expect(page.getByTestId('report-stats')).toBeVisible();
  await expect(page.getByText('+75 XP earned this week')).toBeVisible();
});

test('parent dashboard — consent toggle re-restricts sharing', async ({ page }) => {
  await setCookie(page, 'ideapop_persona', 'parent');
  mockParentAPIs(page);
  page.route('**/api/consents/revoke', (route) => route.fulfill({ json: {} }));
  page.route('**/api/consents/grant', (route) => route.fulfill({ json: {} }));

  await page.goto('/en/dashboard/parent');
  const classToggle = page.getByTestId('toggle-class-sharing');
  // Initial state: class_sharing_enabled = true
  await expect(classToggle).toHaveAttribute('aria-checked', 'true');
  await classToggle.click();
  // After click (calls revokeConsent): optimistically set to false
  await expect(classToggle).toHaveAttribute('aria-checked', 'false');
});

test('parent dashboard — billing checkout buttons present when not premium', async ({ page }) => {
  await setCookie(page, 'ideapop_persona', 'parent');
  mockParentAPIs(page);

  await page.goto('/en/dashboard/parent');
  await expect(page.getByTestId('checkout-monthly-btn')).toBeVisible();
  await expect(page.getByTestId('checkout-annual-btn')).toBeVisible();
});

// ── Teacher tests ─────────────────────────────────────────────────────────────

test('teacher dashboard — shows class code and copy button', async ({ page }) => {
  await setCookie(page, 'ideapop_persona', 'teacher');
  mockTeacherAPIs(page);

  await page.goto('/en/dashboard/teacher');
  await expect(page.getByTestId('teacher-dashboard')).toBeVisible();
  await expect(page.getByTestId('class-code')).toHaveText('ABC123');
  await expect(page.getByTestId('copy-code-btn')).toBeVisible();
});

test('teacher dashboard — assigns mission to class', async ({ page }) => {
  await setCookie(page, 'ideapop_persona', 'teacher');
  mockTeacherAPIs(page);
  page.route('**/api/teacher/class/assign', (route) => route.fulfill({ json: {} }));

  await page.goto('/en/dashboard/teacher');
  await page.getByTestId('challenge-select').selectOption('ch-1');
  await expect(page.getByTestId('assign-btn')).toBeEnabled();
  await page.getByTestId('assign-btn').click();
  await expect(page.getByTestId('assign-btn')).toContainText('Assigned');
});

// ── Reviewer tests ────────────────────────────────────────────────────────────

test('reviewer dashboard — approves an item in moderation queue', async ({ page }) => {
  await setCookie(page, 'ideapop_persona', 'reviewer');
  mockReviewerAPIs(page);
  page.route('**/api/moderation/mod-1/approve', (route) => route.fulfill({ json: {} }));

  await page.goto('/en/dashboard/reviewer');
  await expect(page.getByTestId('reviewer-dashboard')).toBeVisible();
  const cards = page.getByTestId('moderation-card');
  await expect(cards).toHaveCount(2);

  // Approve the first item
  await cards.first().getByTestId('approve-btn').click();
  // Card disappears after approval
  await expect(cards).toHaveCount(1);
});

test('reviewer dashboard — rejects an item with a reason', async ({ page }) => {
  await setCookie(page, 'ideapop_persona', 'reviewer');
  mockReviewerAPIs(page);
  page.route('**/api/moderation/mod-1/reject', (route) => route.fulfill({ json: {} }));

  await page.goto('/en/dashboard/reviewer');
  const cards = page.getByTestId('moderation-card');

  await cards.first().getByTestId('reject-trigger-btn').click();
  await expect(cards.first().getByTestId('reject-form')).toBeVisible();

  await cards.first().getByTestId('reject-reason-input').fill('Contains a real face');
  await cards.first().getByTestId('confirm-reject-btn').click();
  // Card disappears after rejection
  await expect(cards).toHaveCount(1);
});

test('kid persona is redirected away from parent dashboard', async ({ page }) => {
  await setCookie(page, 'ideapop_persona', 'kid');

  await page.goto('/en/dashboard/parent');
  // Middleware redirects kids to /profile
  await expect(page).toHaveURL(/\/profile/);
});

test('no persona is redirected to sign-up from any management route', async ({ page }) => {
  // No cookie set
  await page.goto('/en/dashboard/parent');
  await expect(page).toHaveURL(/\/sign-up/);
});
