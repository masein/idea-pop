//! Auth route handlers: register, login, refresh, verify-email.

use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

use idea_pop_domain::Role;

use crate::{error::ApiError, state::AppState};

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
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    pub password: String,
}

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
) -> Result<(StatusCode, Json<AuthResponse>), ApiError> {
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

    Ok((
        StatusCode::CREATED,
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

/// Authenticate and receive a token pair.
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
) -> Result<Json<AuthResponse>, ApiError> {
    body.validate()?;
    let (account, pair) = state.auth.login(body.email, body.password).await?;
    Ok(Json(AuthResponse {
        account_id: account.id.to_string(),
        role: account.role.as_str().to_owned(),
        email_verified: account.is_email_verified(),
        access_token: pair.access_token,
        refresh_token: pair.refresh_token,
        expires_in: pair.expires_in,
    }))
}

/// Exchange a refresh token for a new token pair (rotates the session).
#[utoipa::path(
    post,
    path = "/auth/refresh",
    tag = "auth",
    request_body = RefreshRequest,
    responses(
        (status = 200, description = "Tokens rotated", body = TokenResponse),
        (status = 401, description = "Invalid or expired refresh token"),
    )
)]
pub async fn refresh(
    State(state): State<AppState>,
    Json(body): Json<RefreshRequest>,
) -> Result<Json<TokenResponse>, ApiError> {
    let pair = state.auth.refresh(body.refresh_token).await?;
    Ok(Json(TokenResponse {
        access_token: pair.access_token,
        refresh_token: pair.refresh_token,
        expires_in: pair.expires_in,
    }))
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
