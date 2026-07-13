# Idea Pop — Operations Runbook

## Table of contents
1. [Service overview](#1-service-overview)
2. [Starting and stopping](#2-starting-and-stopping)
3. [Health checks](#3-health-checks)
4. [Structured logs](#4-structured-logs)
5. [Metrics and dashboards](#5-metrics-and-dashboards)
6. [Backup and restore](#6-backup-and-restore)
7. [Load testing](#7-load-testing)
8. [Common incidents](#8-common-incidents)

---

## 1. Service overview

| Service | Port | Purpose |
|---------|------|---------|
| `idea-pop-server` | 8080 | Axum REST API |
| `postgres` | 5432 | Primary database |
| `prometheus` | 9090 | Metrics scraper |
| `grafana` | 3001 | Dashboards |
| `mailhog` | 8025 | Dev email UI |
| `minio` | 9001 | Object storage console |

---

## 2. Starting and stopping

```bash
# Full dev stack
docker compose up

# Just the backend services (no frontend)
docker compose up postgres mailhog minio idea-pop-server

# Restart a single service
docker compose restart idea-pop-server

# Tail logs
docker compose logs -f idea-pop-server
```

---

## 3. Health checks

```bash
# Liveness (always returns 200 if the process is up)
curl http://localhost:8080/health

# Readiness (returns 200 once fully ready)
curl http://localhost:8080/readyz
```

Expected response for `/health`:
```json
{ "status": "ok", "service": "idea-pop-api" }
```

---

## 4. Structured logs

The server emits **JSON structured logs** by default. Each log line contains:

| Field | Description |
|-------|-------------|
| `timestamp` | RFC 3339 timestamp |
| `level` | `INFO`, `WARN`, `ERROR`, `DEBUG` |
| `target` | Rust module path |
| `message` | Human-readable message |
| `request_id` | `x-request-id` propagated from the request |

### Switching to human-readable format (local dev)

```bash
LOG_FORMAT=text cargo run -p idea-pop-server
```

### Log levels

```bash
RUST_LOG=debug docker compose up idea-pop-server   # verbose
RUST_LOG=warn  docker compose up idea-pop-server   # errors and warnings only
```

### Searching logs

```bash
# All errors in the last hour
docker compose logs idea-pop-server --since 1h | jq 'select(.level == "ERROR")'

# Requests for a specific request-id
docker compose logs idea-pop-server | jq 'select(.request_id == "abc-123")'

# Failed auth attempts
docker compose logs idea-pop-server | jq 'select(.message | contains("invalid-token"))'
```

---

## 5. Metrics and dashboards

### Prometheus endpoint

```bash
curl http://localhost:8080/metrics
```

Key metrics exposed:

| Metric | Type | Labels |
|--------|------|--------|
| `http_requests_total` | Counter | `method`, `path`, `status` |
| `http_request_duration_seconds` | Histogram | `method`, `path`, `status` |

### Prometheus scrape config

`docker/prometheus.yml` is mounted into the Prometheus container and scrapes
`http://idea-pop-server:8080/metrics` every 15 seconds.

### Grafana dashboards

Open http://localhost:3001 (admin / admin).

Pre-built dashboards:

- **Idea Pop Overview** — request rate, p95 latency, 5xx rate
- **Auth Events** — login rate, 401/403 distribution

### Alert rules (in `docker/prometheus_rules.yml`)

| Alert | Condition | Severity |
|-------|-----------|----------|
| `HighErrorRate` | 5xx rate > 1 % over 5 min | warning |
| `HighP95Latency` | p95 > 2 s over 10 min | warning |
| `APIDown` | `/health` fails for 1 min | critical |

---

## 6. Backup and restore

### Automated backup drill

Run the backup drill script to verify that the database can be dumped and
restored successfully:

```bash
DATABASE_URL=postgres://ideapop:ideapop@localhost:5432/ideapop \
  bash scripts/backup_restore_drill.sh
```

Expected output:

```
=== Idea Pop Backup & Restore Drill ===
  Source DB : localhost:5432/ideapop
  Backup    : /tmp/ideapop_backups/ideapop_20260627_120000.sql
  Restore DB: ideapop_restore_drill

[1/5] Dumping database...
      Dump complete: 48K
[2/5] Creating restore database 'ideapop_restore_drill'...
      Done.
[3/5] Restoring dump into 'ideapop_restore_drill'...
      Restore complete.
[4/5] Running smoke tests...
accounts:3
children:5
challenges:4
migrations:9
smoke:OK
[5/5] Dropping restore database...

=== RESULT: PASS ===
  Backup file retained at: /tmp/ideapop_backups/ideapop_20260627_120000.sql
  Drill timestamp: 20260627_120000
```

### Manual backup (production)

```bash
# Full dump (compressed)
pg_dump "$DATABASE_URL" -Fc -f backup_$(date +%Y%m%d).dump

# Restore from compressed dump
pg_restore -d "$RESTORE_DATABASE_URL" backup_20260627.dump
```

### Backup retention policy

| Retention | Frequency |
|-----------|-----------|
| Daily     | Keep 7    |
| Weekly    | Keep 4    |
| Monthly   | Keep 12   |

### Drill schedule

Run `scripts/backup_restore_drill.sh` **at least once per month** and record the
result in the table below.

| Date | Operator | Result | Backup size | Restore time |
|------|----------|--------|-------------|--------------|
| 2026-06-27 | Claude Code | PASS | ~48 KB (dev/empty) | < 2 s |

---

## 7. Load testing

### Prerequisites

Install [k6](https://k6.io/docs/getting-started/installation/):

```bash
brew install k6          # macOS
# or: https://k6.io/docs/getting-started/installation/
```

### Running the smoke load test

Ensure the full Docker Compose stack is running, then:

```bash
BASE_URL=http://localhost:8080 k6 run backend/load/k6_smoke.js
```

### Thresholds

| Metric | Threshold |
|--------|-----------|
| `http_req_duration` p95 | < 500 ms |
| `http_req_failed` rate | < 1 % |
| `content_latency_ms` p95 | < 300 ms |
| `auth_latency_ms` p95 | < 400 ms |

### Baseline results (2026-06-27, local Docker Compose)

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `GET /health` | ~2 ms | ~5 ms | ~10 ms |
| `GET /explore` | ~8 ms | ~25 ms | ~50 ms |
| `GET /challenges` | ~6 ms | ~20 ms | ~40 ms |
| `GET /me` | ~5 ms | ~18 ms | ~35 ms |

> **Note:** Baseline is with an empty database and no CDN. Production numbers
> will differ based on data volume and infrastructure.

---

## 8. Common incidents

### API returning 5xx

1. Check `/health` and `/readyz` — if they fail, the process may be crashed.
2. `docker compose logs idea-pop-server | jq 'select(.level == "ERROR")'`
3. If database connection errors appear, check Postgres health:
   `docker compose exec postgres pg_isready -U ideapop`
4. Restart if necessary: `docker compose restart idea-pop-server`

### Authentication failures spike

1. Check rate-limiter is not misconfigured: `AUTH_RATE_LIMIT_RPM` env var.
2. Check for clock skew between API server and JWT issuers (JWT exp vs now).
3. `docker compose logs idea-pop-server | jq 'select(.message | contains("invalid-token"))'`

### Database out of disk

1. `docker compose exec postgres psql -U ideapop -c "SELECT pg_size_pretty(pg_database_size('ideapop'))"`
2. Run a backup immediately, then investigate large tables.

### Consent gate failing open

If the consent gate unexpectedly passes RESTRICTED children through:
1. Check `consent_gate` middleware logs for errors.
2. Verify `parental_consents` table: `SELECT status, COUNT(*) FROM parental_consents GROUP BY status`
3. The gate fails OPEN (allows through) on internal errors to avoid lockouts — this
   is intentional for availability. Investigate the underlying error.

---

## 9. AI unit + mission helper go-live

### 9.1 Seeding / updating the AI missions (prod-safe)

`seed_challenges()` upserts by slug (`ON CONFLICT (slug) DO UPDATE`), so re-running the seed
**updates existing challenge rows in place** to the current authored content. Row ids never
change, so FK references (`projects`, `challenge_attempts`, `challenge_ideas`,
`help_messages`) are unaffected. **Never DELETE challenge rows on prod** — all three child
tables cascade on delete.

Run against production (operator only — needs the prod `DATABASE_URL`):

```bash
export DATABASE_URL="postgres://…production…"

# 1. All migrations, including 20260708000013_mission_helper
(cd backend && sqlx migrate run --source migrations)

# 2. Seed/refresh reference content (idempotent; challenges upsert by slug)
(cd backend && cargo run --release -p idea-pop-server --bin seed)
```

Expected output includes `challenges seeded (6 entries)`. Verify:

```sql
SELECT slug, season, week_number, is_premium,
       jsonb_array_length(steps) AS steps
FROM challenges ORDER BY season, week_number;
-- 6 rows; weeks 3-6 are the AI missions, is_premium = f, 8 steps each
```

### 9.2 Mission-helper configuration

| Variable | Where | Default | Meaning |
|----------|-------|---------|---------|
| `MISSION_HELPER_ENABLED` | server runtime | `false` | Master switch. `false` → helper route 404s (dark). |
| `METIS_API_KEY` | server runtime | *(none — secret)* | Metis AI key. Without it the helper stays off even if enabled. |
| `METIS_BASE_URL` | server runtime | `https://api.metisai.ir/openai/v1` | OpenAI-compatible base URL. |
| `METIS_MODEL` | server runtime | `gpt-4o-mini` | Chat + moderation-classification model. |
| `HELPER_HOURLY_LIMIT` | server runtime | `10` | Per-child exchanges per hour (blocked ones count). |
| `HELP_MESSAGE_RETENTION_DAYS` | server runtime | *(unset = keep forever)* | Daily purge of transcripts older than N days. |
| `NEXT_PUBLIC_MISSION_HELPER` | **frontend build** | unset (`false`) | Renders the helper UI. Baked in at `next build` — rebuild to change. |

Even with every flag on, a child can use the helper only when BOTH hold:
consent is `granted`/`class_granted` **and** the parent flipped the per-child
"AI mission helper" toggle (off by default) in the parent dashboard.

Retention can also run from cron instead of the built-in daily task:

```sql
DELETE FROM help_messages WHERE created_at < now() - interval '90 days';
```

### 9.3 Staging first (no legal sign-off needed)

The helper can be exercised end-to-end in a **non-kid staging/preview
environment** now: set the four server vars + rebuild the frontend with
`NEXT_PUBLIC_MISSION_HELPER=true` on staging only, using test accounts.
That validates Metis connectivity, moderation, logging, and the review
feeds without exposing anything to children. Keep every flag **off in the
production-for-kids environment** until the Metis data-retention terms are
confirmed and the privacy policy is published (see
`docs/privacy-mission-helper-draft.md`).

### 9.4 Enabling on the Docker Compose stack

Compose substitutes the helper variables from the **untracked root `.env`**
into the backend service environment and the frontend build args
(`docker-compose.yml` passes them as `${VAR:-…}` with dark defaults). Empty
values count as unset, so a bare `.env.example` copy stays dark.

1. In the repo-root `.env` (never a tracked file), set:

   ```bash
   MISSION_HELPER_ENABLED=true
   METIS_API_KEY=…                 # real secret, server-side only
   NEXT_PUBLIC_MISSION_HELPER=true # frontend BUILD arg — needs a rebuild
   # optional: METIS_BASE_URL / METIS_MODEL / HELPER_HOURLY_LIMIT /
   #           HELP_MESSAGE_RETENTION_DAYS (see the table in §9.2)
   ```

2. Rebuild + recreate both services (`--build` is required —
   `NEXT_PUBLIC_MISSION_HELPER` is baked into the frontend image at
   `next build`; the backend just needs a recreate to pick up env):

   ```bash
   docker compose up -d --build backend frontend
   ```

3. Verify: backend logs show `mission helper enabled (model …)`
   (`docker compose logs backend | grep "mission helper"`), and the
   mission player renders the helper UI. To go dark again, unset the
   flags (or set them to `false`) and run the same `up -d --build`.

## 10. Server deploy from the private registry

The production server has **no general internet egress** — it can reach only the
operator and our registry (`docker.netixsystem.com`). Everything it runs must
therefore be pulled from that registry (including postgres), described by
`docker-compose.prod.yml` + a server-side `.env` (see `.env.prod.example`).
The registry accepts anonymous push/pull today; if that changes, run
`docker login docker.netixsystem.com` first.

### 10.1 Build & push images (operator machine)

The server is x86_64, so build with `--platform linux/amd64` (on Apple Silicon
this uses Rosetta/QEMU emulation — the Rust build is slow but works). If buildx
complains about the driver, run `docker buildx create --use` once.

```bash
# Mirror postgres into our registry (server can't reach docker.io)
docker pull --platform linux/amd64 postgres:16-alpine
docker tag postgres:16-alpine docker.netixsystem.com/postgres:16-alpine
docker push docker.netixsystem.com/postgres:16-alpine

# Backend (also ships the `seed` binary)
docker buildx build --platform linux/amd64 \
  -t docker.netixsystem.com/idea-pop-backend:latest --push ./backend

# Frontend — build args are BAKED at next build:
#   API_URL must stay http://backend:8080 (the compose service name);
#   NEXT_PUBLIC_MISSION_HELPER stays false on for-kids prod (§9.3).
docker buildx build --platform linux/amd64 \
  --build-arg API_URL=http://backend:8080 \
  --build-arg NEXT_PUBLIC_MISSION_HELPER=false \
  -t docker.netixsystem.com/idea-pop-frontend:latest --push ./frontend
```

For reproducible deploys, additionally tag with the git sha
(`-t …:sha-$(git rev-parse --short HEAD)`) and pin `BACKEND_IMAGE` /
`FRONTEND_IMAGE` in the server `.env`.

### 10.2 One-time server setup

```bash
ssh root@<server> 'mkdir -p /opt/idea-pop'
scp docker-compose.prod.yml root@<server>:/opt/idea-pop/docker-compose.yml

# Generate secrets ON the server — they never touch the repo or the operator disk.
ssh root@<server> 'cd /opt/idea-pop && umask 177 && printf "DB_PASSWORD=%s\nJWT_SECRET=%s\nWEB_PORT=80\nAPP_URL=http://<server>\n" "$(openssl rand -hex 16)" "$(openssl rand -hex 32)" > .env'
```

### 10.3 Deploy / update (every release)

```bash
ssh root@<server> 'cd /opt/idea-pop && docker compose pull && docker compose up -d'
```

### 10.4 First-boot seed + verify

Migrations run automatically at backend boot (`RUN_MIGRATIONS=true`). Seed the
reference content once (idempotent — challenges upsert by slug, §9.1):

```bash
ssh root@<server> 'cd /opt/idea-pop && docker compose exec -T backend seed'
curl -s -o /dev/null -w '%{http_code}\n' http://<server>/en    # expect 200
```

Only the frontend port is published; postgres and the backend are reachable
solely on the compose network (the frontend rewrites `/api/*` server-side).
`COOKIE_SECURE` stays `false` while the app is served over plain HTTP on an
IP; set it to `true` when TLS lands.
