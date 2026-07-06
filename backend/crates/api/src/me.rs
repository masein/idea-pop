//! Protected routes — require a valid Bearer JWT.

use axum::{extract::State, Json};
use serde::Serialize;
use sqlx::Row;
use utoipa::ToSchema;

use idea_pop_domain::DomainError;

use crate::{error::ApiError, extractor::AdultAuth, state::AppState};

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
