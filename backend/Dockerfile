# ---- builder ----
FROM rust:1-slim AS builder
WORKDIR /app
COPY . .
RUN cargo build --release --bin idea-pop-server

# ---- runtime ----
FROM debian:stable-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --user-group app
COPY --from=builder /app/target/release/idea-pop-server /usr/local/bin/idea-pop-server
USER app
ENV APP_PORT=8080
EXPOSE 8080
CMD ["idea-pop-server"]
