//! Idea Pop API server — composition root.
//!
//! Loads configuration from the environment, initialises telemetry, wires the
//! database pool, optionally runs migrations, then serves until shutdown.

#![forbid(unsafe_code)]

use std::net::SocketAddr;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env file if present (dev convenience; a no-op in prod).
    dotenvy::dotenv().ok();

    init_tracing();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = sqlx::PgPool::connect(&database_url).await?;

    // Run migrations when RUN_MIGRATIONS=true (set this in Docker Compose /
    // deploy; CI runs them separately via cargo sqlx migrate run).
    if std::env::var("RUN_MIGRATIONS").as_deref() == Ok("true") {
        tracing::info!("running database migrations");
        sqlx::migrate!("../../migrations").run(&pool).await?;
        tracing::info!("migrations complete");
    }

    let app = api::router(pool);

    let port: u16 = std::env::var("APP_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("idea-pop api listening on http://{addr}");
    axum::serve(listener, app).await?;
    Ok(())
}

fn init_tracing() {
    use tracing_subscriber::{fmt, EnvFilter};
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    fmt().with_env_filter(filter).init();
}
