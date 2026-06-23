# Idea Pop — common dev commands. Run `just <task>`.

# Start the full dev stack (postgres, backend, frontend, mailhog, minio, adminer)
up:
    docker compose up --build

down:
    docker compose down

# ---- Backend ----
be-run:
    cd backend && cargo run --bin idea-pop-server

be-test:
    cd backend && cargo test --all

be-lint:
    cd backend && cargo fmt --all -- --check && cargo clippy --all-targets -- -D warnings

be-fmt:
    cd backend && cargo fmt --all

# ---- Frontend ----
fe-dev:
    cd frontend && npm install && npm run dev

fe-build:
    cd frontend && npm run build

fe-lint:
    cd frontend && npm run lint && npm run typecheck

# Everything CI runs
check: be-lint be-test fe-lint
