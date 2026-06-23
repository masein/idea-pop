//! Shared application state injected into every handler via Axum's `State`.

use std::sync::Arc;

use governor::{DefaultKeyedRateLimiter, Quota, RateLimiter};
use sqlx::PgPool;

use idea_pop_domain::{AccountRepo, AuthService, Clock, EmailSender, PasswordHasher, TokenIssuer};

pub type AuthRateLimiter = DefaultKeyedRateLimiter<std::net::IpAddr>;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub auth: Arc<AuthService>,
    pub tokens: Arc<dyn TokenIssuer>,
}

impl AppState {
    pub fn new(
        db: PgPool,
        repo: Arc<dyn AccountRepo>,
        hasher: Arc<dyn PasswordHasher>,
        tokens: Arc<dyn TokenIssuer>,
        email: Arc<dyn EmailSender>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        let auth = Arc::new(AuthService::new(repo, hasher, tokens.clone(), email, clock));
        Self { db, auth, tokens }
    }
}

pub fn create_auth_rate_limiter(requests_per_minute: u32) -> Arc<AuthRateLimiter> {
    use std::num::NonZeroU32;
    let quota = Quota::per_minute(
        NonZeroU32::new(requests_per_minute).unwrap_or(NonZeroU32::new(20).unwrap()),
    );
    Arc::new(RateLimiter::keyed(quota))
}
