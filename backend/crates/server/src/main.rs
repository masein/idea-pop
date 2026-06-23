//! Idea Pop API server: the composition root. Wires configuration, telemetry,
//! and the HTTP router, then serves until shutdown.

#![forbid(unsafe_code)]

use std::net::SocketAddr;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let app = api::router();

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
