//! SQLx implementations of ChildRepo, ConsentRepo, ClassRepo, and
//! the consent email sender adapter.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use idea_pop_domain::{
    ChildProfile, ChildRepo, Class, ClassRepo, ConsentEmailSender, ConsentRepo, ConsentStatus,
    DomainError, ParentalConsent,
};

// ── helpers ───────────────────────────────────────────────────────────────────

fn sqlx_err(e: sqlx::Error) -> DomainError {
    tracing::error!(error = %e, "database error");
    DomainError::Internal("database error".into())
}

fn parse_status(s: &str) -> Result<ConsentStatus, DomainError> {
    ConsentStatus::from_slug(s)
        .ok_or_else(|| DomainError::Internal(format!("unknown consent status '{s}'")))
}

// ── SqlxChildRepo ─────────────────────────────────────────────────────────────

pub struct SqlxChildRepo {
    pool: PgPool,
}

impl SqlxChildRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ChildRepo for SqlxChildRepo {
    async fn create(&self, p: &ChildProfile) -> Result<(), DomainError> {
        sqlx::query!(
            r#"INSERT INTO child_profiles
               (id, parent_account_id, nickname, avatar_id, birth_year, created_at)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
            p.id,
            p.parent_account_id,
            p.nickname,
            p.avatar_id as i16,
            p.birth_year as i16,
            p.created_at,
        )
        .execute(&self.pool)
        .await
        .map_err(sqlx_err)?;
        Ok(())
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<ChildProfile>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, parent_account_id, nickname, avatar_id, birth_year, created_at
               FROM child_profiles WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(sqlx_err)?;

        Ok(row.map(|r| ChildProfile {
            id: r.id,
            parent_account_id: r.parent_account_id,
            nickname: r.nickname,
            avatar_id: r.avatar_id as u8,
            birth_year: r.birth_year as u16,
            created_at: r.created_at,
        }))
    }

    async fn find_by_parent(&self, parent_id: Uuid) -> Result<Vec<ChildProfile>, DomainError> {
        let rows = sqlx::query!(
            r#"SELECT id, parent_account_id, nickname, avatar_id, birth_year, created_at
               FROM child_profiles WHERE parent_account_id = $1 ORDER BY created_at"#,
            parent_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(sqlx_err)?;

        Ok(rows
            .into_iter()
            .map(|r| ChildProfile {
                id: r.id,
                parent_account_id: r.parent_account_id,
                nickname: r.nickname,
                avatar_id: r.avatar_id as u8,
                birth_year: r.birth_year as u16,
                created_at: r.created_at,
            })
            .collect())
    }
}

// ── SqlxConsentRepo ───────────────────────────────────────────────────────────

pub struct SqlxConsentRepo {
    pool: PgPool,
}

impl SqlxConsentRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ConsentRepo for SqlxConsentRepo {
    async fn create(&self, c: &ParentalConsent) -> Result<(), DomainError> {
        sqlx::query!(
            r#"INSERT INTO parental_consents
               (id, child_id, token_hash, status, sent_at, expires_at)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
            c.id,
            c.child_id,
            c.token_hash,
            c.status.as_str(),
            c.sent_at,
            c.expires_at,
        )
        .execute(&self.pool)
        .await
        .map_err(sqlx_err)?;
        Ok(())
    }

    async fn find_by_token_hash(&self, hash: &str) -> Result<Option<ParentalConsent>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, child_id, token_hash, status, sent_at, expires_at,
                      granted_at, revoked_at
               FROM parental_consents WHERE token_hash = $1"#,
            hash
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(sqlx_err)?;

        row.map(|r| {
            Ok(ParentalConsent {
                id: r.id,
                child_id: r.child_id,
                token_hash: r.token_hash,
                status: parse_status(&r.status)?,
                sent_at: r.sent_at,
                expires_at: r.expires_at,
                granted_at: r.granted_at,
                revoked_at: r.revoked_at,
            })
        })
        .transpose()
    }

    async fn find_latest_by_child(
        &self,
        child_id: Uuid,
    ) -> Result<Option<ParentalConsent>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, child_id, token_hash, status, sent_at, expires_at,
                      granted_at, revoked_at
               FROM parental_consents WHERE child_id = $1
               ORDER BY sent_at DESC LIMIT 1"#,
            child_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(sqlx_err)?;

        row.map(|r| {
            Ok(ParentalConsent {
                id: r.id,
                child_id: r.child_id,
                token_hash: r.token_hash,
                status: parse_status(&r.status)?,
                sent_at: r.sent_at,
                expires_at: r.expires_at,
                granted_at: r.granted_at,
                revoked_at: r.revoked_at,
            })
        })
        .transpose()
    }

    async fn update_status(
        &self,
        id: Uuid,
        status: ConsentStatus,
        now: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        let (granted_at, revoked_at) = match &status {
            ConsentStatus::Granted | ConsentStatus::ClassGranted => {
                (Some(now), None::<DateTime<Utc>>)
            }
            ConsentStatus::Revoked => (None, Some(now)),
            _ => (None, None),
        };
        sqlx::query!(
            r#"UPDATE parental_consents
               SET status = $2,
                   granted_at = COALESCE(granted_at, $3),
                   revoked_at = COALESCE(revoked_at, $4)
               WHERE id = $1"#,
            id,
            status.as_str(),
            granted_at,
            revoked_at,
        )
        .execute(&self.pool)
        .await
        .map_err(sqlx_err)?;
        Ok(())
    }
}

// ── SqlxClassRepo ─────────────────────────────────────────────────────────────

pub struct SqlxClassRepo {
    pool: PgPool,
}

impl SqlxClassRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ClassRepo for SqlxClassRepo {
    async fn create(&self, c: &Class) -> Result<(), DomainError> {
        sqlx::query!(
            r#"INSERT INTO classes (id, teacher_account_id, name, class_code, created_at)
               VALUES ($1, $2, $3, $4, $5)"#,
            c.id,
            c.teacher_account_id,
            c.name,
            c.class_code,
            c.created_at,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            if let sqlx::Error::Database(ref db) = e {
                if db.code().as_deref() == Some("23505") {
                    return DomainError::Conflict("class code already in use".into());
                }
            }
            sqlx_err(e)
        })?;
        Ok(())
    }

    async fn find_by_code(&self, code: &str) -> Result<Option<Class>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, teacher_account_id, name, class_code, created_at
               FROM classes WHERE class_code = $1"#,
            code
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(sqlx_err)?;

        Ok(row.map(|r| Class {
            id: r.id,
            teacher_account_id: r.teacher_account_id,
            name: r.name,
            class_code: r.class_code,
            created_at: r.created_at,
        }))
    }

    async fn add_member(&self, class_id: Uuid, child_id: Uuid) -> Result<(), DomainError> {
        sqlx::query!(
            r#"INSERT INTO class_memberships (class_id, child_id) VALUES ($1, $2)"#,
            class_id,
            child_id,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            if let sqlx::Error::Database(ref db) = e {
                if db.code().as_deref() == Some("23505") {
                    return DomainError::Conflict("child is already a member of this class".into());
                }
            }
            sqlx_err(e)
        })?;
        Ok(())
    }
}

// ── SMTP consent email sender ─────────────────────────────────────────────────

pub struct SmtpConsentEmailSender {
    app_url: String,
    from: String,
    transport: lettre::AsyncSmtpTransport<lettre::Tokio1Executor>,
}

impl SmtpConsentEmailSender {
    pub fn new(smtp_host: &str, smtp_port: u16, from: String, app_url: String) -> Self {
        let transport =
            lettre::AsyncSmtpTransport::<lettre::Tokio1Executor>::builder_dangerous(smtp_host)
                .port(smtp_port)
                .build();
        Self {
            app_url,
            from,
            transport,
        }
    }
}

#[async_trait]
impl ConsentEmailSender for SmtpConsentEmailSender {
    async fn send_consent_request(
        &self,
        parent_email: &str,
        child_nickname: &str,
        token: &str,
    ) -> Result<(), DomainError> {
        use lettre::{message::header::ContentType, AsyncTransport, Message};
        let link = format!("{}/consent/grant?token={}", self.app_url, token);
        let body = format!(
            "Hello!\n\n{child_nickname} has signed up for Idea Pop.\n\n\
            Please click the link below to give your parental consent:\n\n\
            {link}\n\nThis link expires in 24 hours.\n\n\
            If you did not create this account, please ignore this email."
        );
        let email = Message::builder()
            .from(
                self.from
                    .parse()
                    .map_err(|e| DomainError::Internal(format!("invalid from: {e}")))?,
            )
            .to(parent_email
                .parse()
                .map_err(|e| DomainError::Internal(format!("invalid to: {e}")))?)
            .subject(format!(
                "Parental consent required for {child_nickname} on Idea Pop"
            ))
            .header(ContentType::TEXT_PLAIN)
            .body(body)
            .map_err(|e| DomainError::Internal(format!("build email: {e}")))?;
        self.transport
            .send(email)
            .await
            .map_err(|e| DomainError::Internal(format!("smtp: {e}")))?;
        Ok(())
    }
}

/// No-op consent sender for tests.
pub struct NullConsentEmailSender;

#[async_trait]
impl ConsentEmailSender for NullConsentEmailSender {
    async fn send_consent_request(
        &self,
        parent_email: &str,
        child_nickname: &str,
        token: &str,
    ) -> Result<(), DomainError> {
        tracing::info!(
            to = parent_email,
            child = child_nickname,
            token,
            "NullConsentEmailSender: would send consent email"
        );
        Ok(())
    }
}
