//! Port traits (interfaces) for infrastructure adapters.
//!
//! Concrete implementations live in `idea-pop-infra`. These traits use
//! `async_trait` so they can be stored as `dyn Trait` objects while keeping
//! async method signatures.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{Account, DomainError, RefreshSession, Role, TokenClaims, TokenPair};

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
    /// Create an access + refresh token pair for an account.
    async fn issue(&self, account_id: Uuid, role: &Role) -> Result<TokenPair, DomainError>;
    /// Verify an access JWT and return its decoded claims.
    async fn verify_access(&self, token: &str) -> Result<TokenClaims, DomainError>;
    /// SHA-256 hex digest of an opaque token — stored in DB, never the raw token.
    fn hash_token(&self, raw: &str) -> String;
    /// Generate a cryptographically random opaque token (hex-encoded 32 bytes).
    fn generate_opaque_token(&self) -> String;
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
