//! GET/PUT /account/email-preferences — per-account email notification settings.
//!
//! Adult-only (kid tokens are rejected by `AdultAuth`). Preferences default to
//! all-off (strictly opt-in); the row is created lazily on first PUT, so GET
//! must tolerate a missing row. All SQL is runtime `sqlx::query` (no offline
//! cache entries needed).

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use utoipa::ToSchema;

use idea_pop_domain::DomainError;

use crate::{error::ApiError, extractor::AdultAuth, state::AppState};

#[derive(Debug, Serialize, ToSchema)]
pub struct EmailPreferencesResponse {
    /// Product updates, new features, weekly events.
    pub marketing: bool,
    /// New mission / course / lesson alerts.
    pub new_content: bool,
    /// Weekly child activity reports (premium).
    pub activity_reports: bool,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateEmailPreferencesRequest {
    pub marketing: bool,
    pub new_content: bool,
    pub activity_reports: bool,
}

fn internal(e: sqlx::Error) -> DomainError {
    DomainError::Internal(e.to_string())
}

/// Return the authenticated account's email preferences (all-off defaults if never set).
#[utoipa::path(get, path = "/account/email-preferences", tag = "accounts",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Current preferences", body = EmailPreferencesResponse),
        (status = 401, description = "Not authenticated", body = crate::ProblemDetail),
        (status = 403, description = "Kid tokens rejected", body = crate::ProblemDetail),
    ))]
pub async fn get_email_preferences(
    AdultAuth(claims): AdultAuth,
    State(state): State<AppState>,
) -> Result<Json<EmailPreferencesResponse>, ApiError> {
    let row = sqlx::query(
        "SELECT marketing, new_content, activity_reports
         FROM email_preferences WHERE account_id = $1",
    )
    .bind(claims.account_id)
    .fetch_optional(&state.db)
    .await
    .map_err(internal)?;

    let prefs = match row {
        Some(r) => EmailPreferencesResponse {
            marketing: r.try_get("marketing").unwrap_or(false),
            new_content: r.try_get("new_content").unwrap_or(false),
            activity_reports: r.try_get("activity_reports").unwrap_or(false),
        },
        None => EmailPreferencesResponse {
            marketing: false,
            new_content: false,
            activity_reports: false,
        },
    };

    Ok(Json(prefs))
}

/// Replace the authenticated account's email preferences.
#[utoipa::path(put, path = "/account/email-preferences", tag = "accounts",
    security(("bearer_auth" = [])),
    request_body = UpdateEmailPreferencesRequest,
    responses(
        (status = 200, description = "Updated preferences", body = EmailPreferencesResponse),
        (status = 401, description = "Not authenticated", body = crate::ProblemDetail),
        (status = 403, description = "Kid tokens rejected", body = crate::ProblemDetail),
    ))]
pub async fn put_email_preferences(
    AdultAuth(claims): AdultAuth,
    State(state): State<AppState>,
    Json(body): Json<UpdateEmailPreferencesRequest>,
) -> Result<Json<EmailPreferencesResponse>, ApiError> {
    sqlx::query(
        "INSERT INTO email_preferences (account_id, marketing, new_content, activity_reports)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (account_id) DO UPDATE
         SET marketing = EXCLUDED.marketing,
             new_content = EXCLUDED.new_content,
             activity_reports = EXCLUDED.activity_reports,
             updated_at = now()",
    )
    .bind(claims.account_id)
    .bind(body.marketing)
    .bind(body.new_content)
    .bind(body.activity_reports)
    .execute(&state.db)
    .await
    .map_err(internal)?;

    Ok(Json(EmailPreferencesResponse {
        marketing: body.marketing,
        new_content: body.new_content,
        activity_reports: body.activity_reports,
    }))
}
