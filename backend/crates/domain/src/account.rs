//! Account entity, role enum, and related value types.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Parent,
    Teacher,
    Other,
    Admin,
    Reviewer,
}

impl Role {
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Parent => "parent",
            Role::Teacher => "teacher",
            Role::Other => "other",
            Role::Admin => "admin",
            Role::Reviewer => "reviewer",
        }
    }

    pub fn from_slug(s: &str) -> Option<Self> {
        match s {
            "parent" => Some(Role::Parent),
            "teacher" => Some(Role::Teacher),
            "other" => Some(Role::Other),
            "admin" => Some(Role::Admin),
            "reviewer" => Some(Role::Reviewer),
            _ => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Account {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub role: Role,
    pub email_verified_at: Option<DateTime<Utc>>,
    pub locale: String,
    pub verification_token_hash: Option<String>,
    pub verification_token_expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Account {
    pub fn new(
        id: Uuid,
        email: String,
        password_hash: String,
        role: Role,
        locale: String,
        now: DateTime<Utc>,
    ) -> Self {
        Self {
            id,
            email,
            password_hash,
            role,
            email_verified_at: None,
            locale,
            verification_token_hash: None,
            verification_token_expires_at: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn is_email_verified(&self) -> bool {
        self.email_verified_at.is_some()
    }
}

/// An active refresh session. Only the hash of the opaque refresh token is
/// stored; the raw token is sent once to the client and never kept server-side.
#[derive(Debug, Clone)]
pub struct RefreshSession {
    pub id: Uuid,
    pub account_id: Uuid,
    pub refresh_token_hash: String,
    pub expires_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Pair of tokens returned from login / refresh.
#[derive(Debug, Clone)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

/// Claims decoded from a valid access JWT — used by the auth extractor.
#[derive(Debug, Clone)]
pub struct TokenClaims {
    pub account_id: Uuid,
    pub role: Role,
}
