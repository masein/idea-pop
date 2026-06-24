//! JWT token issuer + refresh-token utilities.

use async_trait::async_trait;
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use idea_pop_domain::{DomainError, Role, TokenClaims, TokenIssuer, TokenPair};

// JWT claims for adult tokens.
#[derive(Debug, Serialize, Deserialize)]
struct JwtClaims {
    sub: String,
    role: String,
    exp: i64,
    iat: i64,
    /// Present only on kid-scoped tokens: the parent's account UUID.
    #[serde(skip_serializing_if = "Option::is_none")]
    pid: Option<String>,
}

pub struct JwtTokenIssuer {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    expiry_secs: i64,
    /// Kid tokens get a longer expiry (7 days) since there's no refresh flow.
    kid_expiry_secs: i64,
}

impl JwtTokenIssuer {
    pub fn new(secret: &str, expiry_secs: i64) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
            expiry_secs,
            kid_expiry_secs: 60 * 60 * 24 * 7, // 7 days
        }
    }
}

#[async_trait]
impl TokenIssuer for JwtTokenIssuer {
    async fn issue(&self, account_id: Uuid, role: &Role) -> Result<TokenPair, DomainError> {
        let now = Utc::now().timestamp();
        let claims = JwtClaims {
            sub: account_id.to_string(),
            role: role.as_str().to_owned(),
            iat: now,
            exp: now + self.expiry_secs,
            pid: None,
        };
        let access_token = encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| DomainError::Internal(format!("jwt encode: {e}")))?;
        let refresh_token = self.generate_opaque_token();
        Ok(TokenPair {
            access_token,
            refresh_token,
            expires_in: self.expiry_secs,
        })
    }

    async fn issue_kid(
        &self,
        child_id: Uuid,
        parent_account_id: Uuid,
    ) -> Result<String, DomainError> {
        let now = Utc::now().timestamp();
        let claims = JwtClaims {
            sub: child_id.to_string(),
            role: Role::Kid.as_str().to_owned(),
            iat: now,
            exp: now + self.kid_expiry_secs,
            pid: Some(parent_account_id.to_string()),
        };
        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| DomainError::Internal(format!("jwt encode kid: {e}")))
    }

    async fn verify_access(&self, token: &str) -> Result<TokenClaims, DomainError> {
        let mut validation = Validation::default();
        validation.leeway = 0;
        let data = decode::<JwtClaims>(token, &self.decoding_key, &validation)
            .map_err(|_| DomainError::Unauthorized("invalid or expired access token".into()))?;

        let role = Role::from_slug(&data.claims.role)
            .ok_or_else(|| DomainError::Unauthorized("unknown role in token".into()))?;

        let (account_id, child_id) = if role == Role::Kid {
            // For kid tokens: sub = child_id, pid = parent_account_id
            let child_id = Uuid::parse_str(&data.claims.sub)
                .map_err(|_| DomainError::Unauthorized("malformed kid token subject".into()))?;
            let parent_id = data
                .claims
                .pid
                .as_deref()
                .and_then(|s| Uuid::parse_str(s).ok())
                .ok_or_else(|| {
                    DomainError::Unauthorized("kid token missing parent claim".into())
                })?;
            (parent_id, Some(child_id))
        } else {
            let account_id = Uuid::parse_str(&data.claims.sub)
                .map_err(|_| DomainError::Unauthorized("malformed token subject".into()))?;
            (account_id, None)
        };

        Ok(TokenClaims {
            account_id,
            role,
            child_id,
        })
    }

    fn hash_token(&self, raw: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        hex::encode(hasher.finalize())
    }

    fn generate_opaque_token(&self) -> String {
        let mut bytes = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut bytes);
        hex::encode(bytes)
    }
}
