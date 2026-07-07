# Idea Pop — session handoff prompt

Paste everything below into a fresh Claude Code session to continue this work.

---

You are continuing a redesign-and-back-with-real-data initiative on **Idea Pop**, a
kids' (8+) learning platform. Read `CLAUDE.md` at the repo root first — it has the
product rules, design tokens, and git workflow. Then read this whole prompt before
touching anything.

## Repo & stack
- Repo: `/Users/masein/Developer/Idea pop/idea-pop` — GitHub `masein/idea-pop`.
- Frontend: Next.js (App Router) + TypeScript + Tailwind + next-intl (EN + FA/RTL).
  In `frontend/`.
- Backend: Rust + Axum + SQLx + Postgres, Cargo workspace `crates/{domain,infra,api,server}`.
  In `backend/`.
- CI (GitHub Actions): jobs = backend, frontend, e2e, lighthouse, secrets-scan, supply-chain.

## The initiative (what we've been doing)
Redesigning every screen to the Figma design **one screen per PR**, and — when a
screen needs data the API doesn't have — building the backend for it too. The user
provides Figma screenshots per screen. Work is small, verified PRs merged to `main`.

### Already done & merged (do NOT redo)
- Marketing: landing, exploring, for-teachers, pricing, public challenge page.
- Kid screens: `/profile`, in-app `/explore`, Library index + course-detail, in-app
  Challenges list (`/challenges` branches on the `ideapop_persona` cookie: signed-in
  kids get the in-app list, others get the marketing page).
- Sign-up persona-select + kid onboarding; teacher dashboard; **parent dashboard**.
- **AppShell sidebar** redesigned + persona-aware (kid/parent/teacher nav derived from
  pathname; avatar+nickname header; Account item; Upgrade card; floating section circle;
  no Themes bar). Keep `#main-content` and the `rtl:left` penguin (skip-nav / FA-flip tests).
- 3D avatar art wired (`public/kid/avatars/*`), explore category art, challenge cover.
- Backend: studio `course_count` + course meta (difficulty/age_min/materials) + seeded
  "Let's Learn about AI" course; **challenge premium gating** (`is_premium` + computed
  `locked` from the caller's subscription); **`GET /parent/children` + `/parent/children/{id}/report`**
  (were frontend-only types with no backend — now real); **`/me` returns email + display_name**
  (accounts.display_name migration; register stores it).

### Remaining work (the ask)
1. **PR3 — Email preferences.** New `email_preferences` table + `GET`/`PUT`
   `/account/email-preferences` (marketing / new-content / activity-reports booleans).
   Wire the parent dashboard's "Email settings" checkboxes (currently UI-only, non-persisted)
   in `frontend/src/app/[locale]/(app)/dashboard/parent/page.tsx`.
2. **PR4 — "Needs your OK" approval queue + per-child display mode.** A parent-facing
   queue of pending items (child premium-unlock requests, shared posts awaiting parent
   review) with approve/dismiss, plus a per-child `display_mode`
   (`avatar_nickname | first_name | anonymous`) returned on `/parent/children` and set via
   an endpoint — wire the "Show my child as" select and the "Needs your OK" section.
   This is the biggest remaining piece; scope it as its own PR.

### Deferred / known placeholders (mention, don't silently skip)
- Parent report: `project_photo_url` returns null (needs S3 presigned URLs) and
  `challenge_title` is null (needs a join). See `backend/crates/api/src/parent.rs`.
- Asset exports still needed from the user (Figma): Library quick-make/course/instructor
  photos + studio icons; Ideas-Wall rank pills need a `rank` field. Design assets the user
  has dropped live in `/Users/masein/Downloads/idea-pop-assets/` (subfolders: `kid screen`,
  `explore`, `challenge`, `sign-up`, `landing`, `for-teachers`, `method`).

## How to work (match this exactly)
- **Git:** branch off `main` (`feat/…` or `fix/…`), small commits, never commit to `main`.
  Open a PR, watch CI, merge (squash, delete branch), then confirm the **post-merge** run on
  `main` is green. Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Frontend gate:** in `frontend/`: `npm run lint && npm run typecheck && npm run build && npm test`.
- **E2E (CI-scoped):** only `tests/e2e/phase13a.spec.ts` runs in CI. It axe-gates
  `/en`, `/en/sign-up`, `/en/pricing`, `/en/explore`, `/en/library`, `/en/challenges`,
  `/en/profile`, `/en/dashboard/{teacher,parent,reviewer}`. Add an axe test for any new
  gated page. Preserve every `data-testid` the golden-path tests use.
- **Backend gate:** in `backend/`: `cargo fmt --all -- --check && cargo clippy --all-targets -- -D warnings && cargo test --all` (tests use testcontainers → Docker must be running).

## Backend DB / SQLx (important)
- CI compiles with `SQLX_OFFLINE=true` against the committed `backend/.sqlx` cache.
- Port 5432 is taken by another project. Bring up a dedicated Postgres on **5433**:
  ```
  docker run -d --name idea-pop-sqlx-db -e POSTGRES_USER=ideapop -e POSTGRES_PASSWORD=ideapop \
    -e POSTGRES_DB=ideapop -p 5433:5432 postgres:16-alpine
  export DATABASE_URL="postgres://ideapop:ideapop@localhost:5433/ideapop"
  (cd backend && sqlx migrate run --source migrations)
  ```
- Two query styles: `content_repo`/`account_repo` use the **`query!` macro** → after changing
  their SQL you must `cargo sqlx prepare --workspace` against the live DB and commit `.sqlx`.
  `challenge_repo`, `parent.rs`, `me.rs` use **runtime `sqlx::query`** → no cache needed
  (prefer this style for new self-contained handlers to avoid cache churn).
- Migrations are append-only + reversible (add a `-- To reverse:` comment). Update `seed.rs`
  for new seed data.

## Frontend API types (important)
- `frontend/src/lib/api/schema.d.ts` is the **source of truth the app compiles against** —
  hand-edit it to add new paths/DTOs. The generator (`packages/api-types`) hits a live
  server and errors on utoipa `$ref`s, so don't rely on it. `packages/api-types/openapi.json`
  is a **stale partial snapshot — leave it alone.**
- Client fns live in `frontend/src/lib/api/client.ts`.

## Gotchas
- **Lighthouse** is flaky: the image-heavy `/en` scores ~0.44–0.54 (single run) around the
  perf floor, now set to **0.4** in `frontend/lighthouserc.json`. If it reddens `main` and you
  didn't touch the landing, `gh run rerun <id> --failed`.
- **Local phase13a golden-path** tests time out (dev-server on-demand compile); they pass in CI.
  Verify locally with subsets, e.g. `npx playwright test phase13a.spec.ts --project=tablet-chrome -g "axe|golden path — parent" --workers=1`.
- **Kids never check out** (product rule): the kid "Upgrade" hands off to a parent modal.
- Preview screenshots via a throwaway Playwright script with route mocks + the
  `ideapop_persona` cookie is the reliable way to visually verify app pages.

Start by reading `CLAUDE.md` and `backend/crates/api/src/parent.rs`, bring up the 5433 DB,
then implement **PR3 (email preferences)**.
