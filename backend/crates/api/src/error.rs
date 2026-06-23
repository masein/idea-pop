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
    /// A URI identifying the problem type.
    #[serde(rename = "type")]
    pub type_uri: String,
    /// Short, human-readable summary of the problem.
    pub title: String,
    /// HTTP status code.
    pub status: u16,
    /// Human-readable explanation specific to this occurrence.
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

/// Handler-level error: converts to an RFC 7807 problem+json response.
#[derive(Debug)]
pub enum ApiError {
    Domain(DomainError),
    Database(sqlx::Error),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, body) = match self {
            ApiError::Domain(DomainError::NotFound) => (
                StatusCode::NOT_FOUND,
                ProblemDetail::new(
                    "not-found",
                    "Not Found",
                    StatusCode::NOT_FOUND,
                    "The requested resource does not exist.",
                ),
            ),
            ApiError::Domain(DomainError::Validation(msg)) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ProblemDetail::new(
                    "validation",
                    "Unprocessable Entity",
                    StatusCode::UNPROCESSABLE_ENTITY,
                    msg,
                ),
            ),
            ApiError::Database(e) => {
                tracing::error!(error = %e, "database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ProblemDetail::new(
                        "internal",
                        "Internal Server Error",
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "An unexpected error occurred.",
                    ),
                )
            }
        };

        let mut response = (status, Json(body)).into_response();
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/problem+json"),
        );
        response
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
