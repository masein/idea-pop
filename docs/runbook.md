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
