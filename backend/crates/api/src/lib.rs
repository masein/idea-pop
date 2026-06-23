//! HTTP layer for Idea Pop: Axum router, handlers, DTOs, and middleware.
//!
//! Handlers stay thin — validate input, call a domain service, then map the
//! result to a DTO / HTTP status. Business rules live in `idea-pop-domain`.

#![forbid(unsafe_code)]

use axum::{routing::get, Json, Router};
use serde::Serialize;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

/// Liveness/health payload.
#[derive(Debug, Serialize)]
pub struct Health {
    pub status: &'static str,
    pub service: &'static str,
}

async fn health() -> Json<Health> {
    Json(Health {
        status: "ok",
        service: "idea-pop-api",
    })
}

async fn readyz() -> &'static str {
    "ready"
}

/// Build the application router. Add feature routers here as phases land.
pub fn router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/readyz", get(readyz))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt; // for `oneshot`

    #[tokio::test]
    async fn health_returns_ok() {
        let app = router();
        let res = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = to_bytes(res.into_body(), usize::MAX).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["status"], "ok");
    }
}
