//! Idea Pop API server — composition root.
//!
//! Loads configuration from the environment, initialises telemetry, wires the
//! database pool, optionally runs migrations, then serves until shutdown.

#![forbid(unsafe_code)]

use std::{net::SocketAddr, sync::Arc};

use api::{
    create_auth_rate_limiter, metrics_exporter_prometheus, router_with_metrics, AppState,
    BillingRepos, GamificationRepos, HelperConfig, PortfolioRepos,
};
use idea_pop_infra::{
    Argon2Hasher, JwtTokenIssuer, LettreEmailSender, MetisHelperProvider, NullConsentEmailSender,
    NullEmailSender, S3PhotoStore, SmtpConsentEmailSender, SqlxAccountRepo, SqlxAnalyticsSink,
    SqlxBadgeRepo, SqlxChallengeRepo, SqlxChildRepo, SqlxClassRepo, SqlxConsentRepo,
    SqlxExploreRepo, SqlxIdeaRepo, SqlxLibraryRepo, SqlxModerationRepo, SqlxProgressRepo,
    SqlxProjectRepo, SqlxReportRepo, SqlxSubscriptionRepo, SqlxWebhookEventLog, SqlxXpRepo,
    StripePaymentGateway, SystemClock,
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
                &smtp_host,
                smtp_port,
                from_email,
                app_url.clone(),
            ))
        } else {
            Arc::new(NullConsentEmailSender)
        };

    let s3_endpoint =
        std::env::var("S3_ENDPOINT").unwrap_or_else(|_| "http://localhost:9000".into());
    let s3_region = std::env::var("S3_REGION").unwrap_or_else(|_| "us-east-1".into());
    let s3_access_key = std::env::var("S3_ACCESS_KEY").unwrap_or_else(|_| "minioadmin".into());
    let s3_secret_key = std::env::var("S3_SECRET_KEY").unwrap_or_else(|_| "minioadmin".into());
    let s3_bucket = std::env::var("S3_BUCKET").unwrap_or_else(|_| "idea-pop".into());

    let portfolio = PortfolioRepos {
        projects: Arc::new(SqlxProjectRepo::new(pool.clone())),
        photos: Arc::new(S3PhotoStore::new(
            &s3_endpoint,
            &s3_region,
            &s3_access_key,
            &s3_secret_key,
            &s3_bucket,
        )),
        moderation: Arc::new(SqlxModerationRepo::new(pool.clone())),
        ideas: Arc::new(SqlxIdeaRepo::new(pool.clone())),
        reports: Arc::new(SqlxReportRepo::new(pool.clone())),
    };

    let stripe_secret =
        std::env::var("STRIPE_SECRET_KEY").unwrap_or_else(|_| "sk_test_placeholder".into());
    let stripe_webhook_secret =
        std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_else(|_| "whsec_placeholder".into());
    let stripe_price_monthly = std::env::var("STRIPE_PRICE_MONTHLY")
        .unwrap_or_else(|_| "price_placeholder_monthly".into());
    let stripe_price_annual =
        std::env::var("STRIPE_PRICE_ANNUAL").unwrap_or_else(|_| "price_placeholder_annual".into());
    let billing_success_url = format!("{app_url}/billing/success");
    let billing_cancel_url = format!("{app_url}/billing/cancel");
    let billing_return_url = format!("{app_url}/billing");

    let billing = BillingRepos {
        subscriptions: Arc::new(SqlxSubscriptionRepo::new(pool.clone())),
        webhook_log: Arc::new(SqlxWebhookEventLog::new(pool.clone())),
        gateway: Arc::new(StripePaymentGateway::new(
            stripe_secret,
            stripe_webhook_secret,
            stripe_price_monthly,
            stripe_price_annual,
            billing_success_url,
            billing_cancel_url,
            billing_return_url,
        )),
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
        Arc::new(SqlxChallengeRepo::new(pool.clone())),
        GamificationRepos {
            xp: Arc::new(SqlxXpRepo::new(pool.clone())),
            progress: Arc::new(SqlxProgressRepo::new(pool.clone())),
            badges: Arc::new(SqlxBadgeRepo::new(pool.clone())),
            analytics: Arc::new(SqlxAnalyticsSink::new(pool)),
        },
        portfolio,
        billing,
    );

    // Scoped AI mission helper — ships dark (MISSION_HELPER_ENABLED=false by
    // default). The Metis key is server-side only; without a key the flag
    // stays off regardless. Empty values count as unset: docker-compose
    // passes optional vars through as `${VAR:-}`, which arrives as "".
    let helper_enabled = std::env::var("MISSION_HELPER_ENABLED").as_deref() == Ok("true");
    let metis_key = non_empty_env("METIS_API_KEY");
    let state = match (helper_enabled, metis_key) {
        (true, Some(key)) => {
            let base_url = non_empty_env("METIS_BASE_URL")
                .unwrap_or_else(|| "https://api.metisai.ir/openai/v1".into());
            let model = non_empty_env("METIS_MODEL").unwrap_or_else(|| "gpt-4o-mini".into());
            let hourly_limit: i64 = non_empty_env("HELPER_HOURLY_LIMIT")
                .and_then(|v| v.parse().ok())
                .unwrap_or(10);
            tracing::info!("mission helper enabled (model {model})");
            state.with_mission_helper(
                Arc::new(MetisHelperProvider::new(base_url, key, model)),
                HelperConfig {
                    enabled: true,
                    hourly_limit,
                },
            )
        }
        (true, None) => {
            tracing::warn!(
                "MISSION_HELPER_ENABLED=true but METIS_API_KEY missing; helper stays off"
            );
            state
        }
        _ => state,
    };
    // Secure attribute on auth cookies — on in production (https), off for
    // plain-http local dev.
    let state = state.with_secure_cookies(std::env::var("COOKIE_SECURE").as_deref() == Ok("true"));

    // help_messages retention: with HELP_MESSAGE_RETENTION_DAYS set (> 0),
    // purge transcripts older than the window once a day. Unset → keep
    // forever (backward-safe); the same purge is runnable from cron as SQL.
    if let Some(days) = std::env::var("HELP_MESSAGE_RETENTION_DAYS")
        .ok()
        .and_then(|v| v.parse::<i64>().ok())
        .filter(|d| *d > 0)
    {
        let purge_pool = state.db.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(std::time::Duration::from_secs(24 * 60 * 60));
            loop {
                tick.tick().await;
                match api::purge_expired_help_messages(&purge_pool, days).await {
                    Ok(n) if n > 0 => {
                        tracing::info!("purged {n} help_messages older than {days} days");
                    }
                    Ok(_) => {}
                    Err(e) => tracing::error!("help_messages retention purge failed: {e}"),
                }
            }
        });
        tracing::info!("help_messages retention active: {days} days");
    }

    let auth_rpm: u32 = std::env::var("AUTH_RATE_LIMIT_RPM")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(20);
    let rate_limiter = create_auth_rate_limiter(auth_rpm);

    // Install the Prometheus recorder and expose /metrics.
    let metrics_handle = metrics_exporter_prometheus::PrometheusBuilder::new()
        .install_recorder()
        .expect("install prometheus recorder");

    let app = router_with_metrics(state, Some(rate_limiter), Some(metrics_handle));

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
    // Use JSON format in production; human-readable in local dev (LOG_FORMAT=text).
    if std::env::var("LOG_FORMAT").as_deref() == Ok("text") {
        fmt().with_env_filter(filter).init();
    } else {
        fmt()
            .json()
            .with_current_span(false)
            .with_span_list(false)
            .with_env_filter(filter)
            .init();
    }
}

/// Read an env var, treating empty/whitespace values as unset — optional vars
/// arrive as "" when compose substitutes `${VAR:-}` from an .env without them.
fn non_empty_env(name: &str) -> Option<String> {
    std::env::var(name).ok().filter(|v| !v.trim().is_empty())
}
