//! SMTP email sender via lettre.
//!
//! `LettreEmailSender` connects without TLS enforcement — suitable for MailHog
//! in dev and for production where TLS is terminated at the load balancer.

use async_trait::async_trait;
use idea_pop_domain::{DomainError, EmailSender};
use lettre::{
    message::header::ContentType, AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};

pub struct LettreEmailSender {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from: String,
    app_url: String,
}

impl LettreEmailSender {
    pub fn new(
        smtp_host: &str,
        smtp_port: u16,
        _smtp_user: Option<String>,
        _smtp_pass: Option<String>,
        from: String,
        app_url: String,
    ) -> Result<Self, String> {
        let transport = AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(smtp_host)
            .port(smtp_port)
            .build();
        Ok(Self {
            transport,
            from,
            app_url,
        })
    }
}

#[async_trait]
impl EmailSender for LettreEmailSender {
    async fn send_verification_email(
        &self,
        to: &str,
        token: &str,
        _locale: &str,
    ) -> Result<(), DomainError> {
        let link = format!("{}/verify-email?token={}", self.app_url, token);
        let body = format!(
            "Welcome to Idea Pop!\n\nVerify your email: {link}\n\nThis link expires in 24 hours."
        );

        let email = Message::builder()
            .from(
                self.from
                    .parse()
                    .map_err(|e| DomainError::Internal(format!("invalid from address: {e}")))?,
            )
            .to(to
                .parse()
                .map_err(|e| DomainError::Internal(format!("invalid to address: {e}")))?)
            .subject("Verify your Idea Pop email")
            .header(ContentType::TEXT_PLAIN)
            .body(body)
            .map_err(|e| DomainError::Internal(format!("build email: {e}")))?;

        self.transport
            .send(email)
            .await
            .map_err(|e| DomainError::Internal(format!("smtp send: {e}")))?;

        Ok(())
    }
}

/// No-op sender for integration tests and dev environments without SMTP.
pub struct NullEmailSender;

#[async_trait]
impl EmailSender for NullEmailSender {
    async fn send_verification_email(
        &self,
        to: &str,
        token: &str,
        _locale: &str,
    ) -> Result<(), DomainError> {
        tracing::info!(to, token, "NullEmailSender: would send verification email");
        Ok(())
    }
}
