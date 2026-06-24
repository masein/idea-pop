//! RFC 7807 problem+json error layer.

#![forbid(unsafe_code)]

use axum::{
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use idea_pop_domain::DomainError;
use serde::Serialize;
use utoipa::ToSchema;

/// RFC 7807 problem+json body.
#[derive(Debug, Serialize, ToSchema)]
pub struct ProblemDetail {
    #[serde(rename = "type")]
    pub type_uri: String,
    pub title: String,
    pub status: u16,
    pub detail: String,
}

impl ProblemDetail {
    fn new(slug: &str, title: &str, status: StatusCode, detail: impl Into<String>) -> Self {
        Self {
            type_uri: format!("https://idea-pop.app/problems/{slug}"),
            title: title.to_owned(),
            status: status.as_u16(),
            detail: detail.into(),
        }
    }
}

/// Build a problem+json Response directly (used by extractors / guards).
pub fn problem(status: StatusCode, slug: &str, detail: impl Into<String>) -> Response {
    let title = status.canonical_reason().unwrap_or("Error").to_owned();
    let body = ProblemDetail::new(slug, &title, status, detail);
    let mut response = (status, Json(body)).into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/problem+json"),
    );
    response
}

/// Handler-level error → RFC 7807 response.
#[derive(Debug)]
pub enum ApiError {
    Domain(DomainError),
    Database(sqlx::Error),
    Validation(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, slug, detail): (StatusCode, &str, String) = match self {
            ApiError::Domain(DomainError::NotFound) => (
                StatusCode::NOT_FOUND,
                "not-found",
                "The requested resource does not exist.".into(),
            ),
            ApiError::Domain(DomainError::Validation(msg)) => {
                (StatusCode::UNPROCESSABLE_ENTITY, "validation", msg)
            }
            ApiError::Domain(DomainError::Conflict(msg)) => (StatusCode::CONFLICT, "conflict", msg),
            ApiError::Domain(DomainError::Unauthorized(msg)) => {
                (StatusCode::UNAUTHORIZED, "unauthorized", msg)
            }
            ApiError::Domain(DomainError::Forbidden(msg)) => {
                (StatusCode::FORBIDDEN, "forbidden", msg)
            }
            ApiError::Domain(DomainError::Internal(msg)) => {
                tracing::error!(detail = %msg, "domain internal error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal",
                    "An unexpected error occurred.".into(),
                )
            }
            ApiError::Database(e) => {
                tracing::error!(error = %e, "database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal",
                    "An unexpected error occurred.".into(),
                )
            }
            ApiError::Validation(msg) => (StatusCode::UNPROCESSABLE_ENTITY, "validation", msg),
        };

        problem(status, slug, detail)
    }
}

impl From<DomainError> for ApiError {
    fn from(e: DomainError) -> Self {
        ApiError::Domain(e)
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(e: sqlx::Error) -> Self {
        ApiError::Database(e)
    }
}

impl From<validator::ValidationErrors> for ApiError {
    fn from(e: validator::ValidationErrors) -> Self {
        ApiError::Validation(e.to_string())
    }
}
