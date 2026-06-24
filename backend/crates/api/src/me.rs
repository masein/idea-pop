//! Protected routes — require a valid Bearer JWT.

use axum::{extract::State, Json};
use serde::Serialize;
use utoipa::ToSchema;

use crate::{error::ApiError, extractor::AdultAuth, state::AppState};

#[derive(Debug, Serialize, ToSchema)]
pub struct MeResponse {
    pub account_id: String,
    pub role: String,
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
    State(_state): State<AppState>,
    AdultAuth(claims): AdultAuth,
) -> Result<Json<MeResponse>, ApiError> {
    Ok(Json(MeResponse {
        account_id: claims.account_id.to_string(),
        role: claims.role.as_str().to_owned(),
    }))
}
