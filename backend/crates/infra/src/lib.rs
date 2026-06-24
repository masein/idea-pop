//! Infrastructure adapters — implements domain ports.

#![forbid(unsafe_code)]

pub mod account_repo;
pub mod child_repo;
pub mod clock;
pub mod content_repo;
pub mod email;
pub mod hasher;
pub mod token;

pub use account_repo::SqlxAccountRepo;
pub use child_repo::{
    NullConsentEmailSender, SmtpConsentEmailSender, SqlxChildRepo, SqlxClassRepo, SqlxConsentRepo,
};
pub use clock::SystemClock;
pub use content_repo::{SqlxExploreRepo, SqlxLibraryRepo};
pub use email::{LettreEmailSender, NullEmailSender};
pub use hasher::Argon2Hasher;
pub use idea_pop_domain as domain;
pub use token::JwtTokenIssuer;
