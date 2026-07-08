//! Child-profile entities, consent state machine, and ConsentGate policy.
//!
//! Safety invariants enforced here (non-negotiable per CLAUDE.md):
//! - Children start RESTRICTED (Pending consent).
//! - Only Granted or ClassGranted consent unlocks gated actions.
//! - Collect only: nickname, avatar_id, birth_year. No other PII.

use chrono::{DateTime, Utc};
use uuid::Uuid;

// ── AgeMode ───────────────────────────────────────────────────────────────────

/// Age bracket derived from birth_year at runtime; also stored on ExploreVideo
/// age_modes[] to filter content by developmental stage.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgeMode {
    /// Ages 8–9 (birth_year relative to current year).
    Young,
    /// Ages 10+.
    Older,
}

impl AgeMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            AgeMode::Young => "young",
            AgeMode::Older => "older",
        }
    }

    pub fn from_slug(s: &str) -> Option<Self> {
        match s {
            "young" => Some(AgeMode::Young),
            "older" => Some(AgeMode::Older),
            _ => None,
        }
    }
}

// ── ChildProfile ──────────────────────────────────────────────────────────────

/// A child's profile. Collects ONLY nickname, avatar_id, and birth_year per
/// COPPA minimisation. No full name, address, phone, school, or face photo.
#[derive(Debug, Clone)]
pub struct ChildProfile {
    pub id: Uuid,
    /// Parent account that created and owns this profile.
    pub parent_account_id: Uuid,
    pub nickname: String,
    /// Index into the pre-approved avatar set (no face photos).
    /// Semantic avatar id from the fixed set, e.g. "cat".
    pub avatar_id: String,
    /// Birth year (not full date of birth).
    pub birth_year: u16,
    pub created_at: DateTime<Utc>,
}

impl ChildProfile {
    pub fn age_mode(&self, current_year: i32) -> AgeMode {
        let age = current_year - i32::from(self.birth_year);
        if age >= 10 {
            AgeMode::Older
        } else {
            AgeMode::Young
        }
    }
}

// ── ConsentStatus ─────────────────────────────────────────────────────────────

/// The consent state machine. Transitions:
/// ```text
/// Pending  ──[grant(token)]──> Granted
/// Pending  ──[class-join]───> ClassGranted
/// Granted  ──[revoke]───────> Revoked
/// ClassGranted ──[revoke]──> Revoked
/// Revoked  ──────────────────(terminal — re-grant not allowed)
/// ```
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConsentStatus {
    /// Initial state: child is RESTRICTED. No social/sharing/extra-data.
    Pending,
    /// Parent clicked the consent link. Gated actions unlocked.
    Granted,
    /// Parent revoked. Child returns to RESTRICTED.
    Revoked,
    /// Teacher's class acts as implicit consent path. Gated actions unlocked.
    ClassGranted,
}

impl ConsentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ConsentStatus::Pending => "pending",
            ConsentStatus::Granted => "granted",
            ConsentStatus::Revoked => "revoked",
            ConsentStatus::ClassGranted => "class_granted",
        }
    }

    pub fn from_slug(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(ConsentStatus::Pending),
            "granted" => Some(ConsentStatus::Granted),
            "revoked" => Some(ConsentStatus::Revoked),
            "class_granted" => Some(ConsentStatus::ClassGranted),
            _ => None,
        }
    }

    /// Returns true iff the child is in a RESTRICTED state.
    pub fn is_restricted(&self) -> bool {
        matches!(self, ConsentStatus::Pending | ConsentStatus::Revoked)
    }
}

// ── GatedAction ───────────────────────────────────────────────────────────────

/// Actions that require parental consent before a child may perform them.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GatedAction {
    /// Share any content publicly or with peers.
    Share,
    /// View social feeds, comments, or other users' content.
    ViewSocial,
    /// Collect any data beyond the COPPA minimum (nickname/avatar/birth_year).
    CollectExtraData,
}

// ── ConsentGate ───────────────────────────────────────────────────────────────

/// Pure policy: decides whether a gated action is allowed given consent state.
///
/// This is the single authoritative implementation of the rule:
/// "Children start RESTRICTED. Sharing, social, and extra data collection are
/// disabled until a parent grants consent."
pub struct ConsentGate;

impl ConsentGate {
    /// Returns `true` iff the child may perform `action` under `status`.
    ///
    /// Both `Granted` and `ClassGranted` unlock gated actions; `Pending` and
    /// `Revoked` deny everything.
    pub fn can(status: &ConsentStatus, _action: &GatedAction) -> bool {
        matches!(status, ConsentStatus::Granted | ConsentStatus::ClassGranted)
    }
}

// ── ParentalConsent ───────────────────────────────────────────────────────────

/// A consent record. Only the SHA-256 hash of the opaque token is stored;
/// the raw token is emailed to the parent and never kept server-side.
#[derive(Debug, Clone)]
pub struct ParentalConsent {
    pub id: Uuid,
    pub child_id: Uuid,
    /// SHA-256 hex of the raw consent token (raw token is in the email link).
    pub token_hash: String,
    pub status: ConsentStatus,
    pub sent_at: DateTime<Utc>,
    /// 24-hour expiry from sent_at.
    pub expires_at: DateTime<Utc>,
    pub granted_at: Option<DateTime<Utc>>,
    pub revoked_at: Option<DateTime<Utc>>,
}

// ── Class ─────────────────────────────────────────────────────────────────────

/// A teacher-created class. Joining grants ClassGranted consent to the child.
#[derive(Debug, Clone)]
pub struct Class {
    pub id: Uuid,
    pub teacher_account_id: Uuid,
    pub name: String,
    /// Unique short code used for join-by-code flow.
    pub class_code: String,
    pub created_at: DateTime<Utc>,
}
