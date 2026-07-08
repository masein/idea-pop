//! Infrastructure adapters — implements domain ports.

#![forbid(unsafe_code)]

pub mod account_repo;
pub mod billing_repo;
pub mod challenge_repo;
pub mod child_repo;
pub mod clock;
pub mod content_repo;
pub mod email;
pub mod hasher;
pub mod helper;
pub mod portfolio_repo;
pub mod progress_repo;
pub mod token;

pub use account_repo::SqlxAccountRepo;
pub use billing_repo::{
    MockPaymentGateway, SqlxSubscriptionRepo, SqlxWebhookEventLog, StripePaymentGateway,
};
pub use challenge_repo::SqlxChallengeRepo;
pub use child_repo::{
    NullConsentEmailSender, SmtpConsentEmailSender, SqlxChildRepo, SqlxClassRepo, SqlxConsentRepo,
};
pub use clock::SystemClock;
pub use content_repo::{SqlxExploreRepo, SqlxLibraryRepo};
pub use email::{LettreEmailSender, NullEmailSender};
pub use hasher::Argon2Hasher;
pub use helper::MetisHelperProvider;
pub use idea_pop_domain as domain;
pub use portfolio_repo::{
    S3PhotoStore, SqlxIdeaRepo, SqlxModerationRepo, SqlxProjectRepo, SqlxReportRepo,
};
pub use progress_repo::{SqlxAnalyticsSink, SqlxBadgeRepo, SqlxProgressRepo, SqlxXpRepo};
pub use token::JwtTokenIssuer;
