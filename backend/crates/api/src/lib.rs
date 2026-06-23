//! HTTP layer — Axum router, handlers, DTOs, middleware, and OpenAPI.

#![forbid(unsafe_code)]

mod error;
pub mod extractor;
pub mod state;

mod auth;
mod me;

pub use error::{ApiError, ProblemDetail};
pub use state::{create_auth_rate_limiter, AppState, AuthRateLimiter};

use std::{net::IpAddr, sync::Arc, time::Duration};

use axum::{
    extract::{ConnectInfo, Request, State},
    http::{HeaderName, HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tower_http::{
    cors::CorsLayer,
    request_id::{MakeRequestId, PropagateRequestIdLayer, RequestId, SetRequestIdLayer},
    trace::TraceLayer,
};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

use crate::{
    auth::{
        AuthResponse, LoginRequest, RefreshRequest, RegisterRequest, TokenResponse,
        VerifyEmailRequest,
    },
    me::MeResponse,
};

// ── Request-ID ────────────────────────────────────────────────────────────────

#[derive(Clone)]
struct MakeRequestUuid;

impl MakeRequestId for MakeRequestUuid {
    fn make_request_id<B>(&mut self, _req: &axum::http::Request<B>) -> Option<RequestId> {
        let id = Uuid::new_v4().to_string();
        HeaderValue::from_str(&id).ok().map(RequestId::new)
    }
}

// ── Timeout ───────────────────────────────────────────────────────────────────

async fn timeout_middleware(req: Request, next: Next) -> Response {
    match tokio::time::timeout(Duration::from_secs(30), next.run(req)).await {
        Ok(res) => res,
        Err(_) => StatusCode::REQUEST_TIMEOUT.into_response(),
    }
}

// ── Health-log DTOs (Phase 1) ─────────────────────────────────────────────────

#[derive(Debug, Serialize, ToSchema)]
pub struct Health {
    pub status: String,
    pub service: String,
}

#[derive(Debug, Serialize, sqlx::FromRow, ToSchema)]
pub struct HealthLogEntry {
    pub id: Uuid,
    pub message: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateHealthLogRequest {
    pub message: String,
}

// ── OpenAPI ───────────────────────────────────────────────────────────────────

#[derive(OpenApi)]
#[openapi(
    paths(
        health, readyz,
        create_health_log, list_health_log,
        auth::register, auth::login, auth::refresh, auth::verify_email,
        me::me,
    ),
    components(schemas(
        Health, HealthLogEntry, CreateHealthLogRequest, ProblemDetail,
        RegisterRequest, LoginRequest, RefreshRequest, VerifyEmailRequest,
        AuthResponse, TokenResponse, MeResponse,
    )),
    tags(
        (name = "ops",        description = "Operational endpoints"),
        (name = "health-log", description = "Phase 1 pipeline-validation resource"),
        (name = "auth",       description = "Authentication"),
        (name = "accounts",   description = "Account management"),
    ),
    info(
        title = "Idea Pop API",
        description = "Backend API for the Idea Pop kids learning platform.",
        version = "0.1.0",
    )
)]
pub struct ApiDoc;

// ── Handlers ─────────────────────────────────────────────────────────────────

#[utoipa::path(get, path = "/health", tag = "ops",
    responses((status = 200, description = "Healthy", body = Health)))]
async fn health() -> Json<Health> {
    Json(Health {
        status: "ok".to_owned(),
        service: "idea-pop-api".to_owned(),
    })
}

#[utoipa::path(get, path = "/readyz", tag = "ops",
    responses((status = 200, description = "Ready")))]
async fn readyz() -> &'static str {
    "ready"
}

async fn openapi_json() -> Json<serde_json::Value> {
    Json(serde_json::to_value(ApiDoc::openapi()).expect("openapi serialize"))
}

async fn swagger_ui() -> Html<&'static str> {
    Html(
        r##"<!DOCTYPE html>
<html>
  <head>
    <title>Idea Pop API — Docs</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => SwaggerUIBundle({
        url: "/api-docs/openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout",
      });
    </script>
  </body>
</html>"##,
    )
}

#[utoipa::path(post, path = "/api/health-log", tag = "health-log",
    request_body = CreateHealthLogRequest,
    responses(
        (status = 201, description = "Created", body = HealthLogEntry),
        (status = 422, description = "Validation error", body = ProblemDetail),
    ))]
async fn create_health_log(
    State(state): State<AppState>,
    Json(body): Json<CreateHealthLogRequest>,
) -> Result<(StatusCode, Json<HealthLogEntry>), ApiError> {
    use idea_pop_domain::DomainError;
    if body.message.trim().is_empty() {
        return Err(ApiError::Domain(DomainError::Validation(
            "message must not be blank".into(),
        )));
    }
    let entry = sqlx::query_as!(
        HealthLogEntry,
        r#"INSERT INTO health_log (message) VALUES ($1) RETURNING id, message, created_at"#,
        body.message,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(entry)))
}

#[utoipa::path(get, path = "/api/health-log", tag = "health-log",
    responses((status = 200, description = "Success", body = [HealthLogEntry])))]
async fn list_health_log(
    State(state): State<AppState>,
) -> Result<Json<Vec<HealthLogEntry>>, ApiError> {
    let entries = sqlx::query_as!(
        HealthLogEntry,
        r#"SELECT id, message, created_at FROM health_log ORDER BY created_at DESC LIMIT 20"#,
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(entries))
}

// ── Router ────────────────────────────────────────────────────────────────────

/// Build the application router.
///
/// Pass `rate_limiter = None` to disable per-IP auth rate limiting
/// (tests use `None` so they aren't subject to the 20 req/min limit).
pub fn router(state: AppState, rate_limiter: Option<Arc<AuthRateLimiter>>) -> Router {
    let x_req_id = HeaderName::from_static("x-request-id");

    let auth_routes = {
        let r = Router::new()
            .route("/auth/register", post(auth::register))
            .route("/auth/login", post(auth::login))
            .route("/auth/refresh", post(auth::refresh))
            .route("/auth/verify-email", post(auth::verify_email))
            .with_state(state.clone());
        if let Some(limiter) = rate_limiter {
            r.layer(middleware::from_fn(move |req: Request, next: Next| {
                let lim = Arc::clone(&limiter);
                async move {
                    let ip: IpAddr = req
                        .extensions()
                        .get::<ConnectInfo<std::net::SocketAddr>>()
                        .map(|ci| ci.0.ip())
                        .unwrap_or(IpAddr::from([127, 0, 0, 1]));
                    if lim.check_key(&ip).is_err() {
                        return (StatusCode::TOO_MANY_REQUESTS, "rate limit exceeded")
                            .into_response();
                    }
                    next.run(req).await
                }
            }))
        } else {
            r
        }
    };

    Router::new()
        .route("/health", get(health))
        .route("/readyz", get(readyz))
        .route("/docs", get(swagger_ui))
        .route("/api-docs/openapi.json", get(openapi_json))
        .route(
            "/api/health-log",
            post(create_health_log).get(list_health_log),
        )
        .route("/me", get(me::me))
        .with_state(state)
        .merge(auth_routes)
        .layer(middleware::from_fn(timeout_middleware))
        .layer(TraceLayer::new_for_http())
        .layer(PropagateRequestIdLayer::new(x_req_id.clone()))
        .layer(SetRequestIdLayer::new(x_req_id, MakeRequestUuid))
        .layer(CorsLayer::permissive())
}

// ── Null adapters for tests that only need the health-log routes ──────────────

use async_trait::async_trait;
use idea_pop_domain::{
    Account, AccountRepo, Clock, DomainError, EmailSender, PasswordHasher, RefreshSession, Role,
    TokenClaims, TokenIssuer, TokenPair,
};

pub struct NullRepo;
#[async_trait]
impl AccountRepo for NullRepo {
    async fn find_by_email(&self, _: &str) -> Result<Option<Account>, DomainError> {
        Ok(None)
    }
    async fn find_by_id(&self, _: Uuid) -> Result<Option<Account>, DomainError> {
        Ok(None)
    }
    async fn find_by_verification_token_hash(
        &self,
        _: &str,
    ) -> Result<Option<Account>, DomainError> {
        Ok(None)
    }
    async fn create(&self, _: &Account) -> Result<(), DomainError> {
        Ok(())
    }
    async fn update(&self, _: &Account) -> Result<(), DomainError> {
        Ok(())
    }
    async fn create_refresh_session(&self, _: &RefreshSession) -> Result<(), DomainError> {
        Ok(())
    }
    async fn find_refresh_session_by_hash(
        &self,
        _: &str,
    ) -> Result<Option<RefreshSession>, DomainError> {
        Ok(None)
    }
    async fn revoke_refresh_session(&self, _: Uuid) -> Result<(), DomainError> {
        Ok(())
    }
}

pub struct NullHasher;
#[async_trait]
impl PasswordHasher for NullHasher {
    async fn hash(&self, p: &str) -> Result<String, DomainError> {
        Ok(p.into())
    }
    async fn verify(&self, _: &str, _: &str) -> Result<bool, DomainError> {
        Ok(false)
    }
}

pub struct NullTokens;
#[async_trait]
impl TokenIssuer for NullTokens {
    async fn issue(&self, _: Uuid, _: &Role) -> Result<TokenPair, DomainError> {
        Err(DomainError::Internal("null tokens".into()))
    }
    async fn verify_access(&self, _: &str) -> Result<TokenClaims, DomainError> {
        Err(DomainError::Unauthorized("null tokens".into()))
    }
    fn hash_token(&self, raw: &str) -> String {
        raw.into()
    }
    fn generate_opaque_token(&self) -> String {
        "null".into()
    }
}

pub struct NullEmail;
#[async_trait]
impl EmailSender for NullEmail {
    async fn send_verification_email(&self, _: &str, _: &str, _: &str) -> Result<(), DomainError> {
        Ok(())
    }
}

pub struct NullClock;
impl Clock for NullClock {
    fn now(&self) -> DateTime<Utc> {
        Utc::now()
    }
}

/// Build a state using only a PgPool + null auth adapters (for Phase 1 tests).
pub fn null_state(pool: PgPool) -> AppState {
    AppState::new(
        pool,
        Arc::new(NullRepo),
        Arc::new(NullHasher),
        Arc::new(NullTokens),
        Arc::new(NullEmail),
        Arc::new(NullClock),
    )
}
