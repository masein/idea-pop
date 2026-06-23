//! Infrastructure adapters — implements domain ports.

#![forbid(unsafe_code)]

pub mod account_repo;
pub mod clock;
pub mod email;
pub mod hasher;
pub mod token;

pub use account_repo::SqlxAccountRepo;
pub use clock::SystemClock;
pub use email::{LettreEmailSender, NullEmailSender};
pub use hasher::Argon2Hasher;
pub use idea_pop_domain as domain;
pub use token::JwtTokenIssuer;
