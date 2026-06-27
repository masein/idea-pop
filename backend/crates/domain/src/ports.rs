//! Port traits (interfaces) for infrastructure adapters.
//!
//! Concrete implementations live in `idea-pop-infra`. These traits use
//! `async_trait` so they can be stored as `dyn Trait` objects while keeping
//! async method signatures.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    challenge::{Challenge, ChallengeFilter},
    content::{
        Course, Creator, ExploreFilter, ExploreVideo, Lesson, Page, QuickMake, QuickMakeFilter,
        StudioCount,
    },
    progress::{
        AnalyticsEvent, AttemptStatus, BadgeDefinition, ChallengeAttempt, ChildBadge,
        CycleActivityResult, XpEvent, XpSourceType,
    },
    Account, ChildProfile, Class, ConsentStatus, DomainError, ParentalConsent, RefreshSession,
    Role, TokenClaims, TokenPair,
};

#[async_trait]
pub trait AccountRepo: Send + Sync {
    async fn find_by_email(&self, email: &str) -> Result<Option<Account>, DomainError>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Account>, DomainError>;
    async fn find_by_verification_token_hash(
        &self,
        hash: &str,
    ) -> Result<Option<Account>, DomainError>;
    async fn create(&self, account: &Account) -> Result<(), DomainError>;
    async fn update(&self, account: &Account) -> Result<(), DomainError>;
    async fn create_refresh_session(&self, session: &RefreshSession) -> Result<(), DomainError>;
    async fn find_refresh_session_by_hash(
        &self,
        hash: &str,
    ) -> Result<Option<RefreshSession>, DomainError>;
    async fn revoke_refresh_session(&self, session_id: Uuid) -> Result<(), DomainError>;
}

#[async_trait]
pub trait PasswordHasher: Send + Sync {
    async fn hash(&self, password: &str) -> Result<String, DomainError>;
    async fn verify(&self, password: &str, hash: &str) -> Result<bool, DomainError>;
}

/// Issues and verifies JWTs, and manages opaque refresh-token lifecycle.
#[async_trait]
pub trait TokenIssuer: Send + Sync {
    /// Create an access + refresh token pair for an adult account.
    async fn issue(&self, account_id: Uuid, role: &Role) -> Result<TokenPair, DomainError>;
    /// Create a kid-scoped access token (no refresh token — parent revokes via consent).
    async fn issue_kid(
        &self,
        child_id: Uuid,
        parent_account_id: Uuid,
    ) -> Result<String, DomainError>;
    /// Verify an access JWT and return its decoded claims.
    async fn verify_access(&self, token: &str) -> Result<TokenClaims, DomainError>;
    /// SHA-256 hex digest of an opaque token — stored in DB, never the raw token.
    fn hash_token(&self, raw: &str) -> String;
    /// Generate a cryptographically random opaque token (hex-encoded 32 bytes).
    fn generate_opaque_token(&self) -> String;
}

// ── Child & consent ports ─────────────────────────────────────────────────────

#[async_trait]
pub trait ChildRepo: Send + Sync {
    async fn create(&self, profile: &ChildProfile) -> Result<(), DomainError>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<ChildProfile>, DomainError>;
    async fn find_by_parent(&self, parent_id: Uuid) -> Result<Vec<ChildProfile>, DomainError>;
}

#[async_trait]
pub trait ConsentRepo: Send + Sync {
    async fn create(&self, consent: &ParentalConsent) -> Result<(), DomainError>;
    async fn find_by_token_hash(&self, hash: &str) -> Result<Option<ParentalConsent>, DomainError>;
    async fn find_latest_by_child(
        &self,
        child_id: Uuid,
    ) -> Result<Option<ParentalConsent>, DomainError>;
    async fn update_status(
        &self,
        id: Uuid,
        status: ConsentStatus,
        now: DateTime<Utc>,
    ) -> Result<(), DomainError>;
}

#[async_trait]
pub trait ClassRepo: Send + Sync {
    async fn create(&self, class: &Class) -> Result<(), DomainError>;
    async fn find_by_code(&self, code: &str) -> Result<Option<Class>, DomainError>;
    /// Add child to class; returns Err(Conflict) if already a member.
    async fn add_member(&self, class_id: Uuid, child_id: Uuid) -> Result<(), DomainError>;
}

#[async_trait]
pub trait ConsentEmailSender: Send + Sync {
    async fn send_consent_request(
        &self,
        parent_email: &str,
        child_nickname: &str,
        token: &str,
    ) -> Result<(), DomainError>;
}

#[async_trait]
pub trait EmailSender: Send + Sync {
    async fn send_verification_email(
        &self,
        to: &str,
        token: &str,
        locale: &str,
    ) -> Result<(), DomainError>;
}

pub trait Clock: Send + Sync {
    fn now(&self) -> DateTime<Utc>;
}

// ── Content ports ─────────────────────────────────────────────────────────────

#[async_trait]
pub trait ExploreRepo: Send + Sync {
    async fn list(&self, filter: &ExploreFilter) -> Result<Page<ExploreVideo>, DomainError>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<ExploreVideo>, DomainError>;
}

// ── Challenge port ────────────────────────────────────────────────────────────

#[async_trait]
pub trait ChallengeRepo: Send + Sync {
    async fn list(&self, filter: &ChallengeFilter) -> Result<Page<Challenge>, DomainError>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Challenge>, DomainError>;
}

// ── Gamification ports ────────────────────────────────────────────────────────

#[async_trait]
pub trait XpRepo: Send + Sync {
    /// Returns true if an XP event already exists for this (child, source_type, source_id).
    async fn has_event(
        &self,
        child_id: Uuid,
        source_type: &XpSourceType,
        source_id: Uuid,
    ) -> Result<bool, DomainError>;
    /// Append a new XP event. The DB UNIQUE index guards against duplicates.
    async fn append_event(&self, event: &XpEvent) -> Result<(), DomainError>;
    /// Fetch all XP events for replay and total derivation.
    async fn list_events(&self, child_id: Uuid) -> Result<Vec<XpEvent>, DomainError>;
    /// Upsert the materialized progress cache (optimisation for GET /me/progress).
    async fn upsert_progress(
        &self,
        child_id: Uuid,
        xp: i32,
        level: u32,
        rank: &str,
    ) -> Result<(), DomainError>;
}

#[async_trait]
pub trait ProgressRepo: Send + Sync {
    /// Record a video view. Returns true = first view (new); false = already viewed.
    async fn record_video_view(
        &self,
        child_id: Uuid,
        video_id: Uuid,
        now: DateTime<Utc>,
    ) -> Result<bool, DomainError>;
    async fn count_video_views(&self, child_id: Uuid) -> Result<u32, DomainError>;

    /// Record a lesson completion. Returns true = first completion; false = duplicate.
    async fn record_lesson_complete(
        &self,
        child_id: Uuid,
        lesson_id: Uuid,
        now: DateTime<Utc>,
    ) -> Result<bool, DomainError>;
    async fn count_lesson_completions(&self, child_id: Uuid) -> Result<u32, DomainError>;

    async fn create_attempt(&self, attempt: &ChallengeAttempt) -> Result<(), DomainError>;
    async fn find_attempt(&self, id: Uuid) -> Result<Option<ChallengeAttempt>, DomainError>;
    async fn update_attempt(
        &self,
        id: Uuid,
        step: i16,
        status: &AttemptStatus,
        completed_at: Option<DateTime<Utc>>,
    ) -> Result<(), DomainError>;
    async fn count_completed_challenges(&self, child_id: Uuid) -> Result<u32, DomainError>;
    /// True if this child has already completed this challenge (used for XP idempotency).
    async fn has_completed_challenge(
        &self,
        child_id: Uuid,
        challenge_id: Uuid,
    ) -> Result<bool, DomainError>;

    /// Atomically update the creative-cycle row for the given ISO week.
    /// Returns CycleCompleted(cycle_id) when all three activities are now recorded
    /// for this week and the bonus has been claimed for the first time.
    async fn update_cycle_activity(
        &self,
        child_id: Uuid,
        iso_year: i32,
        iso_week: u32,
        source: &XpSourceType,
    ) -> Result<CycleActivityResult, DomainError>;
    async fn count_completed_cycles(&self, child_id: Uuid) -> Result<u32, DomainError>;
}

#[async_trait]
pub trait BadgeRepo: Send + Sync {
    async fn all_definitions(&self) -> Result<Vec<BadgeDefinition>, DomainError>;
    async fn child_badges(&self, child_id: Uuid) -> Result<Vec<ChildBadge>, DomainError>;
    /// Award a badge to a child. Returns true = newly awarded; false = already had it.
    async fn award_badge(
        &self,
        child_id: Uuid,
        badge_id: Uuid,
        now: DateTime<Utc>,
    ) -> Result<bool, DomainError>;
}

#[async_trait]
pub trait AnalyticsSink: Send + Sync {
    async fn emit(&self, event: &AnalyticsEvent) -> Result<(), DomainError>;
}

#[async_trait]
pub trait LibraryRepo: Send + Sync {
    async fn list_quick_makes(
        &self,
        filter: &QuickMakeFilter,
    ) -> Result<Page<QuickMake>, DomainError>;
    async fn find_course_with_lessons(
        &self,
        id: Uuid,
    ) -> Result<Option<(Course, Vec<Lesson>)>, DomainError>;
    async fn find_creator(&self, id: Uuid) -> Result<Option<Creator>, DomainError>;
    async fn studio_counts(&self) -> Result<Vec<StudioCount>, DomainError>;
}
