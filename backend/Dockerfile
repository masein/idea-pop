# ---- builder ----
FROM rust:1-slim AS builder
# openssl-sys (via lettre's native-tls) needs the OpenSSL headers + pkg-config.
RUN apt-get update \
 && apt-get install -y --no-install-recommends pkg-config libssl-dev \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
# Hermetic build: compile against the committed .sqlx cache, never a live DB
# (a stray .env with DATABASE_URL would otherwise hijack the sqlx macros).
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin idea-pop-server

# ---- runtime ----
FROM debian:stable-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates libssl3 \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --user-group app
COPY --from=builder /app/target/release/idea-pop-server /usr/local/bin/idea-pop-server
USER app
ENV APP_PORT=8080
EXPOSE 8080
CMD ["idea-pop-server"]
