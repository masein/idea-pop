//! JWT auth extractor and RBAC role guard.

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, HeaderMap, StatusCode},
    response::Response,
};
use idea_pop_domain::{DomainError, Role, TokenClaims};

use crate::{error::problem, state::AppState};

// ── Authenticated principal ───────────────────────────────────────────────────

/// Decoded, verified JWT claims injected by the auth extractor.
#[derive(Debug, Clone)]
pub struct AuthToken(pub TokenClaims);

#[async_trait]
impl FromRequestParts<AppState> for AuthToken {
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = bearer_token(&parts.headers).ok_or_else(|| {
            problem(
                StatusCode::UNAUTHORIZED,
                "missing-token",
                "Missing Bearer token",
            )
        })?;

        let claims = state
            .tokens
            .verify_access(token)
            .await
            .map_err(|e| match e {
                DomainError::Unauthorized(msg) => {
                    problem(StatusCode::UNAUTHORIZED, "invalid-token", msg)
                }
                _ => problem(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal",
                    "Token verification failed",
                ),
            })?;

        Ok(AuthToken(claims))
    }
}

// ── Role guard ────────────────────────────────────────────────────────────────

/// Extractor that requires a specific role (or admin).
/// Rejects with 403 if the authenticated user lacks the required role.
pub struct RequireRole(pub TokenClaims);

impl RequireRole {
    pub fn guard(claims: &TokenClaims, allowed: &[Role]) -> Result<(), Box<Response>> {
        if claims.role == Role::Admin || allowed.contains(&claims.role) {
            Ok(())
        } else {
            Err(Box::new(problem(
                StatusCode::FORBIDDEN,
                "forbidden",
                "Insufficient role",
            )))
        }
    }
}

// ── helpers ───────────────────────────────────────────────────────────────────

fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
}
