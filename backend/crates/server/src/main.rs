//! Idea Pop API server — composition root.
//!
//! Loads configuration from the environment, initialises telemetry, wires the
//! database pool, optionally runs migrations, then serves until shutdown.

#![forbid(unsafe_code)]

use std::{net::SocketAddr, sync::Arc};

use api::{create_auth_rate_limiter, router, AppState};
use idea_pop_infra::{
    Argon2Hasher, JwtTokenIssuer, LettreEmailSender, NullConsentEmailSender, NullEmailSender,
    SmtpConsentEmailSender, SqlxAccountRepo, SqlxChallengeRepo, SqlxChildRepo, SqlxClassRepo,
    SqlxConsentRepo, SqlxExploreRepo, SqlxLibraryRepo, SystemClock,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    init_tracing();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::PgPool::connect(&database_url).await?;

    if std::env::var("RUN_MIGRATIONS").as_deref() == Ok("true") {
        tracing::info!("running database migrations");
        sqlx::migrate!("../../migrations").run(&pool).await?;
        tracing::info!("migrations complete");
    }

    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let jwt_expiry: i64 = std::env::var("JWT_EXPIRY_SECS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(900);

    let from_email = std::env::var("FROM_EMAIL").unwrap_or_else(|_| "noreply@idea-pop.app".into());
    let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "http://localhost:3000".into());

    let email_sender: Arc<dyn idea_pop_domain::EmailSender> =
        if let Ok(smtp_host) = std::env::var("SMTP_HOST") {
            let smtp_port: u16 = std::env::var("SMTP_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1025);
            let smtp_user = std::env::var("SMTP_USER").ok();
            let smtp_pass = std::env::var("SMTP_PASS").ok();
            let sender = LettreEmailSender::new(
                &smtp_host,
                smtp_port,
                smtp_user,
                smtp_pass,
                from_email.clone(),
                app_url.clone(),
            )
            .expect("failed to build SMTP transport");
            Arc::new(sender)
        } else {
            tracing::warn!("SMTP_HOST not set; using null email sender (no emails will be sent)");
            Arc::new(NullEmailSender)
        };

    let consent_email_sender: Arc<dyn idea_pop_domain::ConsentEmailSender> =
        if let Ok(smtp_host) = std::env::var("SMTP_HOST") {
            let smtp_port: u16 = std::env::var("SMTP_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1025);
            Arc::new(SmtpConsentEmailSender::new(
                &smtp_host, smtp_port, from_email, app_url,
            ))
        } else {
            Arc::new(NullConsentEmailSender)
        };

    let state = AppState::new(
        pool.clone(),
        Arc::new(SqlxAccountRepo::new(pool.clone())),
        Arc::new(Argon2Hasher),
        Arc::new(JwtTokenIssuer::new(&jwt_secret, jwt_expiry)),
        email_sender,
        Arc::new(SystemClock),
        Arc::new(SqlxChildRepo::new(pool.clone())),
        Arc::new(SqlxConsentRepo::new(pool.clone())),
        Arc::new(SqlxClassRepo::new(pool.clone())),
        consent_email_sender,
        Arc::new(SqlxExploreRepo::new(pool.clone())),
        Arc::new(SqlxLibraryRepo::new(pool.clone())),
        Arc::new(SqlxChallengeRepo::new(pool)),
    );

    let auth_rpm: u32 = std::env::var("AUTH_RATE_LIMIT_RPM")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(20);
    let rate_limiter = create_auth_rate_limiter(auth_rpm);

    let app = router(state, Some(rate_limiter));

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
