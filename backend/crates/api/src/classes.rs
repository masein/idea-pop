//! Class management — teacher creates, child joins (ClassGranted path).
//!
//! POST /classes          — teacher creates a class
//! POST /classes/{code}/join — child joins by class code

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use idea_pop_domain::Role;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::{error::ApiError, extractor::AuthToken, state::AppState};

// ── DTOs ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateClassRequest {
    #[validate(length(min = 1, max = 100, message = "class name must be 1–100 characters"))]
    pub name: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CreateClassResponse {
    pub class_id: Uuid,
    pub name: String,
    pub class_code: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct JoinClassResponse {
    pub class_id: Uuid,
    pub class_code: String,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

#[utoipa::path(
    post, path = "/classes",
    tag = "classes",
    request_body = CreateClassRequest,
    responses(
        (status = 201, description = "Class created", body = CreateClassResponse),
        (status = 401, description = "Unauthorized", body = crate::ProblemDetail),
        (status = 403, description = "Teacher or Admin role required", body = crate::ProblemDetail),
        (status = 422, description = "Validation error", body = crate::ProblemDetail),
    )
)]
pub async fn create_class(
    AuthToken(claims): AuthToken,
    State(state): State<AppState>,
    Json(body): Json<CreateClassRequest>,
) -> Result<(StatusCode, Json<CreateClassResponse>), ApiError> {
    if !matches!(claims.role, Role::Teacher | Role::Admin) {
        return Err(ApiError::Domain(idea_pop_domain::DomainError::Forbidden(
            "Teacher or Admin role required".into(),
        )));
    }
    body.validate()
        .map_err(|e| idea_pop_domain::DomainError::Validation(e.to_string()))?;

    let class = state
        .consent
        .create_class(claims.account_id, body.name)
        .await
        .map_err(ApiError::Domain)?;

    Ok((
        StatusCode::CREATED,
        Json(CreateClassResponse {
            class_id: class.id,
            name: class.name,
            class_code: class.class_code,
        }),
    ))
}

#[utoipa::path(
    post, path = "/classes/{code}/join",
    tag = "classes",
    params(("code" = String, Path, description = "Unique class code")),
    responses(
        (status = 200, description = "Joined class; consent is now ClassGranted", body = JoinClassResponse),
        (status = 401, description = "Unauthorized", body = crate::ProblemDetail),
        (status = 404, description = "Class code not found", body = crate::ProblemDetail),
        (status = 409, description = "Already a member", body = crate::ProblemDetail),
    )
)]
pub async fn join_class(
    AuthToken(claims): AuthToken,
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<JoinClassResponse>, ApiError> {
    // Only kids can join a class (or admin for testing).
    let child_id = if claims.role == Role::Kid {
        claims.child_id.ok_or_else(|| {
            ApiError::Domain(idea_pop_domain::DomainError::Internal(
                "kid token missing child_id".into(),
            ))
        })?
    } else if claims.role == Role::Admin {
        claims.account_id
    } else {
        return Err(ApiError::Domain(idea_pop_domain::DomainError::Forbidden(
            "only children can join a class".into(),
        )));
    };

    state
        .consent
        .join_class_by_code(child_id, &code)
        .await
        .map_err(ApiError::Domain)?;

    let class = state
        .consent
        .class_repo
        .find_by_code(&code)
        .await
        .map_err(ApiError::Domain)?
        .ok_or(ApiError::Domain(idea_pop_domain::DomainError::NotFound))?;

    Ok(Json(JoinClassResponse {
        class_id: class.id,
        class_code: class.class_code,
    }))
}
