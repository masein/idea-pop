# Idea Pop

A web learning platform for kids 8+ and teens — **Explore** (nature videos),
**Library** (expert courses & makes), and **Challenge** (8-step real-world missions).
Brand line: *"Ask nature. Build with your hands."*

This repository is the full-stack implementation. See **`../Idea-Pop-Dev-Roadmap.md`**
for the engineering plan and **`../Idea-Pop-ClaudeCode-Prompts.md`** for the
step-by-step build prompts. Conventions for contributors (and Claude Code) live in
**`CLAUDE.md`**.

## Stack

- **Backend:** Rust · Axum · SQLx · PostgreSQL (Cargo workspace: `domain` / `infra` / `api` / `server`)
- **Frontend:** Next.js (App Router) · TypeScript · Tailwind CSS
- **Infra:** Docker Compose (dev) · GitHub Actions CI · VPS deploy · MinIO (photos) · MailHog (email, dev)

## Quickstart

Prerequisites: Docker + Docker Compose. (For local non-Docker dev: Rust stable, Node 20+, and optionally [`just`](https://github.com/casey/just).)

```bash
cp .env.example .env
docker compose up --build
```

Then:

- API health: http://localhost:8080/health
- Frontend: http://localhost:3000
- Adminer (DB UI): http://localhost:8081
- MailHog (email): http://localhost:8025
- MinIO console: http://localhost:9001

## Local development (without Docker)

```bash
# Backend
cd backend
cargo run --bin idea-pop-server      # serves on :8080

# Frontend (new terminal)
cd frontend
npm install
npm run dev                          # serves on :3000
```

## Common commands (via just)

```bash
just up        # full dev stack
just check     # everything CI runs (backend lint+test, frontend lint+typecheck)
just be-test   # cargo test
just fe-lint   # next lint + tsc
```

## Project layout

```
backend/    Rust workspace (domain / infra / api / server) + migrations
frontend/   Next.js app (App Router) + Tailwind tokens
docs/        architecture & design-tokens notes
.github/     CI workflows
```

## Status

**Phase 0 (foundation) scaffold.** Workspace builds, `/health` + `/readyz` endpoints,
Next.js landing stub with design tokens wired, Docker Compose, and CI (fmt/clippy/test
+ lint/typecheck/build). Next up: **Phase 1** — database, migrations, OpenAPI, and the
integration-test harness (prompt `P1`).
