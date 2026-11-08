//! Public preview gate: on the live site (`PUBLIC_PREVIEW=1`) unfinished sections
//! answer 403 `coming-soon`, and every mission but Max is refused, whatever the URL.
//! In development the gate is a pass-through.

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use idea_pop_domain::preview::{preview_rule, PreviewRule, PREVIEW_MISSION_SLUG};

use crate::{error::problem, state::AppState};

fn coming_soon() -> Response {
    problem(
        StatusCode::FORBIDDEN,
        "coming-soon",
        "This part of IDEA POP is coming soon.",
    )
}

pub async fn preview_gate(State(state): State<AppState>, req: Request, next: Next) -> Response {
    if !state.public_preview {
        return next.run(req).await;
    }
    match preview_rule(req.uri().path()) {
        PreviewRule::Allow => next.run(req).await,
        PreviewRule::ComingSoon => coming_soon(),
        PreviewRule::MissionOnly(id) => match state.challenge.find_by_id(id).await {
            Ok(Some(c)) if c.slug != PREVIEW_MISSION_SLUG => coming_soon(),
            // Max, or no such mission (the handler answers 404 as usual).
            Ok(_) => next.run(req).await,
            Err(_) => problem(
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal",
                "Could not check this mission",
            ),
        },
    }
}
