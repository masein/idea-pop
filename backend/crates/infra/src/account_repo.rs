//! SQLx implementation of the AccountRepo port.

use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use idea_pop_domain::{Account, AccountRepo, DomainError, RefreshSession, Role};

pub struct SqlxAccountRepo {
    pool: PgPool,
}

impl SqlxAccountRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

// ── helpers ───────────────────────────────────────────────────────────────────

fn parse_role(s: &str) -> Result<Role, DomainError> {
    Role::from_slug(s)
        .ok_or_else(|| DomainError::Internal(format!("unknown role '{s}' in database")))
}

fn sqlx_to_domain(e: sqlx::Error) -> DomainError {
    tracing::error!(error = %e, "database error");
    DomainError::Internal("database error".into())
}

// ── AccountRepo impl ──────────────────────────────────────────────────────────

#[async_trait]
impl AccountRepo for SqlxAccountRepo {
    async fn find_by_email(&self, email: &str) -> Result<Option<Account>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, email, password_hash, role, email_verified_at,
                      locale, verification_token_hash, verification_token_expires_at,
                      created_at, updated_at
               FROM accounts WHERE email = $1"#,
            email
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(sqlx_to_domain)?;

        row.map(|r| {
            Ok(Account {
                id: r.id,
                email: r.email,
                password_hash: r.password_hash,
                role: parse_role(&r.role)?,
                email_verified_at: r.email_verified_at,
                locale: r.locale,
                verification_token_hash: r.verification_token_hash,
                verification_token_expires_at: r.verification_token_expires_at,
                created_at: r.created_at,
                updated_at: r.updated_at,
            })
        })
        .transpose()
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Account>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, email, password_hash, role, email_verified_at,
                      locale, verification_token_hash, verification_token_expires_at,
                      created_at, updated_at
               FROM accounts WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(sqlx_to_domain)?;

        row.map(|r| {
            Ok(Account {
                id: r.id,
                email: r.email,
                password_hash: r.password_hash,
                role: parse_role(&r.role)?,
                email_verified_at: r.email_verified_at,
                locale: r.locale,
                verification_token_hash: r.verification_token_hash,
                verification_token_expires_at: r.verification_token_expires_at,
                created_at: r.created_at,
                updated_at: r.updated_at,
            })
        })
        .transpose()
    }

    async fn find_by_verification_token_hash(
        &self,
        hash: &str,
    ) -> Result<Option<Account>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, email, password_hash, role, email_verified_at,
                      locale, verification_token_hash, verification_token_expires_at,
                      created_at, updated_at
               FROM accounts WHERE verification_token_hash = $1"#,
            hash
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(sqlx_to_domain)?;

        row.map(|r| {
            Ok(Account {
                id: r.id,
                email: r.email,
                password_hash: r.password_hash,
                role: parse_role(&r.role)?,
                email_verified_at: r.email_verified_at,
                locale: r.locale,
                verification_token_hash: r.verification_token_hash,
                verification_token_expires_at: r.verification_token_expires_at,
                created_at: r.created_at,
                updated_at: r.updated_at,
            })
        })
        .transpose()
    }

    async fn create(&self, account: &Account) -> Result<(), DomainError> {
        sqlx::query!(
            r#"INSERT INTO accounts
               (id, email, password_hash, role, email_verified_at, locale,
                verification_token_hash, verification_token_expires_at, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#,
            account.id,
            account.email,
            account.password_hash,
            account.role.as_str(),
            account.email_verified_at,
            account.locale,
            account.verification_token_hash,
            account.verification_token_expires_at,
            account.created_at,
            account.updated_at,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| {
            if let sqlx::Error::Database(ref db) = e {
                if db.code().as_deref() == Some("23505") {
                    return DomainError::Conflict("email already registered".into());
                }
            }
            sqlx_to_domain(e)
        })?;
        Ok(())
    }

    async fn update(&self, account: &Account) -> Result<(), DomainError> {
        sqlx::query!(
            r#"UPDATE accounts SET
               email_verified_at = $2,
               verification_token_hash = $3,
               verification_token_expires_at = $4,
               updated_at = $5
               WHERE id = $1"#,
            account.id,
            account.email_verified_at,
            account.verification_token_hash,
            account.verification_token_expires_at,
            account.updated_at,
        )
        .execute(&self.pool)
        .await
        .map_err(sqlx_to_domain)?;
        Ok(())
    }

    async fn create_refresh_session(&self, session: &RefreshSession) -> Result<(), DomainError> {
        sqlx::query!(
            r#"INSERT INTO refresh_sessions
               (id, account_id, refresh_token_hash, expires_at, created_at)
               VALUES ($1, $2, $3, $4, $5)"#,
            session.id,
            session.account_id,
            session.refresh_token_hash,
            session.expires_at,
            session.created_at,
        )
        .execute(&self.pool)
        .await
        .map_err(sqlx_to_domain)?;
        Ok(())
    }

    async fn find_refresh_session_by_hash(
        &self,
        hash: &str,
    ) -> Result<Option<RefreshSession>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, account_id, refresh_token_hash, expires_at, revoked_at, created_at
               FROM refresh_sessions WHERE refresh_token_hash = $1"#,
            hash
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(sqlx_to_domain)?;

        Ok(row.map(|r| RefreshSession {
            id: r.id,
            account_id: r.account_id,
            refresh_token_hash: r.refresh_token_hash,
            expires_at: r.expires_at,
            revoked_at: r.revoked_at,
            created_at: r.created_at,
        }))
    }

    async fn revoke_refresh_session(&self, session_id: Uuid) -> Result<(), DomainError> {
        sqlx::query!(
            r#"UPDATE refresh_sessions SET revoked_at = NOW() WHERE id = $1"#,
            session_id
        )
        .execute(&self.pool)
        .await
        .map_err(sqlx_to_domain)?;
        Ok(())
    }

    async fn expire_refresh_session(
        &self,
        session_id: Uuid,
        expires_at: chrono::DateTime<chrono::Utc>,
    ) -> Result<(), DomainError> {
        // Runtime query on purpose: keeps the .sqlx offline cache untouched.
        sqlx::query("UPDATE refresh_sessions SET expires_at = $2 WHERE id = $1")
            .bind(session_id)
            .bind(expires_at)
            .execute(&self.pool)
            .await
            .map_err(sqlx_to_domain)?;
        Ok(())
    }
}

// ── helper: DateTime<Utc> conversions ────────────────────────────────────────
// sqlx returns Option<DateTime<Utc>> for TIMESTAMPTZ columns — no manual work needed.
