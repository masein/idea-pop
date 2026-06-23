//! System clock adapter.

use chrono::{DateTime, Utc};
use idea_pop_domain::Clock;

pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> DateTime<Utc> {
        Utc::now()
    }
}
