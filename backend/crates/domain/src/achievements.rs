//! Challenge achievements: the three stars, and what a kid has earned on one challenge
//! (its badges and XP), read from the XP ledger.
//!
//! The stars mark real work, never a page visit:
//! 1. the first idea is submitted (the "solved" badge is in the ledger);
//! 2. the experiment is finished and documented (a photo of the model, or words instead);
//! 3. the final stage is done (the "river" badge) and the improved idea is submitted.

use uuid::Uuid;

use crate::progress::{
    mission_reward_id, XpEvent, XpSourceType, MISSION_BADGE_KEYS, PHOTO_BONUS_KEYS,
};
use crate::DomainError;

/// Every challenge has exactly three stars.
pub const STAR_COUNT: i16 = 3;

/// Words that stand in for a photo or hold the improved idea: at least this many letters.
const MIN_NOTE_CHARS: usize = 3;

/// One star a kid earned on a challenge, with the words that went with it (if any).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChallengeStar {
    pub child_id: Uuid,
    pub challenge_id: Uuid,
    pub star: i16,
    pub note: Option<String>,
}

fn has_reward(events: &[XpEvent], challenge_id: Uuid, source: XpSourceType, key: &str) -> bool {
    let id = mission_reward_id(challenge_id, key);
    events
        .iter()
        .any(|e| e.source_type == source && e.source_id == id)
}

fn note_ok(note: Option<&str>) -> bool {
    note.is_some_and(|n| n.trim().chars().count() >= MIN_NOTE_CHARS)
}

/// May this kid earn `star` now? Checks the work behind it, not the page they are on.
pub fn check_star(
    star: i16,
    challenge_id: Uuid,
    events: &[XpEvent],
    note: Option<&str>,
) -> Result<(), DomainError> {
    let badge = |k| has_reward(events, challenge_id, XpSourceType::MissionBadge, k);
    let ok = match star {
        1 => badge("solved"),
        2 => has_reward(events, challenge_id, XpSourceType::PhotoBonus, "build") || note_ok(note),
        3 => badge("river") && note_ok(note),
        _ => return Err(DomainError::Validation(format!("unknown star {star}"))),
    };
    if ok {
        Ok(())
    } else {
        Err(DomainError::Validation(format!(
            "star {star} needs its activity finished first"
        )))
    }
}

/// The badge keys a kid has earned on one challenge, in the mission's order.
pub fn challenge_badges(challenge_id: Uuid, events: &[XpEvent]) -> Vec<&'static str> {
    MISSION_BADGE_KEYS
        .iter()
        .copied()
        .filter(|k| has_reward(events, challenge_id, XpSourceType::MissionBadge, k))
        .collect()
}

/// All the XP a kid has earned on one challenge (solve, bonuses, badges and photos).
pub fn challenge_xp(challenge_id: Uuid, events: &[XpEvent]) -> i32 {
    let reward_ids: Vec<Uuid> = MISSION_BADGE_KEYS
        .iter()
        .chain(PHOTO_BONUS_KEYS.iter())
        .map(|k| mission_reward_id(challenge_id, k))
        .collect();
    events
        .iter()
        .filter(|e| match e.source_type {
            XpSourceType::Solve | XpSourceType::DefineBonus | XpSourceType::SketchBonus => {
                e.source_id == challenge_id
            }
            XpSourceType::MissionBadge | XpSourceType::PhotoBonus => {
                reward_ids.contains(&e.source_id)
            }
            _ => false,
        })
        .map(|e| i32::from(e.amount))
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::{award_mission_badge, award_photo_bonus, award_solve};
    use chrono::Utc;

    fn ids() -> (Uuid, Uuid) {
        (Uuid::new_v4(), Uuid::new_v4())
    }

    #[test]
    fn star_one_needs_the_first_idea() {
        let (kid, ch) = ids();
        assert!(check_star(1, ch, &[], None).is_err());
        let ev = vec![award_mission_badge(kid, ch, "solved", Utc::now(), &[]).unwrap()];
        assert!(check_star(1, ch, &ev, None).is_ok());
        // A badge on another challenge does not count.
        assert!(check_star(1, Uuid::new_v4(), &ev, None).is_err());
    }

    #[test]
    fn star_two_needs_a_photo_or_words() {
        let (kid, ch) = ids();
        assert!(check_star(2, ch, &[], None).is_err());
        assert!(check_star(2, ch, &[], Some("  ")).is_err());
        assert!(check_star(2, ch, &[], Some("a foil raft with straws")).is_ok());
        let ev = vec![award_photo_bonus(kid, ch, "build", Utc::now(), &[]).unwrap()];
        assert!(check_star(2, ch, &ev, None).is_ok());
    }

    #[test]
    fn star_three_needs_the_end_and_the_improved_idea() {
        let (kid, ch) = ids();
        let ev = vec![award_mission_badge(kid, ch, "river", Utc::now(), &[]).unwrap()];
        assert!(check_star(3, ch, &ev, None).is_err());
        assert!(check_star(3, ch, &[], Some("a raft with bottles")).is_err());
        assert!(check_star(3, ch, &ev, Some("a raft with bottles")).is_ok());
    }

    #[test]
    fn unknown_star_is_rejected() {
        let (_, ch) = ids();
        assert!(check_star(0, ch, &[], Some("words")).is_err());
        assert!(check_star(4, ch, &[], Some("words")).is_err());
    }

    #[test]
    fn badges_and_xp_are_per_challenge() {
        let (kid, ch) = ids();
        let other = Uuid::new_v4();
        let now = Utc::now();
        let ev = vec![
            award_mission_badge(kid, ch, "define", now, &[]).unwrap(),
            award_mission_badge(kid, ch, "river", now, &[]).unwrap(),
            award_photo_bonus(kid, ch, "design", now, &[]).unwrap(),
            award_mission_badge(kid, other, "clue", now, &[]).unwrap(),
            award_solve(kid, other, now, &[]).unwrap(),
        ];
        assert_eq!(challenge_badges(ch, &ev), vec!["define", "river"]);
        assert_eq!(challenge_xp(ch, &ev), 5 + 5 + 10);
        assert_eq!(challenge_badges(other, &ev), vec!["clue"]);
        assert_eq!(challenge_xp(other, &ev), 5 + 20);
    }
}
