//! POST /children — child signup, restricted until consent. PUBLIC by design:
//! kids self-sign-up anonymously and name a parent by email; a signed-in
//! adult creating a child is also supported and becomes the parent directly.
//! POST /me/upgrade-request — kid asks their parent to unlock premium (no billing access).

use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use idea_pop_domain::{DomainError, Role};

use crate::{error::ApiError, extractor::KidAuth, state::AppState};

// ── DTO ───────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateChildRequest {
    #[validate(length(min = 1, max = 30, message = "nickname must be 1–30 characters"))]
    pub nickname: String,
    /// Semantic avatar id from the fixed onboarding set, e.g. "cat".
    #[validate(length(min = 1, max = 32, message = "avatar_id must be 1–32 characters"))]
    pub avatar_id: String,
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
        (status = 422, description = "Validation error", body = crate::ProblemDetail),
    )
)]
pub async fn create_child(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateChildRequest>,
) -> Result<axum::response::Response, ApiError> {
    body.validate()
        .map_err(|e| idea_pop_domain::DomainError::Validation(e.to_string()))?;

    // Resolve the parent: a signed-in adult caller becomes the parent;
    // otherwise (anonymous kid self-signup) the parent is identified by
    // email — reusing their account when it exists, or creating a pending
    // one they claim via the consent flow. Invalid input is 422, never 401.
    let adult_caller = adult_claims(&state, &headers).await;
    let parent_id = match adult_caller {
        Some(account_id) => account_id,
        None => resolve_or_invite_parent(&state, &body.parent_email).await?,
    };

    let (child, token) = state
        .consent
        .create_child(
            parent_id,
            body.nickname.clone(),
            body.avatar_id.clone(),
            body.birth_year,
            body.parent_email,
        )
        .await
        .map_err(ApiError::Domain)?;

    let payload = Json(CreateChildResponse {
        child_id: child.id,
        nickname: child.nickname,
        access_token: token,
    });

    // When a signed-in parent adds a child, they keep their OWN session — we
    // must NOT overwrite the shared `ideapop_refresh` cookie with a kid token
    // (that would silently drop the parent into the kid app on next load).
    // Only the anonymous kid self-signup gets a kid refresh cookie: without it
    // any full page load would sign the freshly-created kid straight back out.
    if adult_caller.is_some() {
        return Ok((StatusCode::CREATED, payload).into_response());
    }

    let refresh_token = state.auth.issue_kid_refresh(child.id, parent_id).await?;
    Ok((
        StatusCode::CREATED,
        axum::response::AppendHeaders([(
            header::SET_COOKIE,
            crate::auth::set_refresh_cookie(&refresh_token, state.cookie_secure),
        )]),
        payload,
    )
        .into_response())
}

/// The caller's account id when a valid ADULT bearer token is present.
/// Kid tokens and anonymous/invalid tokens fall back to the email path.
async fn adult_claims(state: &AppState, headers: &HeaderMap) -> Option<Uuid> {
    let raw = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))?;
    let claims = state.tokens.verify_access(raw).await.ok()?;
    (claims.role != Role::Kid).then_some(claims.account_id)
}

/// Find the parent account for `parent_email`, creating a pending parent
/// account when none exists yet (random password; the parent hears about it
/// through the consent + verification emails and claims it from there).
async fn resolve_or_invite_parent(state: &AppState, email: &str) -> Result<Uuid, ApiError> {
    let existing: Option<Uuid> = sqlx::query_scalar("SELECT id FROM accounts WHERE email = $1")
        .bind(email)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;
    if let Some(id) = existing {
        return Ok(id);
    }

    let random_password = format!("{}{}", Uuid::new_v4(), Uuid::new_v4());
    match state
        .auth
        .register(email.to_owned(), random_password, Role::Parent, "en".into())
        .await
    {
        Ok(account) => Ok(account.id),
        // Lost a signup race — the account exists now; use it.
        Err(DomainError::Conflict(_)) => {
            let id: Uuid = sqlx::query_scalar("SELECT id FROM accounts WHERE email = $1")
                .bind(email)
                .fetch_one(&state.db)
                .await
                .map_err(|e| DomainError::Internal(e.to_string()))?;
            Ok(id)
        }
        Err(e) => Err(e.into()),
    }
}

// ── POST /me/upgrade-request ──────────────────────────────────────────────────

#[derive(Debug, Serialize, ToSchema)]
pub struct UpgradeRequestResponse {
    /// Always "pending" — either freshly created or already queued.
    pub status: String,
}

/// Kid taps "Upgrade" → record a premium-unlock request for the parent's
/// "Needs your OK" queue. Kid-scoped and idempotent (at most one pending
/// request per child). Carries NO billing capability: the parent completes
/// any payment on their own session.
#[utoipa::path(post, path = "/me/upgrade-request", tag = "children",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Request queued (or already pending)", body = UpgradeRequestResponse),
        (status = 401, description = "Not authenticated", body = crate::ProblemDetail),
        (status = 403, description = "Requires a kid-scoped token", body = crate::ProblemDetail),
    ))]
pub async fn request_premium_unlock(
    kid: KidAuth,
    State(state): State<AppState>,
) -> Result<Json<UpgradeRequestResponse>, ApiError> {
    sqlx::query(
        "INSERT INTO premium_unlock_requests (child_id)
         VALUES ($1)
         ON CONFLICT (child_id) WHERE status = 'pending' DO NOTHING",
    )
    .bind(kid.child_id)
    .execute(&state.db)
    .await
    .map_err(|e| idea_pop_domain::DomainError::Internal(e.to_string()))?;

    Ok(Json(UpgradeRequestResponse {
        status: "pending".to_owned(),
    }))
}
