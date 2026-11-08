//! Public preview: what the live website refuses while sections are unfinished.
//!
//! The live site runs with `PUBLIC_PREVIEW=1`; development never sets it, so this
//! policy changes nothing on localhost. Nothing is deleted: the routes stay in the
//! code and are simply answered with "coming soon" until the preview is switched off.

use uuid::Uuid;

/// The one mission visitors can play on the public site.
pub const PREVIEW_MISSION_SLUG: &str = "help-max-cross-the-river";

/// How the preview treats one API request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PreviewRule {
    /// Served as usual.
    Allow,
    /// Refused: the section is coming soon.
    ComingSoon,
    /// Served only when this challenge is the preview mission.
    MissionOnly(Uuid),
}

/// Decide how the public preview treats a request to `path` (without the `/api` prefix).
pub fn preview_rule(path: &str) -> PreviewRule {
    let path = path.trim_end_matches('/');
    let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    match parts.as_slice() {
        // Explore and Library: the lists stay (the faded page behind Coming Soon),
        // every video, course, maker and the progress they record are closed.
        ["explore", _] | ["courses", ..] | ["creators", ..] => PreviewRule::ComingSoon,
        ["progress", "video-view"] | ["progress", "lesson-complete"] => PreviewRule::ComingSoon,
        // Parental Controls. Signing in, the children list and resetting a PIN stay.
        ["parent", "approvals", ..] => PreviewRule::ComingSoon,
        ["parent", "children", _, "report" | "display-mode" | "helper" | "help-messages"] => {
            PreviewRule::ComingSoon
        }
        // Missions: only Max opens; every other mission and anything done on it is refused.
        ["challenges", id, ..] => match Uuid::parse_str(id) {
            Ok(id) => PreviewRule::MissionOnly(id),
            Err(_) => PreviewRule::Allow,
        },
        _ => PreviewRule::Allow,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ID: &str = "7b3f6a2e-1c4d-4e5f-9a8b-0c1d2e3f4a5b";

    #[test]
    fn explore_and_library_details_are_coming_soon_but_lists_stay() {
        assert_eq!(preview_rule("/explore"), PreviewRule::Allow);
        assert_eq!(preview_rule("/explore/abc"), PreviewRule::ComingSoon);
        assert_eq!(preview_rule("/library/studios"), PreviewRule::Allow);
        assert_eq!(preview_rule("/courses/abc"), PreviewRule::ComingSoon);
        assert_eq!(preview_rule("/creators/abc"), PreviewRule::ComingSoon);
        assert_eq!(
            preview_rule("/progress/video-view"),
            PreviewRule::ComingSoon
        );
        assert_eq!(
            preview_rule("/progress/lesson-complete"),
            PreviewRule::ComingSoon
        );
    }

    #[test]
    fn parental_controls_close_but_account_security_stays() {
        assert_eq!(preview_rule("/parent/approvals"), PreviewRule::ComingSoon);
        assert_eq!(
            preview_rule("/parent/approvals/x/approve"),
            PreviewRule::ComingSoon
        );
        assert_eq!(
            preview_rule("/parent/children/x/report"),
            PreviewRule::ComingSoon
        );
        assert_eq!(
            preview_rule("/parent/children/x/display-mode"),
            PreviewRule::ComingSoon
        );
        assert_eq!(
            preview_rule("/parent/children/x/helper"),
            PreviewRule::ComingSoon
        );
        assert_eq!(preview_rule("/parent/children"), PreviewRule::Allow);
        assert_eq!(
            preview_rule("/parent/children/x/reset-pin"),
            PreviewRule::Allow
        );
        assert_eq!(preview_rule("/auth/login"), PreviewRule::Allow);
        assert_eq!(preview_rule("/auth/logout"), PreviewRule::Allow);
        assert_eq!(preview_rule("/me"), PreviewRule::Allow);
    }

    #[test]
    fn missions_are_checked_against_max() {
        let id = Uuid::parse_str(ID).unwrap();
        assert_eq!(
            preview_rule(&format!("/challenges/{ID}")),
            PreviewRule::MissionOnly(id)
        );
        assert_eq!(
            preview_rule(&format!("/challenges/{ID}/attempts")),
            PreviewRule::MissionOnly(id)
        );
        assert_eq!(preview_rule("/challenges"), PreviewRule::Allow);
        assert_eq!(preview_rule("/challenges/not-a-uuid"), PreviewRule::Allow);
    }
}
