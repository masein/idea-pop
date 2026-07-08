//! Authentication service — register, login, refresh, email verification.
//!
//! Pure business logic; all IO is delegated to port traits. Unit-tested here
//! with in-memory fakes.

use std::sync::Arc;

use chrono::Duration;
use uuid::Uuid;

use crate::{
    ports::{AccountRepo, Clock, EmailSender, PasswordHasher, TokenIssuer},
    Account, DomainError, RefreshSession, Role, TokenPair,
};

const MIN_PASSWORD_LEN: usize = 8;
const MAX_PASSWORD_LEN: usize = 72;
const REFRESH_TTL_DAYS: i64 = 30;
/// After rotation the OLD refresh token stays valid this long. A page reload
/// can abort the refresh response after the server rotated — without a grace
/// tail the browser keeps a dead cookie and the user is silently logged out.
const ROTATION_GRACE_SECS: i64 = 60;
/// Matches the kid token expiry configured on the issuer (15 minutes).
const KID_ACCESS_TTL_SECS: i64 = 900;
const VERIFICATION_TTL_HOURS: i64 = 24;

pub struct AuthService {
    pub repo: Arc<dyn AccountRepo>,
    pub hasher: Arc<dyn PasswordHasher>,
    pub tokens: Arc<dyn TokenIssuer>,
    pub email: Arc<dyn EmailSender>,
    pub clock: Arc<dyn Clock>,
}

impl AuthService {
    pub fn new(
        repo: Arc<dyn AccountRepo>,
        hasher: Arc<dyn PasswordHasher>,
        tokens: Arc<dyn TokenIssuer>,
        email: Arc<dyn EmailSender>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            repo,
            hasher,
            tokens,
            email,
            clock,
        }
    }

    pub async fn register(
        &self,
        email: String,
        password: String,
        role: Role,
        locale: String,
    ) -> Result<Account, DomainError> {
        if !is_valid_email(&email) {
            return Err(DomainError::Validation("invalid email address".into()));
        }
        if password.len() < MIN_PASSWORD_LEN {
            return Err(DomainError::Validation(format!(
                "password must be at least {MIN_PASSWORD_LEN} characters"
            )));
        }
        if password.len() > MAX_PASSWORD_LEN {
            return Err(DomainError::Validation(format!(
                "password must be at most {MAX_PASSWORD_LEN} characters"
            )));
        }
        if self.repo.find_by_email(&email).await?.is_some() {
            return Err(DomainError::Conflict("email already registered".into()));
        }

        let password_hash = self.hasher.hash(&password).await?;
        let now = self.clock.now();
        let account = Account::new(
            Uuid::new_v4(),
            email.clone(),
            password_hash,
            role,
            locale,
            now,
        );
        self.repo.create(&account).await?;

        // Kick off email verification immediately after registration.
        self.send_verification(account.id, &account.email, &account.locale)
            .await?;

        Ok(account)
    }

    pub async fn login(
        &self,
        email: String,
        password: String,
    ) -> Result<(Account, TokenPair), DomainError> {
        let account = self
            .repo
            .find_by_email(&email)
            .await?
            .ok_or_else(|| DomainError::Unauthorized("invalid credentials".into()))?;

        if !self
            .hasher
            .verify(&password, &account.password_hash)
            .await?
        {
            return Err(DomainError::Unauthorized("invalid credentials".into()));
        }

        let pair = self.tokens.issue(account.id, &account.role).await?;
        let now = self.clock.now();
        let session = RefreshSession {
            id: Uuid::new_v4(),
            account_id: account.id,
            refresh_token_hash: self.tokens.hash_token(&pair.refresh_token),
            child_id: None,
            expires_at: now + Duration::days(REFRESH_TTL_DAYS),
            revoked_at: None,
            created_at: now,
        };
        self.repo.create_refresh_session(&session).await?;

        Ok((account, pair))
    }

    pub async fn refresh(&self, refresh_token: String) -> Result<TokenPair, DomainError> {
        let hash = self.tokens.hash_token(&refresh_token);
        let session = self
            .repo
            .find_refresh_session_by_hash(&hash)
            .await?
            .ok_or_else(|| DomainError::Unauthorized("invalid refresh token".into()))?;

        let now = self.clock.now();
        if session.revoked_at.is_some() || now > session.expires_at {
            return Err(DomainError::Unauthorized(
                "refresh token expired or revoked".into(),
            ));
        }

        // Rotate with a grace tail: the old session stays valid briefly so a
        // client that never received the rotated cookie (aborted response,
        // page reload) can retry. Logout still hard-revokes immediately.
        self.repo
            .expire_refresh_session(session.id, now + Duration::seconds(ROTATION_GRACE_SECS))
            .await?;

        let account = self
            .repo
            .find_by_id(session.account_id)
            .await?
            .ok_or_else(|| DomainError::Unauthorized("account not found".into()))?;

        // Kid sessions re-issue a KID token — never the parent's adult token.
        let pair = match session.child_id {
            Some(child_id) => {
                let access_token = self.tokens.issue_kid(child_id, account.id).await?;
                TokenPair {
                    access_token,
                    refresh_token: self.tokens.generate_opaque_token(),
                    expires_in: KID_ACCESS_TTL_SECS,
                }
            }
            None => self.tokens.issue(account.id, &account.role).await?,
        };
        let new_session = RefreshSession {
            id: Uuid::new_v4(),
            account_id: account.id,
            refresh_token_hash: self.tokens.hash_token(&pair.refresh_token),
            child_id: session.child_id,
            expires_at: now + Duration::days(REFRESH_TTL_DAYS),
            revoked_at: None,
            created_at: now,
        };
        self.repo.create_refresh_session(&new_session).await?;

        Ok(pair)
    }

    /// Open a refresh session for a CHILD (kid self-signup): the cookie this
    /// token goes into lets the kid survive page reloads; refreshing it
    /// yields kid-scoped tokens only.
    pub async fn issue_kid_refresh(
        &self,
        child_id: Uuid,
        parent_account_id: Uuid,
    ) -> Result<String, DomainError> {
        let refresh_token = self.tokens.generate_opaque_token();
        let now = self.clock.now();
        let session = RefreshSession {
            id: Uuid::new_v4(),
            account_id: parent_account_id,
            refresh_token_hash: self.tokens.hash_token(&refresh_token),
            child_id: Some(child_id),
            expires_at: now + Duration::days(REFRESH_TTL_DAYS),
            revoked_at: None,
            created_at: now,
        };
        self.repo.create_refresh_session(&session).await?;
        Ok(refresh_token)
    }

    /// Revoke the session behind `refresh_token`. Idempotent: unknown or
    /// already-revoked tokens are a no-op (logout must never fail the user).
    pub async fn logout(&self, refresh_token: String) -> Result<(), DomainError> {
        let hash = self.tokens.hash_token(&refresh_token);
        if let Some(session) = self.repo.find_refresh_session_by_hash(&hash).await? {
            if session.revoked_at.is_none() {
                self.repo.revoke_refresh_session(session.id).await?;
            }
        }
        Ok(())
    }

    pub async fn request_email_verification(&self, account_id: Uuid) -> Result<(), DomainError> {
        let account = self
            .repo
            .find_by_id(account_id)
            .await?
            .ok_or(DomainError::NotFound)?;

        if account.is_email_verified() {
            return Ok(());
        }

        self.send_verification(account.id, &account.email, &account.locale)
            .await
    }

    pub async fn confirm_email_verification(&self, token: String) -> Result<(), DomainError> {
        let hash = self.tokens.hash_token(&token);
        let mut account = self
            .repo
            .find_by_verification_token_hash(&hash)
            .await?
            .ok_or_else(|| DomainError::Unauthorized("invalid verification token".into()))?;

        let now = self.clock.now();
        if let Some(exp) = account.verification_token_expires_at {
            if now > exp {
                return Err(DomainError::Unauthorized(
                    "verification token expired".into(),
                ));
            }
        }

        account.email_verified_at = Some(now);
        account.verification_token_hash = None;
        account.verification_token_expires_at = None;
        account.updated_at = now;
        self.repo.update(&account).await?;

        Ok(())
    }

    // ── internal ─────────────────────────────────────────────────────────────

    async fn send_verification(
        &self,
        account_id: Uuid,
        email: &str,
        locale: &str,
    ) -> Result<(), DomainError> {
        let raw_token = self.tokens.generate_opaque_token();
        let hash = self.tokens.hash_token(&raw_token);
        let now = self.clock.now();

        let mut account = self
            .repo
            .find_by_id(account_id)
            .await?
            .ok_or(DomainError::NotFound)?;
        account.verification_token_hash = Some(hash);
        account.verification_token_expires_at = Some(now + Duration::hours(VERIFICATION_TTL_HOURS));
        account.updated_at = now;
        self.repo.update(&account).await?;

        self.email
            .send_verification_email(email, &raw_token, locale)
            .await?;

        Ok(())
    }
}

fn is_valid_email(email: &str) -> bool {
    let parts: Vec<&str> = email.splitn(2, '@').collect();
    if parts.len() != 2 {
        return false;
    }
    let local = parts[0];
    let domain = parts[1];
    !local.is_empty() && domain.contains('.') && domain.len() > 2
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;
    use chrono::Utc;
    use std::sync::Mutex;

    use crate::ports::{AccountRepo, Clock, EmailSender, PasswordHasher, TokenIssuer};
    use crate::{RefreshSession, TokenClaims, TokenPair};

    // ── fakes ────────────────────────────────────────────────────────────────

    #[derive(Default)]
    struct FakeRepo {
        accounts: Mutex<Vec<Account>>,
        sessions: Mutex<Vec<RefreshSession>>,
    }

    #[async_trait]
    impl AccountRepo for FakeRepo {
        async fn find_by_email(&self, email: &str) -> Result<Option<Account>, DomainError> {
            Ok(self
                .accounts
                .lock()
                .unwrap()
                .iter()
                .find(|a| a.email == email)
                .cloned())
        }
        async fn find_by_id(&self, id: Uuid) -> Result<Option<Account>, DomainError> {
            Ok(self
                .accounts
                .lock()
                .unwrap()
                .iter()
                .find(|a| a.id == id)
                .cloned())
        }
        async fn find_by_verification_token_hash(
            &self,
            hash: &str,
        ) -> Result<Option<Account>, DomainError> {
            Ok(self
                .accounts
                .lock()
                .unwrap()
                .iter()
                .find(|a| a.verification_token_hash.as_deref() == Some(hash))
                .cloned())
        }
        async fn create(&self, account: &Account) -> Result<(), DomainError> {
            self.accounts.lock().unwrap().push(account.clone());
            Ok(())
        }
        async fn update(&self, account: &Account) -> Result<(), DomainError> {
            let mut accounts = self.accounts.lock().unwrap();
            if let Some(a) = accounts.iter_mut().find(|a| a.id == account.id) {
                *a = account.clone();
            }
            Ok(())
        }
        async fn create_refresh_session(
            &self,
            session: &RefreshSession,
        ) -> Result<(), DomainError> {
            self.sessions.lock().unwrap().push(session.clone());
            Ok(())
        }
        async fn find_refresh_session_by_hash(
            &self,
            hash: &str,
        ) -> Result<Option<RefreshSession>, DomainError> {
            Ok(self
                .sessions
                .lock()
                .unwrap()
                .iter()
                .find(|s| s.refresh_token_hash == hash)
                .cloned())
        }
        async fn expire_refresh_session(
            &self,
            session_id: Uuid,
            expires_at: chrono::DateTime<Utc>,
        ) -> Result<(), DomainError> {
            let mut sessions = self.sessions.lock().unwrap();
            if let Some(s) = sessions.iter_mut().find(|s| s.id == session_id) {
                s.expires_at = expires_at;
            }
            Ok(())
        }

        async fn revoke_refresh_session(&self, session_id: Uuid) -> Result<(), DomainError> {
            let mut sessions = self.sessions.lock().unwrap();
            if let Some(s) = sessions.iter_mut().find(|s| s.id == session_id) {
                s.revoked_at = Some(Utc::now());
            }
            Ok(())
        }
    }

    struct FakeHasher;

    #[async_trait]
    impl PasswordHasher for FakeHasher {
        async fn hash(&self, password: &str) -> Result<String, DomainError> {
            Ok(format!("hashed:{password}"))
        }
        async fn verify(&self, password: &str, hash: &str) -> Result<bool, DomainError> {
            Ok(hash == format!("hashed:{password}"))
        }
    }

    struct FakeTokenIssuer;

    #[async_trait]
    impl TokenIssuer for FakeTokenIssuer {
        async fn issue(&self, account_id: Uuid, role: &Role) -> Result<TokenPair, DomainError> {
            Ok(TokenPair {
                access_token: format!("access:{account_id}:{}", role.as_str()),
                refresh_token: format!("refresh:{account_id}"),
                expires_in: 900,
            })
        }
        async fn issue_kid(&self, child_id: Uuid, _parent_id: Uuid) -> Result<String, DomainError> {
            Ok(format!("kid:{child_id}"))
        }
        async fn verify_access(&self, token: &str) -> Result<TokenClaims, DomainError> {
            // "access:<uuid>:<role>"
            let parts: Vec<&str> = token.splitn(3, ':').collect();
            if parts.len() != 3 || parts[0] != "access" {
                return Err(DomainError::Unauthorized("bad token".into()));
            }
            let account_id = Uuid::parse_str(parts[1])
                .map_err(|_| DomainError::Unauthorized("bad token".into()))?;
            let role =
                Role::from_slug(parts[2]).ok_or(DomainError::Unauthorized("bad token".into()))?;
            Ok(TokenClaims {
                account_id,
                role,
                child_id: None,
            })
        }
        fn hash_token(&self, raw: &str) -> String {
            format!("sha256:{raw}")
        }
        fn generate_opaque_token(&self) -> String {
            "fake-verification-token".into()
        }
    }

    #[derive(Default)]
    struct FakeEmailSender {
        sent: Mutex<Vec<(String, String)>>,
    }

    #[async_trait]
    impl EmailSender for FakeEmailSender {
        async fn send_verification_email(
            &self,
            to: &str,
            token: &str,
            _locale: &str,
        ) -> Result<(), DomainError> {
            self.sent
                .lock()
                .unwrap()
                .push((to.to_owned(), token.to_owned()));
            Ok(())
        }
    }

    struct FakeClock {
        now: chrono::DateTime<Utc>,
    }
    impl Clock for FakeClock {
        fn now(&self) -> chrono::DateTime<Utc> {
            self.now
        }
    }

    fn make_service() -> (Arc<FakeRepo>, Arc<FakeEmailSender>, AuthService) {
        let repo = Arc::new(FakeRepo::default());
        let email = Arc::new(FakeEmailSender::default());
        let svc = AuthService::new(
            repo.clone(),
            Arc::new(FakeHasher),
            Arc::new(FakeTokenIssuer),
            email.clone(),
            Arc::new(FakeClock { now: Utc::now() }),
        );
        (repo, email, svc)
    }

    // ── tests ─────────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn hasher_roundtrip() {
        let h = FakeHasher;
        let hash = h.hash("secret").await.unwrap();
        assert!(h.verify("secret", &hash).await.unwrap());
        assert!(!h.verify("wrong", &hash).await.unwrap());
    }

    #[tokio::test]
    async fn register_happy_path() {
        let (_, email_sender, svc) = make_service();
        let account = svc
            .register(
                "alice@example.com".into(),
                "password123".into(),
                Role::Parent,
                "en".into(),
            )
            .await
            .unwrap();
        assert_eq!(account.email, "alice@example.com");
        assert!(!account.is_email_verified());
        // Verification email sent
        assert_eq!(email_sender.sent.lock().unwrap().len(), 1);
    }

    #[tokio::test]
    async fn register_duplicate_email_returns_conflict() {
        let (_, _, svc) = make_service();
        svc.register(
            "dup@example.com".into(),
            "password123".into(),
            Role::Parent,
            "en".into(),
        )
        .await
        .unwrap();
        let err = svc
            .register(
                "dup@example.com".into(),
                "password456".into(),
                Role::Parent,
                "en".into(),
            )
            .await
            .unwrap_err();
        assert_eq!(
            err,
            DomainError::Conflict("email already registered".into())
        );
    }

    #[tokio::test]
    async fn register_short_password_returns_validation() {
        let (_, _, svc) = make_service();
        let err = svc
            .register(
                "x@example.com".into(),
                "short".into(),
                Role::Parent,
                "en".into(),
            )
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Validation(_)));
    }

    #[tokio::test]
    async fn login_bad_creds_returns_unauthorized() {
        let (_, _, svc) = make_service();
        svc.register(
            "user@example.com".into(),
            "rightpass".into(),
            Role::Parent,
            "en".into(),
        )
        .await
        .unwrap();
        let err = svc
            .login("user@example.com".into(), "wrongpass".into())
            .await
            .unwrap_err();
        assert_eq!(err, DomainError::Unauthorized("invalid credentials".into()));
    }

    #[tokio::test]
    async fn login_unknown_email_returns_unauthorized() {
        let (_, _, svc) = make_service();
        let err = svc
            .login("ghost@example.com".into(), "pass".into())
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Unauthorized(_)));
    }

    #[tokio::test]
    async fn refresh_token_rotation_with_grace_tail() {
        let (repo, _, svc) = make_service();
        svc.register(
            "rot@example.com".into(),
            "password123".into(),
            Role::Parent,
            "en".into(),
        )
        .await
        .unwrap();
        let (_, pair1) = svc
            .login("rot@example.com".into(), "password123".into())
            .await
            .unwrap();
        let _pair2 = svc.refresh(pair1.refresh_token.clone()).await.unwrap();

        // The old session's lifetime was cut to the grace tail, not revoked:
        // a client whose rotated cookie never arrived can still retry…
        {
            let sessions = repo.sessions.lock().unwrap();
            let old = sessions
                .iter()
                .find(|s| s.refresh_token_hash == format!("sha256:{}", pair1.refresh_token))
                .expect("old session kept");
            assert!(old.revoked_at.is_none(), "rotation must not hard-revoke");
            assert!(
                old.expires_at <= Utc::now() + Duration::seconds(ROTATION_GRACE_SECS + 1),
                "old session must expire within the grace tail"
            );
        }
        // …so an immediate reuse of the old token still works (issues a fresh
        // pair). Hard-revoke-on-logout is covered by the logout test.
        svc.refresh(pair1.refresh_token.clone())
            .await
            .expect("reuse within the grace tail must succeed");
    }

    #[tokio::test]
    async fn logout_revokes_the_session_and_is_idempotent() {
        let (_, _, svc) = make_service();
        svc.register(
            "out@example.com".into(),
            "password123".into(),
            Role::Parent,
            "en".into(),
        )
        .await
        .unwrap();
        let (_, pair) = svc
            .login("out@example.com".into(), "password123".into())
            .await
            .unwrap();

        svc.logout(pair.refresh_token.clone()).await.unwrap();
        // The refresh token no longer works…
        let err = svc.refresh(pair.refresh_token.clone()).await.unwrap_err();
        assert!(matches!(err, DomainError::Unauthorized(_)));
        // …and logging out again (or with garbage) is still Ok.
        svc.logout(pair.refresh_token).await.unwrap();
        svc.logout("not-a-real-token".into()).await.unwrap();
    }

    #[tokio::test]
    async fn email_verification_happy() {
        let (repo, email_sender, svc) = make_service();
        let account = svc
            .register(
                "ev@example.com".into(),
                "password123".into(),
                Role::Parent,
                "en".into(),
            )
            .await
            .unwrap();
        let token = email_sender.sent.lock().unwrap()[0].1.clone();
        svc.confirm_email_verification(token).await.unwrap();
        let updated = repo.find_by_id(account.id).await.unwrap().unwrap();
        assert!(updated.is_email_verified());
    }

    #[tokio::test]
    async fn email_verification_wrong_token_returns_unauthorized() {
        let (_, _, svc) = make_service();
        svc.register(
            "ev2@example.com".into(),
            "password123".into(),
            Role::Parent,
            "en".into(),
        )
        .await
        .unwrap();
        let err = svc
            .confirm_email_verification("bad-token".into())
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Unauthorized(_)));
    }

    #[tokio::test]
    async fn email_verification_expired() {
        // Use a clock 25 h in the future to simulate expiry.
        let repo = Arc::new(FakeRepo::default());
        let email_sender = Arc::new(FakeEmailSender::default());
        let now = Utc::now();
        let svc = AuthService::new(
            repo.clone(),
            Arc::new(FakeHasher),
            Arc::new(FakeTokenIssuer),
            email_sender.clone(),
            Arc::new(FakeClock { now }),
        );
        let account = svc
            .register(
                "exp@example.com".into(),
                "password123".into(),
                Role::Parent,
                "en".into(),
            )
            .await
            .unwrap();
        let token = email_sender.sent.lock().unwrap()[0].1.clone();

        // Advance clock 25 h
        let future_svc = AuthService::new(
            repo,
            Arc::new(FakeHasher),
            Arc::new(FakeTokenIssuer),
            email_sender,
            Arc::new(FakeClock {
                now: now + Duration::hours(25),
            }),
        );
        let _ = account;
        let err = future_svc
            .confirm_email_verification(token)
            .await
            .unwrap_err();
        assert!(matches!(err, DomainError::Unauthorized(_)));
    }
}
