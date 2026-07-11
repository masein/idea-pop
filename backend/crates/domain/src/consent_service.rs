//! ConsentService — orchestrates child signup, parental consent, and class join.
//!
//! All safety invariants live in this service:
//! - Children start RESTRICTED (status = Pending).
//! - grant_consent advances Pending → Granted; rejects expired or already-used tokens.
//! - revoke_consent moves Granted/ClassGranted → Revoked.
//! - Class join moves Pending → ClassGranted (teacher path).

use std::sync::Arc;

use chrono::Duration;
use uuid::Uuid;

use crate::{
    child::{ChildProfile, Class, ConsentStatus, GatedAction, ParentalConsent},
    ports::{ChildRepo, ClassRepo, Clock, ConsentEmailSender, ConsentRepo, TokenIssuer},
    ConsentGate, DomainError,
};

// ── Service ───────────────────────────────────────────────────────────────────

pub struct ConsentService {
    pub child_repo: Arc<dyn ChildRepo>,
    pub consent_repo: Arc<dyn ConsentRepo>,
    pub class_repo: Arc<dyn ClassRepo>,
    pub tokens: Arc<dyn TokenIssuer>,
    pub email: Arc<dyn ConsentEmailSender>,
    pub clock: Arc<dyn Clock>,
}

impl ConsentService {
    pub fn new(
        child_repo: Arc<dyn ChildRepo>,
        consent_repo: Arc<dyn ConsentRepo>,
        class_repo: Arc<dyn ClassRepo>,
        tokens: Arc<dyn TokenIssuer>,
        email: Arc<dyn ConsentEmailSender>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            child_repo,
            consent_repo,
            class_repo,
            tokens,
            email,
            clock,
        }
    }

    // ── Child signup ──────────────────────────────────────────────────────────

    /// Create a child profile in RESTRICTED state, send consent email, return
    /// a kid-scoped access token for immediate (restricted) use.
    ///
    /// Data collected: ONLY nickname, avatar_id, birth_year. No PII beyond that.
    pub async fn create_child(
        &self,
        parent_account_id: Uuid,
        nickname: String,
        avatar_id: String,
        birth_year: u16,
        parent_email: String,
    ) -> Result<(ChildProfile, String), DomainError> {
        validate_nickname(&nickname)?;
        validate_avatar_id(&avatar_id)?;
        validate_birth_year(birth_year)?;

        let now = self.clock.now();
        let child = ChildProfile {
            id: Uuid::new_v4(),
            parent_account_id,
            nickname: nickname.clone(),
            avatar_id,
            birth_year,
            created_at: now,
        };

        self.child_repo.create(&child).await?;

        // Issue consent token (opaque) and store its hash.
        let raw_token = self.tokens.generate_opaque_token();
        let token_hash = self.tokens.hash_token(&raw_token);
        let consent = ParentalConsent {
            id: Uuid::new_v4(),
            child_id: child.id,
            token_hash,
            status: ConsentStatus::Pending,
            sent_at: now,
            expires_at: now + Duration::hours(24),
            granted_at: None,
            revoked_at: None,
        };
        self.consent_repo.create(&consent).await?;

        self.email
            .send_consent_request(&parent_email, &nickname, &raw_token)
            .await?;

        let kid_token = self.tokens.issue_kid(child.id, parent_account_id).await?;

        Ok((child, kid_token))
    }

    // ── Parental consent grant ────────────────────────────────────────────────

    /// Parent clicks the link in their email → grants consent.
    ///
    /// Rejects: expired tokens, tokens not in Pending state (already used/revoked).
    pub async fn grant_consent(&self, raw_token: String) -> Result<(), DomainError> {
        let hash = self.tokens.hash_token(&raw_token);
        let consent = self
            .consent_repo
            .find_by_token_hash(&hash)
            .await?
            .ok_or_else(|| DomainError::Unauthorized("invalid consent token".into()))?;

        if consent.status != ConsentStatus::Pending {
            return Err(DomainError::Unauthorized(
                "consent token already used or revoked".into(),
            ));
        }
        let now = self.clock.now();
        if now > consent.expires_at {
            return Err(DomainError::Unauthorized(
                "consent token has expired".into(),
            ));
        }

        self.consent_repo
            .update_status(consent.id, ConsentStatus::Granted, now)
            .await
    }

    // ── Parental consent revoke ───────────────────────────────────────────────

    /// Parent revokes consent for a child → child returns to RESTRICTED.
    ///
    /// Only the parent who owns the child profile may revoke.
    /// In-app consent grant by the AUTHENTICATED parent (no email token).
    ///
    /// The token/email flow stays the primary verifiable-consent path for
    /// parents without accounts; a signed-in parent approving their OWN
    /// child is an equally recorded human approval. Ownership-checked;
    /// scope "class" -> ClassGranted, "public"/"all" -> Granted.
    pub async fn grant_consent_by_parent(
        &self,
        child_id: Uuid,
        parent_account_id: Uuid,
        scope: &str,
    ) -> Result<(), DomainError> {
        let status = match scope {
            "class" => ConsentStatus::ClassGranted,
            "public" | "all" => ConsentStatus::Granted,
            _ => {
                return Err(DomainError::Validation(
                    "scope must be one of class | public | all".into(),
                ));
            }
        };

        let child = self
            .child_repo
            .find_by_id(child_id)
            .await?
            .ok_or(DomainError::NotFound)?;
        if child.parent_account_id != parent_account_id {
            return Err(DomainError::Forbidden(
                "not the parent of this child".into(),
            ));
        }

        let consent = self
            .consent_repo
            .find_latest_by_child(child_id)
            .await?
            .ok_or(DomainError::NotFound)?;

        let now = self.clock.now();
        self.consent_repo
            .update_status(consent.id, status, now)
            .await
    }

    pub async fn revoke_consent(
        &self,
        child_id: Uuid,
        parent_account_id: Uuid,
    ) -> Result<(), DomainError> {
        let child = self
            .child_repo
            .find_by_id(child_id)
            .await?
            .ok_or(DomainError::NotFound)?;
        if child.parent_account_id != parent_account_id {
            return Err(DomainError::Forbidden(
                "not the parent of this child".into(),
            ));
        }

        let consent = self
            .consent_repo
            .find_latest_by_child(child_id)
            .await?
            .ok_or(DomainError::NotFound)?;

        if consent.status == ConsentStatus::Revoked {
            return Err(DomainError::Conflict("consent already revoked".into()));
        }
        if consent.status == ConsentStatus::Pending {
            return Err(DomainError::Conflict(
                "consent not yet granted; nothing to revoke".into(),
            ));
        }

        let now = self.clock.now();
        self.consent_repo
            .update_status(consent.id, ConsentStatus::Revoked, now)
            .await
    }

    // ── Class management ──────────────────────────────────────────────────────

    /// Teacher creates a class. Returns the Class with its unique code.
    pub async fn create_class(
        &self,
        teacher_account_id: Uuid,
        name: String,
    ) -> Result<Class, DomainError> {
        if name.trim().is_empty() {
            return Err(DomainError::Validation(
                "class name must not be blank".into(),
            ));
        }
        let now = self.clock.now();
        let code = generate_class_code();
        let class = Class {
            id: Uuid::new_v4(),
            teacher_account_id,
            name: name.trim().to_owned(),
            class_code: code,
            created_at: now,
        };
        self.class_repo.create(&class).await?;
        Ok(class)
    }

    /// Child joins a class by code → consent moves to ClassGranted.
    ///
    /// ClassGranted is the "teacher path" consent; it unlocks the same gated
    /// actions as Granted.
    pub async fn join_class_by_code(
        &self,
        child_id: Uuid,
        class_code: &str,
    ) -> Result<(), DomainError> {
        let class = self
            .class_repo
            .find_by_code(class_code)
            .await?
            .ok_or(DomainError::NotFound)?;

        self.class_repo.add_member(class.id, child_id).await?;

        let now = self.clock.now();

        // Advance consent if it's still Pending (class join = implicit consent).
        if let Some(consent) = self.consent_repo.find_latest_by_child(child_id).await? {
            if consent.status == ConsentStatus::Pending {
                self.consent_repo
                    .update_status(consent.id, ConsentStatus::ClassGranted, now)
                    .await?;
            }
        }
        Ok(())
    }

    // ── Consent gate check ────────────────────────────────────────────────────

    /// Returns `Ok(())` if the child may perform `action`, or
    /// `Err(Forbidden)` if consent is Pending/Revoked.
    pub async fn check_gate(
        &self,
        child_id: Uuid,
        action: &GatedAction,
    ) -> Result<(), DomainError> {
        let status = self
            .consent_repo
            .find_latest_by_child(child_id)
            .await?
            .map(|c| c.status)
            .unwrap_or(ConsentStatus::Pending);
        if ConsentGate::can(&status, action) {
            Ok(())
        } else {
            Err(DomainError::Forbidden(
                "parental consent required for this action".into(),
            ))
        }
    }
}

// ── Validators ────────────────────────────────────────────────────────────────

fn validate_avatar_id(a: &str) -> Result<(), DomainError> {
    let t = a.trim();
    if t.is_empty() || t.len() > 32 {
        return Err(DomainError::Validation(
            "avatar_id must be 1-32 characters".into(),
        ));
    }
    if !t
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err(DomainError::Validation(
            "avatar_id may only contain letters, digits, _ and -".into(),
        ));
    }
    Ok(())
}

fn validate_nickname(n: &str) -> Result<(), DomainError> {
    let t = n.trim();
    if t.is_empty() {
        return Err(DomainError::Validation("nickname must not be blank".into()));
    }
    if t.len() > 30 {
        return Err(DomainError::Validation(
            "nickname must be 30 characters or fewer".into(),
        ));
    }
    Ok(())
}

fn validate_birth_year(year: u16) -> Result<(), DomainError> {
    if !(1980..=2020).contains(&year) {
        return Err(DomainError::Validation(
            "birth_year out of reasonable range (1980–2020)".into(),
        ));
    }
    Ok(())
}

/// Generate a 6-character uppercase alphanumeric class code.
fn generate_class_code() -> String {
    use std::fmt::Write;
    let mut rng_buf = [0u8; 6];
    // Use a simple deterministic mapping from random bytes.
    // In a real system we'd check uniqueness, but domain pure — that's infra's job.
    getrandom_class_code(&mut rng_buf);
    let charset: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
    let mut code = String::with_capacity(6);
    for &b in &rng_buf {
        let _ = write!(code, "{}", charset[b as usize % charset.len()] as char);
    }
    code
}

fn getrandom_class_code(buf: &mut [u8; 6]) {
    // We're in the domain crate which has no IO, but we can use
    // a simple uuid-derived approach to get 6 pseudo-random bytes.
    let u = Uuid::new_v4();
    buf.copy_from_slice(&u.as_bytes()[..6]);
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        child::{ConsentStatus, GatedAction},
        DomainError,
    };
    use chrono::Utc;
    use std::{
        collections::HashMap,
        sync::{Arc, Mutex},
    };
    use uuid::Uuid;

    // ── In-memory fakes ───────────────────────────────────────────────────────

    #[derive(Default)]
    struct FakeChildRepo {
        children: Mutex<HashMap<Uuid, ChildProfile>>,
    }

    #[async_trait::async_trait]
    impl ChildRepo for FakeChildRepo {
        async fn create(&self, p: &ChildProfile) -> Result<(), DomainError> {
            self.children.lock().unwrap().insert(p.id, p.clone());
            Ok(())
        }
        async fn find_by_id(&self, id: Uuid) -> Result<Option<ChildProfile>, DomainError> {
            Ok(self.children.lock().unwrap().get(&id).cloned())
        }
        async fn find_by_parent(&self, parent_id: Uuid) -> Result<Vec<ChildProfile>, DomainError> {
            Ok(self
                .children
                .lock()
                .unwrap()
                .values()
                .filter(|c| c.parent_account_id == parent_id)
                .cloned()
                .collect())
        }
    }

    #[derive(Default)]
    struct FakeConsentRepo {
        consents: Mutex<Vec<ParentalConsent>>,
    }

    #[async_trait::async_trait]
    impl ConsentRepo for FakeConsentRepo {
        async fn create(&self, c: &ParentalConsent) -> Result<(), DomainError> {
            self.consents.lock().unwrap().push(c.clone());
            Ok(())
        }
        async fn find_by_token_hash(
            &self,
            hash: &str,
        ) -> Result<Option<ParentalConsent>, DomainError> {
            Ok(self
                .consents
                .lock()
                .unwrap()
                .iter()
                .find(|c| c.token_hash == hash)
                .cloned())
        }
        async fn find_latest_by_child(
            &self,
            child_id: Uuid,
        ) -> Result<Option<ParentalConsent>, DomainError> {
            Ok(self
                .consents
                .lock()
                .unwrap()
                .iter()
                .rfind(|c| c.child_id == child_id)
                .cloned())
        }
        async fn update_status(
            &self,
            id: Uuid,
            status: ConsentStatus,
            now: chrono::DateTime<Utc>,
        ) -> Result<(), DomainError> {
            let mut cs = self.consents.lock().unwrap();
            let c = cs.iter_mut().find(|c| c.id == id).unwrap();
            match &status {
                ConsentStatus::Granted => c.granted_at = Some(now),
                ConsentStatus::Revoked => c.revoked_at = Some(now),
                _ => {}
            }
            c.status = status;
            Ok(())
        }
    }

    #[derive(Default)]
    struct FakeClassRepo {
        classes: Mutex<HashMap<String, Class>>,
        members: Mutex<Vec<(Uuid, Uuid)>>,
    }

    #[async_trait::async_trait]
    impl ClassRepo for FakeClassRepo {
        async fn create(&self, c: &Class) -> Result<(), DomainError> {
            self.classes
                .lock()
                .unwrap()
                .insert(c.class_code.clone(), c.clone());
            Ok(())
        }
        async fn find_by_code(&self, code: &str) -> Result<Option<Class>, DomainError> {
            Ok(self.classes.lock().unwrap().get(code).cloned())
        }
        async fn add_member(&self, class_id: Uuid, child_id: Uuid) -> Result<(), DomainError> {
            let mut m = self.members.lock().unwrap();
            if m.iter().any(|(ci, ch)| *ci == class_id && *ch == child_id) {
                return Err(DomainError::Conflict("already a member".into()));
            }
            m.push((class_id, child_id));
            Ok(())
        }
    }

    #[derive(Default)]
    struct FakeConsentEmail {
        sent: Mutex<Vec<(String, String, String)>>,
    }

    #[async_trait::async_trait]
    impl ConsentEmailSender for FakeConsentEmail {
        async fn send_consent_request(
            &self,
            parent_email: &str,
            child_nickname: &str,
            token: &str,
        ) -> Result<(), DomainError> {
            self.sent.lock().unwrap().push((
                parent_email.into(),
                child_nickname.into(),
                token.into(),
            ));
            Ok(())
        }
    }

    struct FakeTokenIssuer;
    #[async_trait::async_trait]
    impl TokenIssuer for FakeTokenIssuer {
        async fn issue(
            &self,
            account_id: Uuid,
            _role: &crate::Role,
        ) -> Result<crate::TokenPair, DomainError> {
            Ok(crate::TokenPair {
                access_token: format!("adult-{account_id}"),
                refresh_token: "refresh".into(),
                expires_in: 900,
            })
        }
        async fn issue_kid(&self, child_id: Uuid, _parent_id: Uuid) -> Result<String, DomainError> {
            Ok(format!("kid-{child_id}"))
        }
        async fn verify_access(&self, _token: &str) -> Result<crate::TokenClaims, DomainError> {
            Err(DomainError::Unauthorized("fake".into()))
        }
        fn hash_token(&self, raw: &str) -> String {
            format!("hash:{raw}")
        }
        fn generate_opaque_token(&self) -> String {
            Uuid::new_v4().to_string()
        }
    }

    struct FakeClock {
        now: chrono::DateTime<Utc>,
    }
    impl crate::Clock for FakeClock {
        fn now(&self) -> chrono::DateTime<Utc> {
            self.now
        }
    }

    fn make_service() -> (Arc<FakeConsentEmail>, ConsentService) {
        let email = Arc::new(FakeConsentEmail::default());
        let svc = ConsentService::new(
            Arc::new(FakeChildRepo::default()),
            Arc::new(FakeConsentRepo::default()),
            Arc::new(FakeClassRepo::default()),
            Arc::new(FakeTokenIssuer),
            Arc::clone(&email) as Arc<dyn crate::ConsentEmailSender>,
            Arc::new(FakeClock { now: Utc::now() }),
        );
        (email, svc)
    }

    // ── ConsentGate unit tests ────────────────────────────────────────────────

    #[test]
    fn pending_denies_all_gated_actions() {
        assert!(!ConsentGate::can(
            &ConsentStatus::Pending,
            &GatedAction::Share
        ));
        assert!(!ConsentGate::can(
            &ConsentStatus::Pending,
            &GatedAction::ViewSocial
        ));
        assert!(!ConsentGate::can(
            &ConsentStatus::Pending,
            &GatedAction::CollectExtraData
        ));
    }

    #[test]
    fn nickname_accepts_unicode_letters() {
        // COPPA collects a nickname only — any script is fine (Persian, Arabic,
        // CJK, emoji-free letters). The frontend mirrors this with a \p{L}\p{N}
        // pattern; the backend never restricted characters, only length/blank.
        assert!(validate_nickname("کاوشگر").is_ok());
        assert!(validate_nickname("Élodie").is_ok());
        assert!(validate_nickname("さくら").is_ok());
        assert!(validate_nickname("Pixel_7").is_ok());
        assert!(validate_nickname("   ").is_err()); // blank after trim
        assert!(validate_nickname(&"x".repeat(31)).is_err()); // too long
    }

    #[test]
    fn revoked_denies_all_gated_actions() {
        assert!(!ConsentGate::can(
            &ConsentStatus::Revoked,
            &GatedAction::Share
        ));
        assert!(!ConsentGate::can(
            &ConsentStatus::Revoked,
            &GatedAction::ViewSocial
        ));
        assert!(!ConsentGate::can(
            &ConsentStatus::Revoked,
            &GatedAction::CollectExtraData
        ));
    }

    #[test]
    fn granted_allows_all_gated_actions() {
        assert!(ConsentGate::can(
            &ConsentStatus::Granted,
            &GatedAction::Share
        ));
        assert!(ConsentGate::can(
            &ConsentStatus::Granted,
            &GatedAction::ViewSocial
        ));
        assert!(ConsentGate::can(
            &ConsentStatus::Granted,
            &GatedAction::CollectExtraData
        ));
    }

    #[test]
    fn class_granted_allows_all_gated_actions() {
        assert!(ConsentGate::can(
            &ConsentStatus::ClassGranted,
            &GatedAction::Share
        ));
        assert!(ConsentGate::can(
            &ConsentStatus::ClassGranted,
            &GatedAction::ViewSocial
        ));
        assert!(ConsentGate::can(
            &ConsentStatus::ClassGranted,
            &GatedAction::CollectExtraData
        ));
    }

    #[test]
    fn is_restricted_matches_pending_and_revoked() {
        assert!(ConsentStatus::Pending.is_restricted());
        assert!(ConsentStatus::Revoked.is_restricted());
        assert!(!ConsentStatus::Granted.is_restricted());
        assert!(!ConsentStatus::ClassGranted.is_restricted());
    }

    // ── ConsentService unit tests ─────────────────────────────────────────────

    #[tokio::test]
    async fn create_child_starts_restricted_and_sends_email() {
        let (email, svc) = make_service();
        let parent_id = Uuid::new_v4();
        let (child, token) = svc
            .create_child(
                parent_id,
                "Aria".into(),
                "cat".into(),
                2015,
                "mom@example.com".into(),
            )
            .await
            .unwrap();

        assert_eq!(child.nickname, "Aria");
        assert_eq!(child.parent_account_id, parent_id);
        // Token is kid-scoped
        assert!(token.starts_with("kid-"));
        // Consent email was sent
        let sent = email.sent.lock().unwrap();
        assert_eq!(sent.len(), 1);
        assert_eq!(sent[0].0, "mom@example.com");
        assert_eq!(sent[0].1, "Aria");
    }

    #[tokio::test]
    async fn create_child_rejects_blank_nickname() {
        let (_, svc) = make_service();
        let err = svc
            .create_child(
                Uuid::new_v4(),
                "  ".into(),
                "cat".into(),
                2015,
                "p@e.com".into(),
            )
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Validation(_)));
    }

    #[tokio::test]
    async fn create_child_rejects_out_of_range_birth_year() {
        let (_, svc) = make_service();
        let err = svc
            .create_child(
                Uuid::new_v4(),
                "Kid".into(),
                "cat".into(),
                1970,
                "p@e.com".into(),
            )
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Validation(_)));
    }

    #[tokio::test]
    async fn parent_grants_consent_in_app_by_child_id() {
        let (_, svc) = make_service();
        let parent_id = Uuid::new_v4();
        let (child, _) = svc
            .create_child(
                parent_id,
                "Zip".into(),
                "cat".into(),
                2016,
                "z@e.com".into(),
            )
            .await
            .unwrap();

        // class scope → ClassGranted
        svc.grant_consent_by_parent(child.id, parent_id, "class")
            .await
            .unwrap();
        svc.check_gate(child.id, &GatedAction::Share).await.unwrap();

        // all scope → Granted (full)
        svc.grant_consent_by_parent(child.id, parent_id, "all")
            .await
            .unwrap();
        svc.check_gate(child.id, &GatedAction::CollectExtraData)
            .await
            .unwrap();

        // wrong parent → Forbidden; bad scope → Validation
        let err = svc
            .grant_consent_by_parent(child.id, Uuid::new_v4(), "all")
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Forbidden(_)));
        let err = svc
            .grant_consent_by_parent(child.id, parent_id, "everything")
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Validation(_)));

        // and the parent can revoke again → gate closes
        svc.revoke_consent(child.id, parent_id).await.unwrap();
        assert!(svc.check_gate(child.id, &GatedAction::Share).await.is_err());
    }

    #[tokio::test]
    async fn grant_consent_pending_to_granted() {
        let (email, svc) = make_service();
        let parent_id = Uuid::new_v4();
        svc.create_child(
            parent_id,
            "Baz".into(),
            "cat".into(),
            2016,
            "p@e.com".into(),
        )
        .await
        .unwrap();
        let raw_token = email.sent.lock().unwrap()[0].2.clone();

        svc.grant_consent(raw_token.clone()).await.unwrap();

        // Granting again should fail (no longer Pending)
        let err = svc.grant_consent(raw_token).await.unwrap_err();
        assert!(matches!(err, DomainError::Unauthorized(_)));
    }

    #[tokio::test]
    async fn grant_consent_expired_token_rejected() {
        let email_sender = Arc::new(FakeConsentEmail::default());
        let consent_repo = Arc::new(FakeConsentRepo::default());
        let child_repo = Arc::new(FakeChildRepo::default());

        // Create with "now" = past
        let past = Utc::now() - Duration::hours(25);
        let svc_past = ConsentService::new(
            Arc::clone(&child_repo) as Arc<dyn crate::ChildRepo>,
            Arc::clone(&consent_repo) as Arc<dyn crate::ConsentRepo>,
            Arc::new(FakeClassRepo::default()),
            Arc::new(FakeTokenIssuer),
            Arc::clone(&email_sender) as Arc<dyn crate::ConsentEmailSender>,
            Arc::new(FakeClock { now: past }),
        );
        let parent_id = Uuid::new_v4();
        svc_past
            .create_child(
                parent_id,
                "Exp".into(),
                "cat".into(),
                2014,
                "p@e.com".into(),
            )
            .await
            .unwrap();
        let raw_token = email_sender.sent.lock().unwrap()[0].2.clone();

        // Grant with "now" = future (token expired)
        let svc_future = ConsentService::new(
            child_repo,
            consent_repo,
            Arc::new(FakeClassRepo::default()),
            Arc::new(FakeTokenIssuer),
            email_sender,
            Arc::new(FakeClock { now: Utc::now() }),
        );
        let err = svc_future.grant_consent(raw_token).await.unwrap_err();
        assert!(matches!(err, DomainError::Unauthorized(_)));
    }

    #[tokio::test]
    async fn grant_then_revoke_restricts_child() {
        let (email, svc) = make_service();
        let parent_id = Uuid::new_v4();
        let (child, _) = svc
            .create_child(
                parent_id,
                "Rio".into(),
                "cat".into(),
                2015,
                "p@e.com".into(),
            )
            .await
            .unwrap();
        let raw_token = email.sent.lock().unwrap()[0].2.clone();
        svc.grant_consent(raw_token).await.unwrap();

        // Gated action allowed after grant
        svc.check_gate(child.id, &GatedAction::Share).await.unwrap();

        svc.revoke_consent(child.id, parent_id).await.unwrap();

        // Gated action denied after revoke
        let err = svc
            .check_gate(child.id, &GatedAction::Share)
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Forbidden(_)));
    }

    #[tokio::test]
    async fn revoke_wrong_parent_forbidden() {
        let (email, svc) = make_service();
        let parent_id = Uuid::new_v4();
        let (child, _) = svc
            .create_child(
                parent_id,
                "Sam".into(),
                "cat".into(),
                2016,
                "p@e.com".into(),
            )
            .await
            .unwrap();
        let raw_token = email.sent.lock().unwrap()[0].2.clone();
        svc.grant_consent(raw_token).await.unwrap();

        let wrong_parent = Uuid::new_v4();
        let err = svc
            .revoke_consent(child.id, wrong_parent)
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Forbidden(_)));
    }

    #[tokio::test]
    async fn revoke_pending_fails_with_conflict() {
        let (_, svc) = make_service();
        let parent_id = Uuid::new_v4();
        let (child, _) = svc
            .create_child(
                parent_id,
                "Cub".into(),
                "cat".into(),
                2017,
                "p@e.com".into(),
            )
            .await
            .unwrap();
        let err = svc.revoke_consent(child.id, parent_id).await.unwrap_err();
        assert!(matches!(err, DomainError::Conflict(_)));
    }

    #[tokio::test]
    async fn class_join_grants_class_consent() {
        let (_, svc) = make_service();
        let teacher_id = Uuid::new_v4();
        let parent_id = Uuid::new_v4();

        let (child, _) = svc
            .create_child(
                parent_id,
                "Lee".into(),
                "cat".into(),
                2015,
                "p@e.com".into(),
            )
            .await
            .unwrap();

        let class = svc
            .create_class(teacher_id, "Nature Makers".into())
            .await
            .unwrap();

        // Before join: gated action blocked
        let err = svc
            .check_gate(child.id, &GatedAction::Share)
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Forbidden(_)));

        svc.join_class_by_code(child.id, &class.class_code)
            .await
            .unwrap();

        // After join: gated action allowed
        svc.check_gate(child.id, &GatedAction::Share).await.unwrap();
    }

    #[tokio::test]
    async fn class_join_twice_fails_with_conflict() {
        let (_, svc) = make_service();
        let teacher_id = Uuid::new_v4();
        let parent_id = Uuid::new_v4();
        let (child, _) = svc
            .create_child(
                parent_id,
                "Dup".into(),
                "cat".into(),
                2016,
                "p@e.com".into(),
            )
            .await
            .unwrap();
        let class = svc
            .create_class(teacher_id, "Dup Class".into())
            .await
            .unwrap();
        svc.join_class_by_code(child.id, &class.class_code)
            .await
            .unwrap();
        let err = svc
            .join_class_by_code(child.id, &class.class_code)
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Conflict(_)));
    }

    #[tokio::test]
    async fn invalid_class_code_returns_not_found() {
        let (_, svc) = make_service();
        let err = svc
            .join_class_by_code(Uuid::new_v4(), "XXXXXX")
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::NotFound));
    }

    #[tokio::test]
    async fn grant_invalid_token_returns_unauthorized() {
        let (_, svc) = make_service();
        let err = svc
            .grant_consent("not-a-real-token".into())
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Unauthorized(_)));
    }
}
