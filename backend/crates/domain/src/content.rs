//! Explore & Library content entities: ExploreVideo, Creator, Course, Lesson, QuickMake.

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{AgeMode, DomainError};

// ── Studio ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Studio {
    Craft,
    Art,
    Music,
    Code,
    Science,
    Nature,
}

impl Studio {
    pub fn as_str(self) -> &'static str {
        match self {
            Studio::Craft => "craft",
            Studio::Art => "art",
            Studio::Music => "music",
            Studio::Code => "code",
            Studio::Science => "science",
            Studio::Nature => "nature",
        }
    }

    pub fn from_slug(s: &str) -> Option<Self> {
        match s {
            "craft" => Some(Studio::Craft),
            "art" => Some(Studio::Art),
            "music" => Some(Studio::Music),
            "code" => Some(Studio::Code),
            "science" => Some(Studio::Science),
            "nature" => Some(Studio::Nature),
            _ => None,
        }
    }

    pub fn all() -> [Studio; 6] {
        [
            Studio::Craft,
            Studio::Art,
            Studio::Music,
            Studio::Code,
            Studio::Science,
            Studio::Nature,
        ]
    }
}

// ── Habitat ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Habitat {
    Ocean,
    Jungle,
    Desert,
    Sky,
}

impl Habitat {
    pub fn as_str(self) -> &'static str {
        match self {
            Habitat::Ocean => "ocean",
            Habitat::Jungle => "jungle",
            Habitat::Desert => "desert",
            Habitat::Sky => "sky",
        }
    }

    pub fn from_slug(s: &str) -> Option<Self> {
        match s {
            "ocean" => Some(Habitat::Ocean),
            "jungle" => Some(Habitat::Jungle),
            "desert" => Some(Habitat::Desert),
            "sky" => Some(Habitat::Sky),
            _ => None,
        }
    }
}

// ── Entities ──────────────────────────────────────────────────────────────────

pub struct ExploreVideo {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub habitat: Habitat,
    pub taxonomy: String,
    pub video_url: String,
    pub duration_s: i32,
    pub design_secret: String,
    pub sticker_id: String,
    /// XP awarded when a child watches this video; default 5.
    pub xp_reward: i16,
    /// True when this content was AI-generated. Always surfaced in API responses per CLAUDE.md.
    pub ai_generated: bool,
    /// Age brackets this video is suitable for. May contain both Young and Older.
    pub age_modes: Vec<AgeMode>,
    pub created_at: DateTime<Utc>,
}

pub struct Creator {
    pub id: Uuid,
    pub display_name: String,
    pub bio: String,
    pub studio: Studio,
    pub avatar_url: String,
    pub created_at: DateTime<Utc>,
}

pub struct Course {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub studio: Studio,
    pub creator_id: Uuid,
    pub summary: String,
    pub created_at: DateTime<Utc>,
}

pub struct Lesson {
    pub id: Uuid,
    pub course_id: Uuid,
    /// 1-based display order within the course.
    pub ordinal: i16,
    pub title: String,
    pub video_url: String,
    pub duration_s: i32,
    /// XP awarded for completing this lesson; default 10.
    pub xp_reward: i16,
}

pub struct QuickMake {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub studio: Studio,
    /// Skill difficulty: 1 (easy), 2 (medium), 3 (hard).
    pub difficulty: i16,
    pub time_minutes: i16,
    pub materials: Vec<String>,
    /// Mess level: 1 (tidy), 2 (moderate), 3 (messy).
    pub mess_level: i16,
    pub video_url: String,
    /// XP awarded for completing this make; default 5.
    pub xp_reward: i16,
    /// True when AI-generated. Always surfaced per CLAUDE.md.
    pub ai_generated: bool,
    pub created_at: DateTime<Utc>,
}

// ── Pagination ────────────────────────────────────────────────────────────────

pub struct Page<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

impl<T> Page<T> {
    pub fn new(items: Vec<T>, total: i64, page: i64, per_page: i64) -> Self {
        Self {
            items,
            total,
            page,
            per_page,
        }
    }
}

// ── Filters ───────────────────────────────────────────────────────────────────

pub struct ExploreFilter {
    pub habitat: Option<Habitat>,
    pub age_mode: Option<AgeMode>,
    pub page: i64,
    pub per_page: i64,
}

impl ExploreFilter {
    pub fn validate(&self) -> Result<(), DomainError> {
        if self.page < 1 {
            return Err(DomainError::Validation("page must be ≥ 1".into()));
        }
        if self.per_page < 1 || self.per_page > 100 {
            return Err(DomainError::Validation("per_page must be 1–100".into()));
        }
        Ok(())
    }
}

impl Default for ExploreFilter {
    fn default() -> Self {
        Self {
            habitat: None,
            age_mode: None,
            page: 1,
            per_page: 20,
        }
    }
}

pub struct QuickMakeFilter {
    pub studio: Option<Studio>,
    pub page: i64,
    pub per_page: i64,
}

impl QuickMakeFilter {
    pub fn validate(&self) -> Result<(), DomainError> {
        if self.page < 1 {
            return Err(DomainError::Validation("page must be ≥ 1".into()));
        }
        if self.per_page < 1 || self.per_page > 100 {
            return Err(DomainError::Validation("per_page must be 1–100".into()));
        }
        Ok(())
    }
}

impl Default for QuickMakeFilter {
    fn default() -> Self {
        Self {
            studio: None,
            page: 1,
            per_page: 20,
        }
    }
}

// ── Studio overview ───────────────────────────────────────────────────────────

pub struct StudioCount {
    pub studio: Studio,
    pub quick_make_count: i64,
}

// ── Domain validation ─────────────────────────────────────────────────────────

pub fn validate_quick_make_difficulty(d: i16) -> Result<(), DomainError> {
    if !(1..=3).contains(&d) {
        return Err(DomainError::Validation(format!(
            "difficulty must be 1–3, got {d}"
        )));
    }
    Ok(())
}

pub fn validate_mess_level(m: i16) -> Result<(), DomainError> {
    if !(1..=3).contains(&m) {
        return Err(DomainError::Validation(format!(
            "mess_level must be 1–3, got {m}"
        )));
    }
    Ok(())
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn studio_round_trips() {
        for s in Studio::all() {
            assert_eq!(Studio::from_slug(s.as_str()), Some(s));
        }
        assert_eq!(Studio::from_slug("unknown"), None);
    }

    #[test]
    fn habitat_round_trips() {
        for h in [
            Habitat::Ocean,
            Habitat::Jungle,
            Habitat::Desert,
            Habitat::Sky,
        ] {
            assert_eq!(Habitat::from_slug(h.as_str()), Some(h));
        }
        assert_eq!(Habitat::from_slug("lava"), None);
    }

    #[test]
    fn age_mode_round_trips() {
        assert_eq!(AgeMode::from_slug("young"), Some(AgeMode::Young));
        assert_eq!(AgeMode::from_slug("older"), Some(AgeMode::Older));
        assert_eq!(AgeMode::from_slug("teen"), None);
        assert_eq!(AgeMode::Young.as_str(), "young");
        assert_eq!(AgeMode::Older.as_str(), "older");
    }

    #[test]
    fn explore_filter_validation() {
        let ok = ExploreFilter::default();
        assert!(ok.validate().is_ok());

        let bad_page = ExploreFilter {
            page: 0,
            ..ExploreFilter::default()
        };
        assert!(bad_page.validate().is_err());

        let bad_per_page = ExploreFilter {
            per_page: 101,
            ..ExploreFilter::default()
        };
        assert!(bad_per_page.validate().is_err());
    }

    #[test]
    fn quick_make_difficulty_validation() {
        assert!(validate_quick_make_difficulty(1).is_ok());
        assert!(validate_quick_make_difficulty(3).is_ok());
        assert!(validate_quick_make_difficulty(0).is_err());
        assert!(validate_quick_make_difficulty(4).is_err());
    }

    #[test]
    fn mess_level_validation() {
        assert!(validate_mess_level(1).is_ok());
        assert!(validate_mess_level(3).is_ok());
        assert!(validate_mess_level(4).is_err());
    }

    #[test]
    fn studio_all_covers_six_variants() {
        let all = Studio::all();
        assert_eq!(all.len(), 6);
        let slugs: Vec<_> = all.iter().map(|s| s.as_str()).collect();
        assert!(slugs.contains(&"craft"));
        assert!(slugs.contains(&"nature"));
    }
}
