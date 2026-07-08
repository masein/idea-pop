//! Auth route handlers: register, login, refresh, logout, verify-email.
//!
//! Refresh-token contract: the refresh token travels in an httpOnly cookie
//! (`ideapop_refresh`) set on login/register, rotated on refresh, cleared on
//! logout — the browser never exposes it to JS. `/auth/refresh` therefore
//! accepts an EMPTY POST (cookie only); a JSON `{refresh_token}` body is
//! still honoured as a fallback for non-browser API clients. The `Secure`
//! attribute is env-gated (COOKIE_SECURE) so plain-http localhost works.

use axum::{
    body::Bytes,
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::{AppendHeaders, IntoResponse},
    Json,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

use idea_pop_domain::{DomainError, Role};

use crate::{error::ApiError, state::AppState};

// ── Refresh cookie ───────────────────────────────────────────────────────────

pub const REFRESH_COOKIE: &str = "ideapop_refresh";
/// Matches the domain's REFRESH_TTL_DAYS (30 days).
const REFRESH_COOKIE_MAX_AGE_SECS: i64 = 30 * 24 * 60 * 60;

/// Path=/ so the cookie also matches when the API is consumed through the
/// frontend's same-origin `/api/*` rewrite (browser path differs from ours).
pub(crate) fn set_refresh_cookie(token: &str, secure: bool) -> String {
    format!(
        "{REFRESH_COOKIE}={token}; Path=/; Max-Age={REFRESH_COOKIE_MAX_AGE_SECS}; HttpOnly; SameSite=Lax{}",
        if secure { "; Secure" } else { "" }
    )
}

fn clear_refresh_cookie(secure: bool) -> String {
    format!(
        "{REFRESH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax{}",
        if secure { "; Secure" } else { "" }
    )
}

fn refresh_token_from_cookie(headers: &HeaderMap) -> Option<String> {
    let prefix = format!("{REFRESH_COOKIE}=");
    headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .flat_map(|line| line.split(';'))
        .map(str::trim)
        .find_map(|kv| kv.strip_prefix(prefix.as_str()))
        .filter(|t| !t.is_empty())
        .map(str::to_owned)
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct RegisterRequest {
    #[validate(email(message = "must be a valid email address"))]
    pub email: String,
    #[validate(length(min = 8, max = 72, message = "must be 8–72 characters"))]
    pub password: String,
    /// One of: parent | teacher | other. Defaults to "parent".
    pub role: Option<String>,
    /// BCP 47 locale (e.g. "en", "fa"). Defaults to "en".
    pub locale: Option<String>,
    /// Friendly display name for the portal header (optional).
    pub display_name: Option<String>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    pub password: String,
}

/// Body fallback for API clients that don't use the refresh cookie.
#[derive(Debug, Deserialize, ToSchema)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyEmailRequest {
    pub token: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AuthResponse {
    pub account_id: String,
    pub role: String,
    pub email_verified: bool,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

// ── Handlers ─────────────────────────────────────────────────────────────────

/// Register a new account and return an initial token pair.
/// Also sets the httpOnly refresh cookie.
#[utoipa::path(
    post,
    path = "/auth/register",
    tag = "auth",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "Account created", body = AuthResponse),
        (status = 409, description = "Email already registered"),
        (status = 422, description = "Validation error"),
    )
)]
pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<impl IntoResponse, ApiError> {
    body.validate()?;

    let role = body
        .role
        .as_deref()
        .and_then(Role::from_slug)
        .unwrap_or(Role::Parent);
    let locale = body.locale.clone().unwrap_or_else(|| "en".into());
    let email = body.email.clone();
    let password = body.password.clone();

    state
        .auth
        .register(body.email, body.password, role, locale)
        .await?;

    // Login immediately so we can create the refresh session and return tokens.
    let (account, pair) = state.auth.login(email, password).await?;

    // Persist the optional display name (kept out of AuthService to avoid
    // threading it through every caller).
    if let Some(name) = body.display_name.as_deref().map(str::trim) {
        if !name.is_empty() {
            let _ = sqlx::query("UPDATE accounts SET display_name = $1 WHERE id = $2")
                .bind(name)
                .bind(account.id)
                .execute(&state.db)
                .await;
        }
    }

    Ok((
        StatusCode::CREATED,
        AppendHeaders([(
            header::SET_COOKIE,
            set_refresh_cookie(&pair.refresh_token, state.cookie_secure),
        )]),
        Json(AuthResponse {
            account_id: account.id.to_string(),
            role: account.role.as_str().to_owned(),
            email_verified: account.is_email_verified(),
            access_token: pair.access_token,
            refresh_token: pair.refresh_token,
            expires_in: pair.expires_in,
        }),
    ))
}

/// Authenticate and receive a token pair. Also sets the httpOnly refresh cookie.
#[utoipa::path(
    post,
    path = "/auth/login",
    tag = "auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Authenticated", body = AuthResponse),
        (status = 401, description = "Invalid credentials"),
        (status = 422, description = "Validation error"),
    )
)]
pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<impl IntoResponse, ApiError> {
    body.validate()?;
    let (account, pair) = state.auth.login(body.email, body.password).await?;
    Ok((
        AppendHeaders([(
            header::SET_COOKIE,
            set_refresh_cookie(&pair.refresh_token, state.cookie_secure),
        )]),
        Json(AuthResponse {
            account_id: account.id.to_string(),
            role: account.role.as_str().to_owned(),
            email_verified: account.is_email_verified(),
            access_token: pair.access_token,
            refresh_token: pair.refresh_token,
            expires_in: pair.expires_in,
        }),
    ))
}

/// Rotate the refresh session and return a new token pair.
///
/// The refresh token is read from the `ideapop_refresh` httpOnly cookie
/// (browser flow — an EMPTY POST is valid), falling back to a JSON
/// `{refresh_token}` body for API clients. Never 415s.
#[utoipa::path(
    post,
    path = "/auth/refresh",
    tag = "auth",
    request_body(content = RefreshRequest, description = "Optional — cookie is preferred"),
    responses(
        (status = 200, description = "Tokens rotated; refresh cookie reset", body = TokenResponse),
        (status = 401, description = "Missing, invalid, or expired refresh token"),
    )
)]
pub async fn refresh(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, ApiError> {
    // Cookie first (browser flow), then the optional JSON body (API clients).
    let token = refresh_token_from_cookie(&headers).or_else(|| {
        serde_json::from_slice::<RefreshRequest>(&body)
            .ok()
            .map(|r| r.refresh_token)
    });
    let Some(token) = token else {
        return Err(DomainError::Unauthorized("missing refresh token".into()).into());
    };

    let pair = state.auth.refresh(token).await?;
    Ok((
        AppendHeaders([(
            header::SET_COOKIE,
            set_refresh_cookie(&pair.refresh_token, state.cookie_secure),
        )]),
        Json(TokenResponse {
            access_token: pair.access_token,
            refresh_token: pair.refresh_token,
            expires_in: pair.expires_in,
        }),
    ))
}

/// Revoke the current refresh session and clear the refresh cookie.
/// Idempotent: succeeds even when no valid session exists.
#[utoipa::path(
    post,
    path = "/auth/logout",
    tag = "auth",
    responses((status = 204, description = "Session revoked; refresh cookie cleared"))
)]
pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, ApiError> {
    let token = refresh_token_from_cookie(&headers).or_else(|| {
        serde_json::from_slice::<RefreshRequest>(&body)
            .ok()
            .map(|r| r.refresh_token)
    });
    if let Some(token) = token {
        state.auth.logout(token).await?;
    }
    Ok((
        StatusCode::NO_CONTENT,
        AppendHeaders([(
            header::SET_COOKIE,
            clear_refresh_cookie(state.cookie_secure),
        )]),
    ))
}

/// Confirm email using the token from the verification email.
#[utoipa::path(
    post,
    path = "/auth/verify-email",
    tag = "auth",
    request_body = VerifyEmailRequest,
    responses(
        (status = 204, description = "Email verified"),
        (status = 401, description = "Invalid or expired token"),
    )
)]
pub async fn verify_email(
    State(state): State<AppState>,
    Json(body): Json<VerifyEmailRequest>,
) -> Result<StatusCode, ApiError> {
    state.auth.confirm_email_verification(body.token).await?;
    Ok(StatusCode::NO_CONTENT)
}
