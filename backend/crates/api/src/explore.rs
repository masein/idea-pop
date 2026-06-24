//! GET /explore — Explore-video list (paginated, filterable) and detail.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use idea_pop_domain::{AgeMode, DomainError, ExploreFilter, Habitat};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{error::ApiError, extractor::AuthToken, AppState};

// ── DTOs ──────────────────────────────────────────────────────────────────────

#[derive(Serialize, ToSchema)]
pub struct ExploreVideoResponse {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub habitat: String,
    pub taxonomy: String,
    pub video_url: String,
    pub duration_s: i32,
    pub design_secret: String,
    pub sticker_id: String,
    pub xp_reward: i16,
    /// Always present — UI must label AI-generated content per platform rules.
    pub ai_generated: bool,
    pub age_modes: Vec<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, ToSchema)]
pub struct ExplorePageResponse {
    pub items: Vec<ExploreVideoResponse>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

#[derive(Deserialize, IntoParams)]
pub struct ExploreQuery {
    /// Filter by habitat slug: ocean | jungle | desert | sky
    pub habitat: Option<String>,
    /// Filter by age_mode slug: young | older
    pub age_mode: Option<String>,
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_per_page")]
    pub per_page: i64,
}

fn default_page() -> i64 {
    1
}
fn default_per_page() -> i64 {
    20
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// List explore videos (paginated). Restricted children CAN access learning content.
#[utoipa::path(get, path = "/explore", tag = "explore",
    params(ExploreQuery),
    responses(
        (status = 200, description = "Paginated explore videos", body = ExplorePageResponse),
        (status = 401, description = "Not authenticated", body = crate::ProblemDetail),
        (status = 422, description = "Invalid filter", body = crate::ProblemDetail),
    ))]
pub async fn list_explore(
    _auth: AuthToken,
    State(state): State<AppState>,
    Query(q): Query<ExploreQuery>,
) -> Result<Json<ExplorePageResponse>, ApiError> {
    let habitat = q
        .habitat
        .as_deref()
        .map(|s| {
            Habitat::from_slug(s)
                .ok_or_else(|| DomainError::Validation(format!("unknown habitat '{s}'")))
        })
        .transpose()?;

    let age_mode = q
        .age_mode
        .as_deref()
        .map(|s| {
            AgeMode::from_slug(s)
                .ok_or_else(|| DomainError::Validation(format!("unknown age_mode '{s}'")))
        })
        .transpose()?;

    let filter = ExploreFilter {
        habitat,
        age_mode,
        page: q.page,
        per_page: q.per_page,
    };
    filter.validate()?;

    let page = state.explore.list(&filter).await?;

    Ok(Json(ExplorePageResponse {
        total: page.total,
        page: page.page,
        per_page: page.per_page,
        items: page.items.into_iter().map(video_to_dto).collect(),
    }))
}

/// Get a single explore video by ID.
#[utoipa::path(get, path = "/explore/{id}", tag = "explore",
    params(("id" = Uuid, Path, description = "Video UUID")),
    responses(
        (status = 200, description = "Explore video", body = ExploreVideoResponse),
        (status = 401, description = "Not authenticated", body = crate::ProblemDetail),
        (status = 404, description = "Not found", body = crate::ProblemDetail),
    ))]
pub async fn get_explore(
    _auth: AuthToken,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<(StatusCode, Json<ExploreVideoResponse>), ApiError> {
    let video = state
        .explore
        .find_by_id(id)
        .await?
        .ok_or(DomainError::NotFound)?;
    Ok((StatusCode::OK, Json(video_to_dto(video))))
}

fn video_to_dto(v: idea_pop_domain::ExploreVideo) -> ExploreVideoResponse {
    ExploreVideoResponse {
        id: v.id,
        title: v.title,
        slug: v.slug,
        habitat: v.habitat.as_str().to_owned(),
        taxonomy: v.taxonomy,
        video_url: v.video_url,
        duration_s: v.duration_s,
        design_secret: v.design_secret,
        sticker_id: v.sticker_id,
        xp_reward: v.xp_reward,
        ai_generated: v.ai_generated,
        age_modes: v.age_modes.iter().map(|a| a.as_str().to_owned()).collect(),
        created_at: v.created_at,
    }
}
