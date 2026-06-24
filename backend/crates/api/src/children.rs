//! POST /children — child signup (parent creates child profile, restricted until consent).

use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::{error::ApiError, extractor::AdultAuth, state::AppState};

// ── DTO ───────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateChildRequest {
    #[validate(length(min = 1, max = 30, message = "nickname must be 1–30 characters"))]
    pub nickname: String,
    #[validate(range(min = 0, max = 127, message = "avatar_id out of range"))]
    pub avatar_id: u8,
    /// Child's birth year; must be 1980–2020.
    #[validate(range(min = 1980, max = 2020, message = "birth_year must be 1980–2020"))]
    pub birth_year: u16,
    #[validate(email(message = "invalid parent email"))]
    pub parent_email: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CreateChildResponse {
    pub child_id: Uuid,
    pub nickname: String,
    /// Kid-scoped access token (RESTRICTED until parent grants consent).
    pub access_token: String,
}

// ── Handler ───────────────────────────────────────────────────────────────────

#[utoipa::path(
    post, path = "/children",
    tag = "children",
    request_body = CreateChildRequest,
    responses(
        (status = 201, description = "Child profile created; consent email sent", body = CreateChildResponse),
        (status = 401, description = "Unauthorized", body = crate::ProblemDetail),
        (status = 403, description = "Forbidden (kid tokens cannot create children)", body = crate::ProblemDetail),
        (status = 422, description = "Validation error", body = crate::ProblemDetail),
    )
)]
pub async fn create_child(
    AdultAuth(claims): AdultAuth,
    State(state): State<AppState>,
    Json(body): Json<CreateChildRequest>,
) -> Result<(StatusCode, Json<CreateChildResponse>), ApiError> {
    body.validate()
        .map_err(|e| idea_pop_domain::DomainError::Validation(e.to_string()))?;

    let (child, token) = state
        .consent
        .create_child(
            claims.account_id,
            body.nickname.clone(),
            body.avatar_id,
            body.birth_year,
            body.parent_email,
        )
        .await
        .map_err(ApiError::Domain)?;

    Ok((
        StatusCode::CREATED,
        Json(CreateChildResponse {
            child_id: child.id,
            nickname: child.nickname,
            access_token: token,
        }),
    ))
}
