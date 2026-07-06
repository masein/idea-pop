//! GET /parent/children + /parent/children/{id}/report — parent-scoped family views.
//!
//! Adult-only (kid tokens are rejected by `AdultAuth`). All queries run against
//! `state.db` with runtime `sqlx::query` (no offline-cache entries needed) and
//! are scoped to the caller's own children via `parent_account_id`.

use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;
use sqlx::Row;
use utoipa::ToSchema;
use uuid::Uuid;

use idea_pop_domain::{progress::level_from_xp, DomainError};

use crate::{error::ApiError, extractor::AdultAuth, state::AppState};

// ── DTOs (match the frontend ParentChild / ChildReport contract) ────────────────

#[derive(Serialize, ToSchema)]
pub struct ParentChildResponse {
    pub id: Uuid,
    pub nickname: String,
    pub avatar_id: String,
    pub birth_year: i32,
    pub level: i32,
    pub total_xp: i32,
    pub consent_granted: bool,
    pub class_sharing_enabled: bool,
    pub public_sharing_enabled: bool,
}

#[derive(Serialize, ToSchema)]
pub struct ParentProjectSummary {
    pub id: Uuid,
    pub title: String,
    pub what_i_made: String,
    pub project_photo_url: Option<String>,
    pub visibility: String,
    pub visibility_pending: bool,
    pub created_at: String,
    pub challenge_title: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct ChildReportResponse {
    pub child_id: Uuid,
    pub week_start: String,
    pub explore_videos_watched: i32,
    pub lessons_completed: i32,
    pub challenges_completed: i32,
    pub xp_earned: i32,
    pub projects: Vec<ParentProjectSummary>,
}

fn internal(e: sqlx::Error) -> DomainError {
    DomainError::Internal(e.to_string())
}

// ── GET /parent/children ────────────────────────────────────────────────────────

/// List the authenticated parent's children with level, XP and sharing state.
#[utoipa::path(get, path = "/parent/children", tag = "children",
    responses(
        (status = 200, description = "The caller's children", body = [ParentChildResponse]),
        (status = 401, description = "Not authenticated", body = crate::ProblemDetail),
        (status = 403, description = "Kid tokens rejected", body = crate::ProblemDetail),
    ))]
pub async fn list_children(
    AdultAuth(claims): AdultAuth,
    State(state): State<AppState>,
) -> Result<Json<Vec<ParentChildResponse>>, ApiError> {
    let rows = sqlx::query(
        r#"SELECT c.id, c.nickname, c.avatar_id, c.birth_year,
                  COALESCE((SELECT SUM(amount) FROM xp_events WHERE child_id = c.id), 0) AS total_xp,
                  (SELECT status FROM parental_consents
                   WHERE child_id = c.id ORDER BY sent_at DESC LIMIT 1) AS consent_status
           FROM child_profiles c
           WHERE c.parent_account_id = $1
           ORDER BY c.created_at"#,
    )
    .bind(claims.account_id)
    .fetch_all(&state.db)
    .await
    .map_err(internal)?;

    let children = rows
        .iter()
        .map(|r| {
            let total_xp: i64 = r.try_get("total_xp").unwrap_or(0);
            let avatar_id: i16 = r.try_get("avatar_id").unwrap_or(0);
            let birth_year: i16 = r.try_get("birth_year").unwrap_or(0);
            let status: Option<String> = r.try_get("consent_status").ok().flatten();
            let s = status.as_deref();
            ParentChildResponse {
                id: r.try_get("id").unwrap_or_default(),
                nickname: r.try_get("nickname").unwrap_or_default(),
                avatar_id: avatar_id.to_string(),
                birth_year: birth_year as i32,
                level: level_from_xp(total_xp as i32) as i32,
                total_xp: total_xp as i32,
                consent_granted: s == Some("granted"),
                class_sharing_enabled: s == Some("class_granted"),
                public_sharing_enabled: matches!(s, Some("granted") | Some("class_granted")),
            }
        })
        .collect();

    Ok(Json(children))
}

// ── GET /parent/children/{id}/report ────────────────────────────────────────────

/// This-week activity report for one of the caller's children.
#[utoipa::path(get, path = "/parent/children/{id}/report", tag = "children",
    params(("id" = Uuid, Path, description = "Child profile UUID")),
    responses(
        (status = 200, description = "Weekly report", body = ChildReportResponse),
        (status = 403, description = "Not the parent of this child", body = crate::ProblemDetail),
        (status = 404, description = "Not found", body = crate::ProblemDetail),
    ))]
pub async fn child_report(
    AdultAuth(claims): AdultAuth,
    State(state): State<AppState>,
    Path(child_id): Path<Uuid>,
) -> Result<Json<ChildReportResponse>, ApiError> {
    // Ownership: only the parent who owns the child may read the report.
    let owner: Option<Uuid> =
        sqlx::query_scalar("SELECT parent_account_id FROM child_profiles WHERE id = $1")
            .bind(child_id)
            .fetch_optional(&state.db)
            .await
            .map_err(internal)?;
    match owner {
        None => return Err(DomainError::NotFound.into()),
        Some(p) if p != claims.account_id => {
            return Err(DomainError::Forbidden("not the parent of this child".into()).into());
        }
        _ => {}
    }

    let row = sqlx::query(
        r#"SELECT
             (SELECT COUNT(*) FROM video_views
              WHERE child_id = $1 AND date_trunc('week', viewed_at) = date_trunc('week', now())) AS videos,
             (SELECT COUNT(*) FROM lesson_completions
              WHERE child_id = $1 AND date_trunc('week', completed_at) = date_trunc('week', now())) AS lessons,
             (SELECT COUNT(DISTINCT challenge_id) FROM challenge_attempts
              WHERE child_id = $1 AND status = 'completed'
                AND date_trunc('week', completed_at) = date_trunc('week', now())) AS challenges,
             COALESCE((SELECT SUM(amount) FROM xp_events
              WHERE child_id = $1 AND date_trunc('week', created_at) = date_trunc('week', now())), 0) AS xp,
             to_char(date_trunc('week', now()), 'YYYY-MM-DD') AS week_start"#,
    )
    .bind(child_id)
    .fetch_one(&state.db)
    .await
    .map_err(internal)?;

    let project_rows = sqlx::query(
        r#"SELECT id, title, description, requested_visibility, effective_visibility, created_at
           FROM projects WHERE child_id = $1 ORDER BY created_at DESC"#,
    )
    .bind(child_id)
    .fetch_all(&state.db)
    .await
    .map_err(internal)?;

    let projects = project_rows
        .iter()
        .map(|r| {
            let req: String = r.try_get("requested_visibility").unwrap_or_default();
            let eff: String = r.try_get("effective_visibility").unwrap_or_default();
            let created: chrono::DateTime<chrono::Utc> = r
                .try_get("created_at")
                .unwrap_or_else(|_| chrono::Utc::now());
            ParentProjectSummary {
                id: r.try_get("id").unwrap_or_default(),
                title: r.try_get("title").unwrap_or_default(),
                what_i_made: r.try_get("description").unwrap_or_default(),
                // Photos are private S3 keys; a presigned URL is out of scope here.
                project_photo_url: None,
                visibility: eff.clone(),
                visibility_pending: req != eff,
                created_at: created.to_rfc3339(),
                challenge_title: None,
            }
        })
        .collect();

    let as_i32 = |name: &str| row.try_get::<i64, _>(name).unwrap_or(0) as i32;

    Ok(Json(ChildReportResponse {
        child_id,
        week_start: row.try_get("week_start").unwrap_or_default(),
        explore_videos_watched: as_i32("videos"),
        lessons_completed: as_i32("lessons"),
        challenges_completed: as_i32("challenges"),
        xp_earned: as_i32("xp"),
        projects,
    }))
}
