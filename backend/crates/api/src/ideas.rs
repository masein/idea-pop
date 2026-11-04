//! A kid's idea from Nature Clues, and Conspy's review of it.
//!
//! POST /challenges/{id}/hero-ideas always saves the idea first; no gate, limit or failure below that
//! line can lose it. The AI review only runs when every helper gate is open. Otherwise the idea
//! stays `pending_review` and the response says no review is available, so nothing is made up.
//!
//! GET /hero-ideas/{id}/references is the integration point for the real-world search. No search
//! provider exists yet, so it answers `available: false`. A provider plugs in at
//! `search_references`, and must only return sources it has verified.

use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;
use sqlx::Row;
use utoipa::ToSchema;
use uuid::Uuid;

use idea_pop_domain::{
    build_idea_review_prompt, help::screen_question, parse_idea_review, DomainError, GatedAction,
    IdeaExperiment, IdeaReview, IdeaReviewContext, ReviewOwner, STATUS_PENDING,
};

use crate::{error::ApiError, extractor::KidAuth, help::log_exchange, state::AppState};

/// Nature Clues, the step the review belongs to in the helper's transcript.
const CLUES_STEP: i16 = 3;
const MAX_IDEA_CHARS: usize = 2000;

fn internal(e: sqlx::Error) -> DomainError {
    DomainError::Internal(e.to_string())
}

#[derive(serde::Deserialize, ToSchema)]
pub struct SubmitIdeaRequest {
    /// The kid's own words. Empty only when the idea is a voice note.
    #[serde(default)]
    pub text: String,
    pub hero_index: Option<i16>,
    #[serde(default)]
    pub has_voice: bool,
    pub lang: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct IdeaExperimentResponse {
    pub materials: Vec<String>,
    pub steps: Vec<String>,
}

#[derive(Serialize, ToSchema)]
pub struct SubmitIdeaResponse {
    pub idea_id: Uuid,
    pub version: i32,
    /// pending_review | reviewed | later_guidance
    pub status: String,
    /// related | unrelated | not_testable_yet, once a review has run.
    pub outcome: Option<String>,
    pub feedback: Option<String>,
    pub experiment: Option<IdeaExperimentResponse>,
    /// False when no review ran (helper off, gate closed, or no usable answer).
    pub review_available: bool,
}

#[derive(Serialize, ToSchema)]
pub struct IdeaReference {
    pub title: String,
    pub url: String,
    pub source: String,
    pub summary: String,
    pub image_url: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct IdeaReferencesResponse {
    /// False while no search provider is connected: not the same as "nothing found".
    pub available: bool,
    pub references: Vec<IdeaReference>,
}

/// The hero and the mission, in the kid's language, from the challenge's own content.
struct MissionWords {
    title: String,
    problem: String,
    goal: String,
    hero_name: Option<String>,
    hero_trick: String,
}

async fn mission_words(
    state: &AppState,
    challenge_id: Uuid,
    hero_index: Option<i16>,
    lang: &str,
) -> Result<MissionWords, DomainError> {
    let row = sqlx::query("SELECT title, story, translations FROM challenges WHERE id = $1")
        .bind(challenge_id)
        .fetch_optional(&state.db)
        .await
        .map_err(internal)?
        .ok_or(DomainError::NotFound)?;
    let title: String = row.get("title");
    let story_en: Option<serde_json::Value> = row.get("story");
    let translations: serde_json::Value = row.get("translations");
    let story = (if lang == "fa" {
        translations.get("fa").and_then(|t| t.get("story")).cloned()
    } else {
        None
    })
    .or(story_en)
    .unwrap_or(serde_json::Value::Null);
    let text = |v: &serde_json::Value, key: &str| {
        v.get(key)
            .and_then(|x| x.as_str())
            .unwrap_or_default()
            .to_owned()
    };
    let card = story
        .get("card")
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let hero = hero_index.filter(|i| *i >= 0).and_then(|i| {
        story
            .get("clue_cards")?
            .as_array()?
            .get(i as usize)
            .cloned()
    });
    Ok(MissionWords {
        title,
        problem: text(&card, "problem"),
        goal: text(&card, "goal"),
        hero_name: hero.as_ref().map(|h| text(h, "name")),
        hero_trick: hero.as_ref().map(|h| text(h, "trick")).unwrap_or_default(),
    })
}

/// Runs the AI review when every gate is open. `None` means no review: never an error, because
/// the idea is already saved and the kid carries on either way.
async fn ai_review(
    state: &AppState,
    child_id: Uuid,
    challenge_id: Uuid,
    idea: &str,
    words: &MissionWords,
    lang: &str,
) -> Option<IdeaReview> {
    if !state.helper_config.enabled || idea.is_empty() {
        return None;
    }
    state
        .consent
        .check_gate(child_id, &GatedAction::CollectExtraData)
        .await
        .ok()?;
    let enabled: Option<bool> =
        sqlx::query_scalar("SELECT helper_enabled FROM child_profiles WHERE id = $1")
            .bind(child_id)
            .fetch_optional(&state.db)
            .await
            .ok()?;
    if !enabled.unwrap_or(false) || screen_question(idea).is_some() {
        return None;
    }
    let recent: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM help_messages
         WHERE child_id = $1 AND created_at > now() - interval '1 hour'",
    )
    .bind(child_id)
    .fetch_one(&state.db)
    .await
    .ok()?;
    if recent >= state.helper_config.hourly_limit || !state.helper.moderate(idea).await.ok()? {
        return None;
    }
    let prompt = build_idea_review_prompt(&IdeaReviewContext {
        challenge_title: &words.title,
        problem: &words.problem,
        goal: &words.goal,
        hero_name: words.hero_name.as_deref().unwrap_or_default(),
        hero_trick: &words.hero_trick,
        lang,
    });
    let raw = state.helper.answer(&prompt, idea).await.ok()?;
    let review = parse_idea_review(&raw);
    // Everything the kid would read passes the same output moderation as the helper.
    let safe = match &review {
        Some(IdeaReview::Related {
            feedback,
            experiment,
        }) => {
            let extra = experiment
                .as_ref()
                .map(|e: &IdeaExperiment| {
                    format!("{} {}", e.materials.join(" "), e.steps.join(" "))
                })
                .unwrap_or_default();
            state
                .helper
                .moderate(&format!("{feedback} {extra}"))
                .await
                .unwrap_or(false)
        }
        Some(_) => true,
        None => false,
    };
    let _ = log_exchange(
        state,
        child_id,
        challenge_id,
        CLUES_STEP,
        idea,
        Some(&raw),
        !safe,
    )
    .await;
    review.filter(|_| safe)
}

async fn add_review(
    state: &AppState,
    idea_id: Uuid,
    status: &str,
    outcome: Option<&str>,
    owner: ReviewOwner,
    feedback: Option<&str>,
    experiment: Option<serde_json::Value>,
) -> Result<(), DomainError> {
    sqlx::query(
        "INSERT INTO idea_reviews (idea_id, status, outcome, owner, feedback, experiment)
         VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(idea_id)
    .bind(status)
    .bind(outcome)
    .bind(owner.as_str())
    .bind(feedback)
    .bind(experiment)
    .execute(&state.db)
    .await
    .map_err(internal)?;
    Ok(())
}

/// Save a kid's idea, then review it if a review can run.
#[utoipa::path(post, path = "/challenges/{id}/hero-ideas", tag = "challenges",
    params(("id" = Uuid, Path, description = "Challenge UUID")),
    request_body = SubmitIdeaRequest,
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Saved, with Conspy's review when one could run", body = SubmitIdeaResponse),
        (status = 403, description = "Not a kid token", body = crate::ProblemDetail),
        (status = 404, description = "Unknown challenge", body = crate::ProblemDetail),
    ))]
pub async fn submit_idea(
    kid: KidAuth,
    State(state): State<AppState>,
    Path(challenge_id): Path<Uuid>,
    Json(body): Json<SubmitIdeaRequest>,
) -> Result<Json<SubmitIdeaResponse>, ApiError> {
    let child_id = kid.child_id;
    let lang = body.lang.as_deref().unwrap_or("en").to_owned();
    let idea: String = body.text.trim().chars().take(MAX_IDEA_CHARS).collect();
    if idea.is_empty() && !body.has_voice {
        return Err(DomainError::Validation("an idea needs words or a voice note".into()).into());
    }
    let words = mission_words(&state, challenge_id, body.hero_index, &lang).await?;

    // Saved before anything else can go wrong. A changed idea is a new version, never an edit.
    let saved = sqlx::query(
        "INSERT INTO idea_submissions (child_id, challenge_id, hero_index, hero_name, original_text, has_voice, version)
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE(
             (SELECT MAX(version) FROM idea_submissions WHERE child_id = $1 AND challenge_id = $2), 0) + 1)
         RETURNING id, version",
    )
    .bind(child_id)
    .bind(challenge_id)
    .bind(body.hero_index)
    .bind(&words.hero_name)
    .bind(&idea)
    .bind(body.has_voice)
    .fetch_one(&state.db)
    .await
    .map_err(internal)?;
    let idea_id: Uuid = saved.get("id");
    let version: i32 = saved.get("version");

    let owner = ReviewOwner::from_config(std::env::var("IDEA_REVIEW_OWNER").ok().as_deref());
    add_review(&state, idea_id, STATUS_PENDING, None, owner, None, None).await?;

    let review = if owner.uses_ai() {
        ai_review(&state, child_id, challenge_id, &idea, &words, &lang).await
    } else {
        None
    };
    let Some(review) = review else {
        return Ok(Json(SubmitIdeaResponse {
            idea_id,
            version,
            status: STATUS_PENDING.into(),
            outcome: None,
            feedback: None,
            experiment: None,
            review_available: false,
        }));
    };

    let (feedback, experiment) = match &review {
        IdeaReview::Related {
            feedback,
            experiment,
        } => (Some(feedback.clone()), experiment.clone()),
        _ => (None, None),
    };
    let experiment_json = experiment
        .as_ref()
        .and_then(|e| serde_json::to_value(e).ok());
    add_review(
        &state,
        idea_id,
        review.status(),
        Some(review.outcome()),
        owner,
        feedback.as_deref(),
        experiment_json,
    )
    .await?;
    Ok(Json(SubmitIdeaResponse {
        idea_id,
        version,
        status: review.status().into(),
        outcome: Some(review.outcome().into()),
        feedback,
        experiment: experiment.map(|e| IdeaExperimentResponse {
            materials: e.materials,
            steps: e.steps,
        }),
        review_available: true,
    }))
}

/// The search provider's place. Must return only sources it has verified; never generated ones.
async fn search_references(_idea: &str) -> Option<Vec<IdeaReference>> {
    None
}

/// Real-world projects and research like this idea, when a search provider is connected.
#[utoipa::path(get, path = "/hero-ideas/{id}/references", tag = "challenges",
    params(("id" = Uuid, Path, description = "Idea UUID")),
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Verified references, or available=false", body = IdeaReferencesResponse),
        (status = 403, description = "Not a kid token", body = crate::ProblemDetail),
        (status = 404, description = "Not this kid's idea", body = crate::ProblemDetail),
    ))]
pub async fn idea_references(
    kid: KidAuth,
    State(state): State<AppState>,
    Path(idea_id): Path<Uuid>,
) -> Result<Json<IdeaReferencesResponse>, ApiError> {
    let idea: String = sqlx::query_scalar(
        "SELECT original_text FROM idea_submissions WHERE id = $1 AND child_id = $2",
    )
    .bind(idea_id)
    .bind(kid.child_id)
    .fetch_optional(&state.db)
    .await
    .map_err(internal)?
    .ok_or(DomainError::NotFound)?;
    Ok(Json(match search_references(&idea).await {
        Some(references) => IdeaReferencesResponse {
            available: true,
            references,
        },
        None => IdeaReferencesResponse {
            available: false,
            references: Vec::new(),
        },
    }))
}
