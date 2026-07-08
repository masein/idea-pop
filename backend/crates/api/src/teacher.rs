//! Teacher class dashboard reads + mission assignment.
//!
//! GET  /teacher/class          — the caller's class (code, size, assignment)
//! GET  /teacher/class/gallery  — class-visible student projects
//! POST /teacher/class/assign   — set the class's current mission
//!
//! Teacher/Admin only. Runtime `sqlx::query` — no offline-cache entries.
//! The class store is the same `classes` table `POST /classes` writes, so a
//! newly created class is immediately readable here.

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use utoipa::ToSchema;
use uuid::Uuid;

use idea_pop_domain::{DomainError, Role};

use crate::{error::ApiError, extractor::AdultAuth, state::AppState};

fn internal(e: sqlx::Error) -> DomainError {
    DomainError::Internal(e.to_string())
}

fn require_teacher(role: &Role) -> Result<(), ApiError> {
    if matches!(role, Role::Teacher | Role::Admin) {
        Ok(())
    } else {
        Err(DomainError::Forbidden("Teacher or Admin role required".into()).into())
    }
}

// ── DTOs (match the frontend TeacherClass / ClassGalleryItem contract) ─────────

#[derive(Serialize, ToSchema)]
pub struct TeacherClassResponse {
    pub id: Uuid,
    pub name: String,
    pub class_code: String,
    pub student_count: i64,
    pub assigned_challenge_id: Option<Uuid>,
    pub assigned_challenge_title: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct ClassGalleryItemResponse {
    pub id: Uuid,
    pub student_nickname: String,
    pub student_avatar_id: String,
    pub project_title: String,
    /// Photos are private S3 keys; presigned URLs are out of scope here
    /// (same deferral as the parent report).
    pub project_photo_url: Option<String>,
    pub challenge_title: String,
    pub created_at: String,
}

#[derive(Deserialize, ToSchema)]
pub struct AssignMissionRequest {
    pub challenge_id: Uuid,
}

// ── GET /teacher/class ──────────────────────────────────────────────────────────

/// The authenticated teacher's class. 404 while no class exists yet.
#[utoipa::path(get, path = "/teacher/class", tag = "classes",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "The caller's class", body = TeacherClassResponse),
        (status = 403, description = "Teacher role required", body = crate::ProblemDetail),
        (status = 404, description = "No class created yet", body = crate::ProblemDetail),
    ))]
pub async fn get_class(
    AdultAuth(claims): AdultAuth,
    State(state): State<AppState>,
) -> Result<Json<TeacherClassResponse>, ApiError> {
    require_teacher(&claims.role)?;

    let row = sqlx::query(
        r#"SELECT c.id, c.name, c.class_code, c.assigned_challenge_id,
                  ch.title AS assigned_challenge_title,
                  (SELECT COUNT(*) FROM class_memberships m WHERE m.class_id = c.id) AS student_count
           FROM classes c
           LEFT JOIN challenges ch ON ch.id = c.assigned_challenge_id
           WHERE c.teacher_account_id = $1
           ORDER BY c.created_at DESC
           LIMIT 1"#,
    )
    .bind(claims.account_id)
    .fetch_optional(&state.db)
    .await
    .map_err(internal)?
    .ok_or(ApiError::Domain(DomainError::NotFound))?;

    Ok(Json(TeacherClassResponse {
        id: row.try_get("id").unwrap_or_default(),
        name: row.try_get("name").unwrap_or_default(),
        class_code: row.try_get("class_code").unwrap_or_default(),
        student_count: row.try_get("student_count").unwrap_or(0),
        assigned_challenge_id: row.try_get("assigned_challenge_id").ok().flatten(),
        assigned_challenge_title: row.try_get("assigned_challenge_title").ok().flatten(),
    }))
}

// ── POST /teacher/class/assign ──────────────────────────────────────────────────

/// Assign a mission to the caller's class.
#[utoipa::path(post, path = "/teacher/class/assign", tag = "classes",
    request_body = AssignMissionRequest,
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Mission assigned", body = TeacherClassResponse),
        (status = 403, description = "Teacher role required", body = crate::ProblemDetail),
        (status = 404, description = "No class yet, or unknown challenge", body = crate::ProblemDetail),
    ))]
pub async fn assign_mission(
    AdultAuth(claims): AdultAuth,
    State(state): State<AppState>,
    Json(body): Json<AssignMissionRequest>,
) -> Result<Json<TeacherClassResponse>, ApiError> {
    require_teacher(&claims.role)?;

    let updated = sqlx::query(
        r#"UPDATE classes SET assigned_challenge_id = $1
           WHERE teacher_account_id = $2
             AND EXISTS (SELECT 1 FROM challenges WHERE id = $1)"#,
    )
    .bind(body.challenge_id)
    .bind(claims.account_id)
    .execute(&state.db)
    .await
    .map_err(internal)?;
    if updated.rows_affected() == 0 {
        return Err(DomainError::NotFound.into());
    }

    get_class(AdultAuth(claims), State(state)).await
}

// ── GET /teacher/class/gallery ──────────────────────────────────────────────────

/// Class-visible student projects for the caller's class, newest first.
#[utoipa::path(get, path = "/teacher/class/gallery", tag = "classes",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Class gallery", body = [ClassGalleryItemResponse]),
        (status = 403, description = "Teacher role required", body = crate::ProblemDetail),
    ))]
pub async fn class_gallery(
    AdultAuth(claims): AdultAuth,
    State(state): State<AppState>,
) -> Result<Json<Vec<ClassGalleryItemResponse>>, ApiError> {
    require_teacher(&claims.role)?;

    let rows = sqlx::query(
        r#"SELECT p.id, p.title, p.created_at, c.nickname, c.avatar_id,
                  ch.title AS challenge_title
           FROM projects p
           JOIN child_profiles c ON c.id = p.child_id
           JOIN class_memberships m ON m.child_id = p.child_id
           JOIN classes cl ON cl.id = m.class_id
           LEFT JOIN challenges ch
                  ON p.origin_type = 'challenge' AND ch.id = p.origin_id
           WHERE cl.teacher_account_id = $1
             AND p.effective_visibility IN ('class', 'public')
           ORDER BY p.created_at DESC
           LIMIT 100"#,
    )
    .bind(claims.account_id)
    .fetch_all(&state.db)
    .await
    .map_err(internal)?;

    let items = rows
        .iter()
        .map(|r| {
            let avatar_id: i16 = r.try_get("avatar_id").unwrap_or(0);
            let created: chrono::DateTime<chrono::Utc> = r
                .try_get("created_at")
                .unwrap_or_else(|_| chrono::Utc::now());
            ClassGalleryItemResponse {
                id: r.try_get("id").unwrap_or_default(),
                student_nickname: r.try_get("nickname").unwrap_or_default(),
                student_avatar_id: avatar_id.to_string(),
                project_title: r.try_get("title").unwrap_or_default(),
                project_photo_url: None,
                challenge_title: r
                    .try_get::<Option<String>, _>("challenge_title")
                    .ok()
                    .flatten()
                    .unwrap_or_default(),
                created_at: created.to_rfc3339(),
            }
        })
        .collect();

    Ok(Json(items))
}
