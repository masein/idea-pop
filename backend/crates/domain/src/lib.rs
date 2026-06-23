//! Idea Pop core domain: entities, value objects, services, and ports (traits).
//!
//! This crate is intentionally pure — it must not depend on a database, HTTP,
//! or any IO. Business rules (XP math, level thresholds, the parental-consent
//! state machine, content-visibility rules) live here so they can be unit-tested
//! in isolation. Infrastructure adapters in `idea-pop-infra` implement the ports
//! declared here.

#![forbid(unsafe_code)]

use thiserror::Error;

/// Top-level domain error. Specific variants are added as features land.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum DomainError {
    /// The requested entity does not exist.
    #[error("not found")]
    NotFound,
    /// Input failed a business-rule validation.
    #[error("validation error: {0}")]
    Validation(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validation_error_formats_message() {
        let err = DomainError::Validation("birth_year out of range".into());
        assert_eq!(err.to_string(), "validation error: birth_year out of range");
    }
}
