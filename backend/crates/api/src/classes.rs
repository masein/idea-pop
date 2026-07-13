//! Class management — teacher creates, child joins (ClassGranted path).
//!
//! POST /classes          — teacher creates a class
//! POST /classes/{code}/join — child joins by class code

use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, Utc};
use idea_pop_domain::{DomainError, Role};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::{problem, ApiError},
    extractor::AuthToken,
    state::AppState,
};

fn internal(e: sqlx::Error) -> DomainError {
    DomainError::Internal(e.to_string())
}

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

// ── Kid PIN login (teacher-created students) ──────────────────────────────────
//
// Kids rostered by a teacher (teacher::create_student) have no email/password.
// They sign in from a public page: enter the class code, pick their name, type
// the 4-digit PIN. Only nickname + avatar are ever exposed (no PII), the code
// is required, PINs are hashed, and attempts are rate-limited with a lockout.

const MAX_PIN_ATTEMPTS: i16 = 5;

#[derive(Serialize, ToSchema)]
pub struct ClassRosterItem {
    pub child_id: Uuid,
    pub nickname: String,
    pub avatar_id: String,
}

#[derive(Deserialize, ToSchema)]
pub struct ClassLoginRequest {
    pub child_id: Uuid,
    pub pin: String,
}

#[derive(Serialize, ToSchema)]
pub struct ClassLoginResponse {
    pub child_id: Uuid,
    pub nickname: String,
    /// Kid-scoped access token (RESTRICTED to class sharing).
    pub access_token: String,
}

// ── GET /classes/{code}/roster ────────────────────────────────────────────────

/// The pickable names for a class's PIN-login kids (public; code required).
#[utoipa::path(get, path = "/classes/{code}/roster", tag = "classes",
    params(("code" = String, Path, description = "Class code")),
    responses(
        (status = 200, description = "Pickable students (nickname + avatar only)", body = [ClassRosterItem]),
    ))]
pub async fn class_roster(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<Vec<ClassRosterItem>>, ApiError> {
    let rows = sqlx::query(
        "SELECT p.id, p.nickname, p.avatar_id
         FROM child_profiles p
         JOIN class_memberships m ON m.child_id = p.id
         JOIN classes c ON c.id = m.class_id
         WHERE c.class_code = $1 AND p.login_pin_hash IS NOT NULL
         ORDER BY p.nickname",
    )
    .bind(&code)
    .fetch_all(&state.db)
    .await
    .map_err(internal)?;
    Ok(Json(
        rows.iter()
            .map(|r| ClassRosterItem {
                child_id: r.try_get("id").unwrap_or_default(),
                nickname: r.try_get("nickname").unwrap_or_default(),
                avatar_id: r.try_get("avatar_id").unwrap_or_default(),
            })
            .collect(),
    ))
}

// ── POST /classes/{code}/login ────────────────────────────────────────────────

/// Sign a rostered kid in with class code + child + PIN. Rate-limited/lockable.
#[utoipa::path(post, path = "/classes/{code}/login", tag = "classes",
    params(("code" = String, Path, description = "Class code")),
    request_body = ClassLoginRequest,
    responses(
        (status = 200, description = "Signed in; kid refresh cookie set", body = ClassLoginResponse),
        (status = 401, description = "Wrong class, name, or PIN", body = crate::ProblemDetail),
        (status = 429, description = "Too many attempts; try later", body = crate::ProblemDetail),
    ))]
pub async fn class_login(
    State(state): State<AppState>,
    Path(code): Path<String>,
    Json(body): Json<ClassLoginRequest>,
) -> Result<Response, ApiError> {
    let unauthorized =
        || -> ApiError { DomainError::Unauthorized("wrong class, name, or PIN".into()).into() };

    let row = sqlx::query(
        "SELECT p.nickname, p.parent_account_id, p.login_pin_hash,
                p.pin_attempts, p.pin_locked_until
         FROM child_profiles p
         JOIN class_memberships m ON m.child_id = p.id
         JOIN classes c ON c.id = m.class_id
         WHERE c.class_code = $1 AND p.id = $2 AND p.login_pin_hash IS NOT NULL",
    )
    .bind(&code)
    .bind(body.child_id)
    .fetch_optional(&state.db)
    .await
    .map_err(internal)?;

    // Don't reveal whether the class/child exists — same error either way.
    let Some(row) = row else {
        return Err(unauthorized());
    };

    // Lockout window still open?
    let locked_until: Option<DateTime<Utc>> = row.try_get("pin_locked_until").ok().flatten();
    if let Some(until) = locked_until {
        if until > Utc::now() {
            return Ok(problem(
                StatusCode::TOO_MANY_REQUESTS,
                "pin-locked",
                "Too many tries — ask your teacher, or try again a little later.",
            ));
        }
    }

    let pin_hash: String = row.try_get("login_pin_hash").map_err(internal)?;
    let ok = state.auth.hasher.verify(&body.pin, &pin_hash).await?;
    if !ok {
        let attempts: i16 = row.try_get("pin_attempts").unwrap_or(0);
        let next = attempts + 1;
        if next >= MAX_PIN_ATTEMPTS {
            sqlx::query(
                "UPDATE child_profiles
                 SET pin_attempts = $1, pin_locked_until = now() + interval '15 minutes'
                 WHERE id = $2",
            )
            .bind(next)
            .bind(body.child_id)
            .execute(&state.db)
            .await
            .map_err(internal)?;
        } else {
            sqlx::query("UPDATE child_profiles SET pin_attempts = $1 WHERE id = $2")
                .bind(next)
                .bind(body.child_id)
                .execute(&state.db)
                .await
                .map_err(internal)?;
        }
        return Err(unauthorized());
    }

    // Success — clear the counter and mint a kid session.
    sqlx::query(
        "UPDATE child_profiles SET pin_attempts = 0, pin_locked_until = NULL WHERE id = $1",
    )
    .bind(body.child_id)
    .execute(&state.db)
    .await
    .map_err(internal)?;

    let parent_account_id: Uuid = row.try_get("parent_account_id").map_err(internal)?;
    let nickname: String = row.try_get("nickname").map_err(internal)?;
    let access_token = state
        .tokens
        .issue_kid(body.child_id, parent_account_id)
        .await?;
    let refresh_token = state
        .auth
        .issue_kid_refresh(body.child_id, parent_account_id)
        .await?;

    Ok((
        StatusCode::OK,
        axum::response::AppendHeaders([(
            header::SET_COOKIE,
            crate::auth::set_refresh_cookie(&refresh_token, state.cookie_secure),
        )]),
        Json(ClassLoginResponse {
            child_id: body.child_id,
            nickname,
            access_token,
        }),
    )
        .into_response())
}
