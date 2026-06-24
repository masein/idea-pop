//! Parental consent grant/revoke handlers.
//!
//! POST /consents/{token}/grant  — parent clicks link from email
//! POST /consents/{child_id}/revoke — parent revokes (re-restricts child)

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use uuid::Uuid;

use crate::{error::ApiError, extractor::AdultAuth, state::AppState};

// ── Grant ─────────────────────────────────────────────────────────────────────

#[utoipa::path(
    post, path = "/consents/{token}/grant",
    tag = "consents",
    params(("token" = String, Path, description = "Opaque consent token from email link")),
    responses(
        (status = 204, description = "Consent granted"),
        (status = 401, description = "Token invalid or expired", body = crate::ProblemDetail),
        (status = 409, description = "Already used / revoked", body = crate::ProblemDetail),
    )
)]
pub async fn grant_consent(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    state
        .consent
        .grant_consent(token)
        .await
        .map_err(ApiError::Domain)?;
    Ok(StatusCode::NO_CONTENT)
}

// ── Revoke ────────────────────────────────────────────────────────────────────

#[utoipa::path(
    post, path = "/consents/{child_id}/revoke",
    tag = "consents",
    params(("child_id" = Uuid, Path, description = "Child profile UUID")),
    responses(
        (status = 204, description = "Consent revoked; child is now RESTRICTED"),
        (status = 401, description = "Unauthorized", body = crate::ProblemDetail),
        (status = 403, description = "Not the parent of this child", body = crate::ProblemDetail),
        (status = 404, description = "Child not found", body = crate::ProblemDetail),
        (status = 409, description = "Already revoked / still pending", body = crate::ProblemDetail),
    )
)]
pub async fn revoke_consent(
    AdultAuth(claims): AdultAuth,
    State(state): State<AppState>,
    Path(child_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    state
        .consent
        .revoke_consent(child_id, claims.account_id)
        .await
        .map_err(ApiError::Domain)?;
    Ok(StatusCode::NO_CONTENT)
}
