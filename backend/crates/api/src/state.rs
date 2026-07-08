//! Shared application state injected into every handler via Axum's `State`.

use std::sync::Arc;

use governor::{DefaultKeyedRateLimiter, Quota, RateLimiter};
use sqlx::PgPool;

use idea_pop_domain::{
    AccountRepo, AnalyticsSink, AuthService, BadgeRepo, ChallengeRepo, ChildRepo, ClassRepo, Clock,
    ConsentEmailSender, ConsentRepo, ConsentService, EmailSender, ExploreRepo, IdeaRepo,
    LibraryRepo, MissionHelperProvider, ModerationRepo, PasswordHasher, PaymentGateway, PhotoStore,
    ProgressRepo, ProjectRepo, ReportRepo, SubscriptionRepo, TokenIssuer, WebhookEventLog, XpRepo,
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

/// Runtime config for the scoped mission helper (AI-helper-spec.md).
/// `enabled` is the global dark-ship switch (MISSION_HELPER_ENABLED env);
/// the per-child opt-in lives on child_profiles.helper_enabled.
#[derive(Clone)]
pub struct HelperConfig {
    pub enabled: bool,
    /// Per-child hourly cap on helper exchanges.
    pub hourly_limit: i64,
}

impl Default for HelperConfig {
    fn default() -> Self {
        Self {
            enabled: false, // ships dark
            hourly_limit: 10,
        }
    }
}

/// A `MissionHelperProvider` that refuses everything — the safe default
/// wired by `AppState::new` so tests and non-helper deployments need no
/// provider at all (the feature-flag check rejects first anyway).
struct DisabledHelperProvider;

#[async_trait::async_trait]
impl MissionHelperProvider for DisabledHelperProvider {
    async fn answer(&self, _: &str, _: &str) -> Result<String, idea_pop_domain::DomainError> {
        Err(idea_pop_domain::DomainError::Internal(
            "mission helper provider not configured".into(),
        ))
    }
    async fn moderate(&self, _: &str) -> Result<bool, idea_pop_domain::DomainError> {
        Ok(false) // fail closed
    }
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
    pub helper: Arc<dyn MissionHelperProvider>,
    pub helper_config: HelperConfig,
    /// Adds `Secure` to auth cookies. Off by default so http://localhost dev
    /// works; MUST be on in production (COOKIE_SECURE=true).
    pub cookie_secure: bool,
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
            helper: Arc::new(DisabledHelperProvider),
            helper_config: HelperConfig::default(),
            cookie_secure: false,
        }
    }

    /// Attach a real mission-helper provider + config (builder-style so the
    /// many existing `AppState::new` call sites stay untouched).
    pub fn with_secure_cookies(mut self, secure: bool) -> Self {
        self.cookie_secure = secure;
        self
    }

    pub fn with_mission_helper(
        mut self,
        provider: Arc<dyn MissionHelperProvider>,
        config: HelperConfig,
    ) -> Self {
        self.helper = provider;
        self.helper_config = config;
        self
    }
}

pub fn create_auth_rate_limiter(requests_per_minute: u32) -> Arc<AuthRateLimiter> {
    use std::num::NonZeroU32;
    let quota = Quota::per_minute(
        NonZeroU32::new(requests_per_minute).unwrap_or(NonZeroU32::new(20).unwrap()),
    );
    Arc::new(RateLimiter::keyed(quota))
}
