# DRAFT — Privacy policy section: the AI Mission Helper

> **STATUS: DRAFT FOR REVIEW — NOT PUBLISHED, NOT SIGNED OFF.**
> Before this ships to children, the platform owner must:
> 1. Confirm Metis AI's terms of service and data-retention / zero-retention
>    options for child-adjacent use (including where data is processed and
>    what Metis does with request contents).
> 2. Decide the final `HELP_MESSAGE_RETENTION_DAYS` value and state it below.
> 3. Review, edit, and publish this section in the real privacy policy and
>    parent-facing disclosures.
> The helper stays disabled in production until those are done.

---

## The AI Mission Helper (proposed policy text)

**What it is.** Inside a mission, your child can ask a short question and get
a small, age-appropriate nudge back — about the mission they're working on, or
about related learning topics such as nature, science, animals, and how things
work (for example, "why does my bridge keep falling?" or "how do beavers build
dams?"). It is not an open chatbot: it stays on safe, educational topics, it
never gives the full answer to a mission away, and it refuses anything
personal, social, or off-limits.

**What leaves the device.** When your child asks the helper a question, we
send exactly two things to our server: the text of the question and which
mission step it belongs to. Our server adds only the mission step's own
published text (the story, instructions, and hints you can see in the app)
and forwards that to our AI provider, **Metis AI** (an OpenAI-compatible
service). We never send your child's name, nickname, age, school, location,
photos, or any account information to the AI provider. The AI provider is
called only from our servers — your child's device never communicates with
it directly.

**Safety checks on every message.** Before a question reaches the AI, it
passes two safety layers: an automatic filter that blocks personal
information, unsafe topics, and attempts to manipulate the assistant; and an
AI-based safety classification. The AI's answer goes through the same safety
classification before your child sees it. Anything blocked is replaced with
a gentle "let's get back to the mission" message. When a safety check cannot
reach a clear verdict, we block rather than show the message.

**Everything is visible to you.** Every question and answer — including
blocked ones, with the block noted — is stored in your child's helper
transcript. Parents can review their child's full transcript, and teachers
can review transcripts for children in their class. There are no private or
hidden conversations.

**Limits.** The helper is off by default and only works when (a) you have
given parental consent for your child's account, and (b) you have switched
the "AI mission helper" toggle on in your parent dashboard. Your child can
send a limited number of questions per hour.

**Retention.** Helper transcripts are kept for
**[RETENTION_DAYS — OWNER TO CONFIRM, e.g. 90] days** and then automatically
deleted. You can turn the helper off for your child at any time; this stops
new questions immediately.

**Our AI provider.**
**[OWNER TO CONFIRM AND COMPLETE after reviewing Metis AI's terms: state
Metis AI's retention/training policy for API request contents, the
processing region, and a link to their terms.]**

---

*Implementation cross-reference (not for publication): scoped endpoint
`POST /challenges/{id}/steps/{step}/help`; dual moderation (deterministic
pre-screen + SAFE/UNSAFE classification, fail-closed); append-only
`help_messages` table; parent feed `GET /parent/children/{id}/help-messages`;
teacher feed `GET /teacher/help-messages`; per-child opt-in
`child_profiles.helper_enabled`; retention purge via
`HELP_MESSAGE_RETENTION_DAYS`.*
