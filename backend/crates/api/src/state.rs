//! Shared application state injected into every handler via Axum's `State`.

use std::sync::Arc;

use governor::{DefaultKeyedRateLimiter, Quota, RateLimiter};
use sqlx::PgPool;

use idea_pop_domain::{
    AccountRepo, AnalyticsSink, AuthService, BadgeRepo, ChallengeRepo, ChildRepo, ClassRepo, Clock,
    ConsentEmailSender, ConsentRepo, ConsentService, EmailSender, ExploreRepo, IdeaRepo,
    LibraryRepo, ModerationRepo, PasswordHasher, PaymentGateway, PhotoStore, ProgressRepo,
    ProjectRepo, ReportRepo, SubscriptionRepo, TokenIssuer, WebhookEventLog, XpRepo,
};

pub type AuthRateLimiter = DefaultKeyedRateLimiter<std::net::IpAddr>;

/// Groups the four gamification repos so AppState stays manageable.
#[derive(Clone)]
pub struct GamificationRepos {
    pub xp: Arc<dyn XpRepo>,
    pub progress: Arc<dyn ProgressRepo>,
    pub badges: Arc<dyn BadgeRepo>,
    pub analytics: Arc<dyn AnalyticsSink>,
}

/// Groups portfolio, sharing, moderation, and reporting repos.
#[derive(Clone)]
pub struct PortfolioRepos {
    pub projects: Arc<dyn ProjectRepo>,
    pub photos: Arc<dyn PhotoStore>,
    pub moderation: Arc<dyn ModerationRepo>,
    pub ideas: Arc<dyn IdeaRepo>,
    pub reports: Arc<dyn ReportRepo>,
}

/// Groups subscription repo, webhook log, and payment gateway.
#[derive(Clone)]
pub struct BillingRepos {
    pub subscriptions: Arc<dyn SubscriptionRepo>,
    pub webhook_log: Arc<dyn WebhookEventLog>,
    pub gateway: Arc<dyn PaymentGateway>,
}

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub auth: Arc<AuthService>,
    pub consent: Arc<ConsentService>,
    pub tokens: Arc<dyn TokenIssuer>,
    pub explore: Arc<dyn ExploreRepo>,
    pub library: Arc<dyn LibraryRepo>,
    pub challenge: Arc<dyn ChallengeRepo>,
    pub gamification: GamificationRepos,
    pub portfolio: PortfolioRepos,
    pub billing: BillingRepos,
}

impl AppState {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        db: PgPool,
        repo: Arc<dyn AccountRepo>,
        hasher: Arc<dyn PasswordHasher>,
        tokens: Arc<dyn TokenIssuer>,
        email: Arc<dyn EmailSender>,
        clock: Arc<dyn Clock>,
        child_repo: Arc<dyn ChildRepo>,
        consent_repo: Arc<dyn ConsentRepo>,
        class_repo: Arc<dyn ClassRepo>,
        consent_email: Arc<dyn ConsentEmailSender>,
        explore: Arc<dyn ExploreRepo>,
        library: Arc<dyn LibraryRepo>,
        challenge: Arc<dyn ChallengeRepo>,
        gamification: GamificationRepos,
        portfolio: PortfolioRepos,
        billing: BillingRepos,
    ) -> Self {
        let auth = Arc::new(AuthService::new(
            Arc::clone(&repo),
            Arc::clone(&hasher),
            Arc::clone(&tokens),
            Arc::clone(&email),
            Arc::clone(&clock),
        ));
        let consent = Arc::new(ConsentService::new(
            child_repo,
            consent_repo,
            class_repo,
            Arc::clone(&tokens),
            consent_email,
            Arc::clone(&clock),
        ));
        Self {
            db,
            auth,
            consent,
            tokens,
            explore,
            library,
            challenge,
            gamification,
            portfolio,
            billing,
        }
    }
}

pub fn create_auth_rate_limiter(requests_per_minute: u32) -> Arc<AuthRateLimiter> {
    use std::num::NonZeroU32;
    let quota = Quota::per_minute(
        NonZeroU32::new(requests_per_minute).unwrap_or(NonZeroU32::new(20).unwrap()),
    );
    Arc::new(RateLimiter::keyed(quota))
}
