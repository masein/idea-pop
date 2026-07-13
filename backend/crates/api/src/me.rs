//! Protected routes — require a valid Bearer JWT.

use axum::{extract::State, Json};
use serde::Serialize;
use sqlx::Row;
use utoipa::ToSchema;
use uuid::Uuid;

use idea_pop_domain::DomainError;

use crate::{
    error::ApiError,
    extractor::{AdultAuth, KidAuth},
    state::AppState,
};

#[derive(Debug, Serialize, ToSchema)]
pub struct MeResponse {
    pub account_id: String,
    pub role: String,
    pub email: String,
    /// Friendly name for the portal header; may be empty.
    pub display_name: String,
}

/// Return the authenticated account's own info.
#[utoipa::path(
    get,
    path = "/me",
    tag = "accounts",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Current user", body = MeResponse),
        (status = 401, description = "Missing or invalid token"),
    )
)]
pub async fn me(
    State(state): State<AppState>,
    AdultAuth(claims): AdultAuth,
) -> Result<Json<MeResponse>, ApiError> {
    let row = sqlx::query("SELECT email, display_name FROM accounts WHERE id = $1")
        .bind(claims.account_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

    let (email, display_name) = match row {
        Some(r) => (
            r.try_get::<String, _>("email").unwrap_or_default(),
            r.try_get::<String, _>("display_name").unwrap_or_default(),
        ),
        None => (String::new(), String::new()),
    };

    Ok(Json(MeResponse {
        account_id: claims.account_id.to_string(),
        role: claims.role.as_str().to_owned(),
        email,
        display_name,
    }))
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ClassMissionResponse {
    pub challenge_id: String,
    pub title: String,
}

/// The challenge the kid's teacher has assigned to their class — the kid's
/// "current mission". Null when the kid is in no class, or the class has no
/// assignment yet. Scoped by the kid's own class membership (a kid can never
/// read another class's data).
#[utoipa::path(
    get,
    path = "/me/class-mission",
    tag = "challenges",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "The class's assigned challenge, or null", body = Option<ClassMissionResponse>),
        (status = 403, description = "Not a kid token", body = crate::ProblemDetail),
    )
)]
pub async fn class_mission(
    State(state): State<AppState>,
    KidAuth { child_id, .. }: KidAuth,
) -> Result<Json<Option<ClassMissionResponse>>, ApiError> {
    let row = sqlx::query(
        r#"SELECT ch.id, ch.title
           FROM class_memberships m
           JOIN classes c ON c.id = m.class_id
           JOIN challenges ch ON ch.id = c.assigned_challenge_id
           WHERE m.child_id = $1
           ORDER BY m.joined_at DESC
           LIMIT 1"#,
    )
    .bind(child_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| DomainError::Internal(e.to_string()))?;

    Ok(Json(row.map(|r| {
        ClassMissionResponse {
            challenge_id: r
                .try_get::<Uuid, _>("id")
                .map(|u| u.to_string())
                .unwrap_or_default(),
            title: r.try_get("title").unwrap_or_default(),
        }
    })))
}
