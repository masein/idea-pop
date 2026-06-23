//! Infrastructure adapters for Idea Pop (database, email, storage) that
//! implement the ports defined in `idea-pop-domain`.
//!
//! Nothing concrete here yet — adapters arrive in Phase 1+ (SQLx repositories,
//! `lettre` email, S3/MinIO storage). The re-export below keeps the dependency
//! wired so the layering is explicit from day one.

#![forbid(unsafe_code)]

pub use idea_pop_domain as domain;
