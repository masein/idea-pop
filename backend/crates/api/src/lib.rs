//! HTTP layer for Idea Pop: Axum router, handlers, DTOs, middleware, and OpenAPI.
//!
//! Handlers stay thin — validate input, call domain / infra, map result to a
//! DTO / HTTP status. Business rules live in `idea-pop-domain`.

#![forbid(unsafe_code)]

mod error;
pub use error::{ApiError, ProblemDetail};

use axum::{
    extract::{Request, State},
    http::{HeaderName, HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::time::Duration;
use tower_http::{
    cors::CorsLayer,
    request_id::{MakeRequestId, PropagateRequestIdLayer, RequestId, SetRequestIdLayer},
    trace::TraceLayer,
};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

// ── App state ────────────────────────────────────────────────────────────────

/// State shared across all handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
}

// ── Request-ID generator ─────────────────────────────────────────────────────

#[derive(Clone)]
struct MakeRequestUuid;

impl MakeRequestId for MakeRequestUuid {
    fn make_request_id<B>(&mut self, _req: &axum::http::Request<B>) -> Option<RequestId> {
        let id = Uuid::new_v4().to_string();
        HeaderValue::from_str(&id).ok().map(RequestId::new)
    }
}

// ── Timeout middleware ───────────────────────────────────────────────────────

async fn timeout_middleware(req: Request, next: Next) -> Response {
    match tokio::time::timeout(Duration::from_secs(30), next.run(req)).await {
        Ok(res) => res,
        Err(_) => StatusCode::REQUEST_TIMEOUT.into_response(),
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

/// Liveness/health response.
#[derive(Debug, Serialize, ToSchema)]
pub struct Health {
    pub status: String,
    pub service: String,
}

/// A single health-log entry (Phase 1 pipeline-validation resource).
#[derive(Debug, Serialize, sqlx::FromRow, ToSchema)]
pub struct HealthLogEntry {
    pub id: Uuid,
    pub message: String,
    pub created_at: DateTime<Utc>,
}

/// Body for creating a health-log entry.
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateHealthLogRequest {
    /// Non-empty log message.
    pub message: String,
}

// ── OpenAPI ───────────────────────────────────────────────────────────────────

#[derive(OpenApi)]
#[openapi(
    paths(health, readyz, create_health_log, list_health_log),
    components(schemas(Health, HealthLogEntry, CreateHealthLogRequest, ProblemDetail)),
    tags(
        (name = "ops", description = "Operational endpoints"),
        (name = "health-log", description = "Phase 1 pipeline-validation resource"),
    ),
    info(
        title = "Idea Pop API",
        description = "Backend API for the Idea Pop kids learning platform.",
        version = "0.1.0",
    )
)]
pub struct ApiDoc;

// ── Handlers ─────────────────────────────────────────────────────────────────

/// Returns `{"status":"ok"}` — used by Docker healthcheck and load balancer.
#[utoipa::path(
    get,
    path = "/health",
    tag = "ops",
    responses(
        (status = 200, description = "Service is healthy", body = Health)
    )
)]
async fn health() -> Json<Health> {
    Json(Health {
        status: "ok".to_owned(),
        service: "idea-pop-api".to_owned(),
    })
}

/// Returns `"ready"` — used by Kubernetes/Compose readiness probes.
#[utoipa::path(
    get,
    path = "/readyz",
    tag = "ops",
    responses(
        (status = 200, description = "Service is ready")
    )
)]
async fn readyz() -> &'static str {
    "ready"
}

/// Serves the raw OpenAPI 3 JSON spec.
async fn openapi_json() -> Json<serde_json::Value> {
    let spec = ApiDoc::openapi();
    Json(serde_json::to_value(spec).expect("openapi serialize"))
}

/// Serves Swagger UI (fetches assets from unpkg CDN).
/// Note: uses r##"..."## because the JS contains the sequence `"#swagger-ui"`.
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

/// Create a health-log entry — validates the DB pipeline end-to-end.
#[utoipa::path(
    post,
    path = "/api/health-log",
    tag = "health-log",
    request_body = CreateHealthLogRequest,
    responses(
        (status = 201, description = "Created", body = HealthLogEntry),
        (status = 422, description = "Validation error", body = ProblemDetail),
        (status = 500, description = "Internal error", body = ProblemDetail),
    )
)]
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
        r#"INSERT INTO health_log (message) VALUES ($1)
           RETURNING id, message, created_at"#,
        body.message,
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(entry)))
}

/// List the 20 most recent health-log entries.
#[utoipa::path(
    get,
    path = "/api/health-log",
    tag = "health-log",
    responses(
        (status = 200, description = "Success", body = [HealthLogEntry]),
        (status = 500, description = "Internal error", body = ProblemDetail),
    )
)]
async fn list_health_log(
    State(state): State<AppState>,
) -> Result<Json<Vec<HealthLogEntry>>, ApiError> {
    let entries = sqlx::query_as!(
        HealthLogEntry,
        r#"SELECT id, message, created_at FROM health_log
           ORDER BY created_at DESC LIMIT 20"#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(entries))
}

// ── Router ────────────────────────────────────────────────────────────────────

/// Build the application router with all middleware wired up.
///
/// Middleware order (applied via `.layer()` — last call = outermost):
///   CORS → SetRequestId → PropagateRequestId → Trace → Timeout(30 s) → Handler
pub fn router(pool: PgPool) -> Router {
    let state = AppState { db: pool };
    let x_req_id = HeaderName::from_static("x-request-id");

    Router::new()
        .route("/health", get(health))
        .route("/readyz", get(readyz))
        .route("/docs", get(swagger_ui))
        .route("/api-docs/openapi.json", get(openapi_json))
        .route(
            "/api/health-log",
            post(create_health_log).get(list_health_log),
        )
        .with_state(state)
        .layer(middleware::from_fn(timeout_middleware))
        .layer(TraceLayer::new_for_http())
        .layer(PropagateRequestIdLayer::new(x_req_id.clone()))
        .layer(SetRequestIdLayer::new(x_req_id, MakeRequestUuid))
        .layer(CorsLayer::permissive())
}
