//! Handlers for GET /challenges and GET /challenges/:id.
//!
//! Challenges are readable by any authenticated principal (including restricted
//! children). The sharing step in the challenge UI is consent-gated on the
//! frontend; the API surfaces the full payload.

use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use idea_pop_domain::{
    challenge::{Challenge, ChallengeFilter},
    AgeMode,
};

use crate::{error::ApiError, extractor::AuthToken, state::AppState};

// ── DTOs ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, ToSchema)]
pub struct AgeTierVariantResponse {
    pub age_tier: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title_override: Option<String>,
    pub summary: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ToolResponse {
    pub kind: String,
    pub age_mode: String,
}

/// A single challenge step — the `step` field names the kind; remaining fields
/// carry the typed payload. Serialised directly from the domain enum so the
/// client receives the full, structured JSON without a separate schema per step.
pub type ChallengeStepValue = serde_json::Value;

#[derive(Debug, Serialize, ToSchema)]
pub struct ChallengeResponse {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub season: i16,
    pub week_number: i16,
    pub xp_reward: i16,
    /// 8 steps in canonical order. Each object has a `"step"` discriminant field.
    pub steps: Vec<ChallengeStepValue>,
    pub tools: Vec<ToolResponse>,
    pub age_tier_variants: Vec<AgeTierVariantResponse>,
    pub related_video_ids: Vec<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ChallengePageResponse {
    pub items: Vec<ChallengeResponse>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

// ── Query params ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, IntoParams)]
pub struct ChallengeQuery {
    pub season: Option<i16>,
    pub week: Option<i16>,
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

// ── Mappers ───────────────────────────────────────────────────────────────────

fn challenge_to_dto(c: Challenge) -> ChallengeResponse {
    let steps: Vec<serde_json::Value> = c
        .steps
        .iter()
        .map(|s| serde_json::to_value(s).unwrap_or(serde_json::Value::Null))
        .collect();

    let tools = c
        .tools
        .iter()
        .map(|t| ToolResponse {
            kind: t.kind.as_str().to_owned(),
            age_mode: t.age_mode.as_str().to_owned(),
        })
        .collect();

    let age_tier_variants = c
        .age_tier_variants
        .iter()
        .map(|v| AgeTierVariantResponse {
            age_tier: v.age_tier.as_str().to_owned(),
            title_override: v.title_override.clone(),
            summary: v.summary.clone(),
        })
        .collect();

    ChallengeResponse {
        id: c.id,
        title: c.title,
        slug: c.slug,
        season: c.season,
        week_number: c.week_number,
        xp_reward: c.xp_reward,
        steps,
        tools,
        age_tier_variants,
        related_video_ids: c.related_video_ids,
        created_at: c.created_at,
    }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// List challenges — paginated; optional season, week, and age_mode filters.
#[utoipa::path(
    get, path = "/challenges",
    tag = "challenges",
    params(ChallengeQuery),
    responses(
        (status = 200, description = "Paginated challenge list", body = ChallengePageResponse),
        (status = 401, description = "Unauthenticated",          body = crate::ProblemDetail),
        (status = 422, description = "Validation error",          body = crate::ProblemDetail),
    )
)]
pub async fn list_challenges(
    _auth: AuthToken,
    State(state): State<AppState>,
    Query(q): Query<ChallengeQuery>,
) -> Result<Json<ChallengePageResponse>, ApiError> {
    let age_mode: Option<AgeMode> = q
        .age_mode
        .as_deref()
        .map(|s| {
            AgeMode::from_slug(s).ok_or_else(|| {
                idea_pop_domain::DomainError::Validation(format!(
                    "unknown age_mode '{s}'; expected 'young' or 'older'"
                ))
            })
        })
        .transpose()?;

    let filter = ChallengeFilter {
        season: q.season,
        week: q.week,
        age_mode,
        page: q.page,
        per_page: q.per_page,
    };
    filter.validate()?;

    let page = state.challenge.list(&filter).await?;
    Ok(Json(ChallengePageResponse {
        items: page.items.into_iter().map(challenge_to_dto).collect(),
        total: page.total,
        page: page.page,
        per_page: page.per_page,
    }))
}

/// Get a single challenge by ID — full 8-step structured payload.
#[utoipa::path(
    get, path = "/challenges/{id}",
    tag = "challenges",
    params(("id" = Uuid, Path, description = "Challenge UUID")),
    responses(
        (status = 200, description = "Challenge detail", body = ChallengeResponse),
        (status = 401, description = "Unauthenticated",  body = crate::ProblemDetail),
        (status = 404, description = "Not found",        body = crate::ProblemDetail),
    )
)]
pub async fn get_challenge(
    _auth: AuthToken,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ChallengeResponse>, ApiError> {
    match state.challenge.find_by_id(id).await? {
        Some(c) => Ok(Json(challenge_to_dto(c))),
        None => Err(ApiError::Domain(idea_pop_domain::DomainError::NotFound)),
    }
}
