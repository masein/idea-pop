//! Idempotent seed binary — inserts reference content if not already present.
//!
//! Usage: DATABASE_URL=... cargo run -p idea-pop-server --bin seed
//! All inserts use ON CONFLICT (slug) DO NOTHING so re-running is safe.

#![forbid(unsafe_code)]
#![allow(clippy::type_complexity)]

use sqlx::PgPool;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPool::connect(&database_url).await?;

    sqlx::migrate!("../../migrations").run(&pool).await?;
    println!("migrations OK");

    seed_creators(&pool).await?;
    seed_courses(&pool).await?;
    seed_lessons(&pool).await?;
    seed_explore_videos(&pool).await?;
    seed_quick_makes(&pool).await?;

    println!("seed complete");
    Ok(())
}

async fn seed_creators(pool: &PgPool) -> anyhow::Result<()> {
    let rows: &[(&str, &str, &str, &str)] = &[(
        "Ms. Noor",
        "Art educator and illustrator who believes every child is a natural artist.",
        "art",
        "https://assets.idea-pop.app/creators/ms-noor.png",
    )];

    for (name, bio, studio, avatar) in rows {
        sqlx::query(
            r#"INSERT INTO creators (display_name, bio, studio, avatar_url)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING"#,
        )
        .bind(name)
        .bind(bio)
        .bind(studio)
        .bind(avatar)
        .execute(pool)
        .await?;
    }
    println!("creators seeded");
    Ok(())
}

async fn seed_courses(pool: &PgPool) -> anyhow::Result<()> {
    let creator_id: Option<uuid::Uuid> =
        sqlx::query_scalar("SELECT id FROM creators WHERE display_name = 'Ms. Noor' LIMIT 1")
            .fetch_optional(pool)
            .await?;

    let Some(creator_id) = creator_id else {
        println!("creator not found — skipping courses");
        return Ok(());
    };

    sqlx::query(
        r#"INSERT INTO courses (title, slug, studio, creator_id, summary)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (slug) DO NOTHING"#,
    )
    .bind("Drawing Animals 101")
    .bind("drawing-animals-101")
    .bind("art")
    .bind(creator_id)
    .bind("Learn to draw 6 beloved animals step by step — from the first pencil line to the final colour wash.")
    .execute(pool)
    .await?;

    println!("courses seeded");
    Ok(())
}

async fn seed_lessons(pool: &PgPool) -> anyhow::Result<()> {
    let course_id: Option<uuid::Uuid> =
        sqlx::query_scalar("SELECT id FROM courses WHERE slug = 'drawing-animals-101' LIMIT 1")
            .fetch_optional(pool)
            .await?;

    let Some(course_id) = course_id else {
        println!("course not found — skipping lessons");
        return Ok(());
    };

    let lessons: &[(i16, &str, i32)] = &[
        (1, "Warm-Up: Circles & Ovals", 300),
        (2, "Drawing a Bunny", 480),
        (3, "Drawing a Fox", 540),
        (4, "Drawing an Owl", 510),
        (5, "Drawing a Whale", 600),
        (6, "Drawing an Elephant", 660),
    ];

    for (ordinal, title, duration_s) in lessons {
        let video_url =
            format!("https://assets.idea-pop.app/courses/drawing-animals-101/lesson-{ordinal}.mp4");
        sqlx::query(
            r#"INSERT INTO lessons (course_id, ordinal, title, video_url, duration_s, xp_reward)
               VALUES ($1, $2, $3, $4, $5, 10)
               ON CONFLICT (course_id, ordinal) DO NOTHING"#,
        )
        .bind(course_id)
        .bind(ordinal)
        .bind(title)
        .bind(&video_url)
        .bind(duration_s)
        .execute(pool)
        .await?;
    }
    println!("lessons seeded");
    Ok(())
}

async fn seed_explore_videos(pool: &PgPool) -> anyhow::Result<()> {
    // (slug, title, habitat, taxonomy, design_secret, sticker_id, age_modes, ai_generated, duration_s)
    let videos: &[(&str, &str, &str, &str, &str, &str, &[&str], bool, i32)] = &[
        (
            "how-octopuses-think",
            "How Octopuses Think",
            "ocean",
            "Cephalopoda",
            "Each arm has its own mini-brain — 8 arms, 8 tiny brains, all working together!",
            "octopus",
            &["young", "older"],
            false,
            240,
        ),
        (
            "coral-reef-architects",
            "Coral Reef Architects",
            "ocean",
            "Anthozoa",
            "A coral polyp builds its own tiny limestone castle to live in.",
            "coral",
            &["young", "older"],
            false,
            210,
        ),
        (
            "bioluminescent-deep-sea",
            "Bioluminescent Deep Sea",
            "ocean",
            "Dinoflagellata",
            "Some sea creatures make their own light — no batteries needed!",
            "anglerfish",
            &["older"],
            false,
            300,
        ),
        (
            "ant-colony-engineers",
            "Ant Colony Engineers",
            "jungle",
            "Hymenoptera",
            "Leaf-cutter ants grow their own fungus garden underground.",
            "ant",
            &["young", "older"],
            false,
            270,
        ),
        (
            "rainforest-color-chemistry",
            "Rainforest Color Chemistry",
            "jungle",
            "Botany",
            "Bright flowers trick bees with ultraviolet patterns we can't see!",
            "flower",
            &["young", "older"],
            false,
            255,
        ),
        (
            "mangrove-root-worlds",
            "Mangrove Root Worlds",
            "jungle",
            "Rhizophora",
            "Mangrove roots trap mud to build new land — a tree that makes islands!",
            "mangrove",
            &["young"],
            false,
            195,
        ),
        (
            "desert-sand-sculptures",
            "Desert Sand Sculptures",
            "desert",
            "Geology",
            "Wind is the sculptor — it carves rock into arches over thousands of years.",
            "arch-rock",
            &["young", "older"],
            false,
            225,
        ),
        (
            "camel-water-secrets",
            "Camel Water Secrets",
            "desert",
            "Mammalia",
            "Camels store fat (not water!) in their humps as a travel energy pack.",
            "camel",
            &["older"],
            false,
            285,
        ),
        (
            "thermal-updrafts",
            "Riding Thermal Updrafts",
            "sky",
            "Meteorology",
            "Hot air rises and forms invisible elevators that birds and gliders use for free lift.",
            "hawk",
            &["older"],
            false,
            240,
        ),
        (
            "bird-v-formation",
            "Why Birds Fly in V-Formation",
            "sky",
            "Aves",
            "Each bird rides the upwash from the wingtip ahead — teamwork saves energy!",
            "goose",
            &["young", "older"],
            false,
            220,
        ),
    ];

    for (slug, title, habitat, taxonomy, secret, sticker, age_modes, ai_gen, duration_s) in videos {
        let age_modes_vec: Vec<String> = age_modes.iter().map(|s| s.to_string()).collect();
        let video_url = format!("https://assets.idea-pop.app/explore/{slug}.mp4");
        sqlx::query(
            r#"INSERT INTO explore_videos
               (title, slug, habitat, taxonomy, video_url, duration_s,
                design_secret, sticker_id, xp_reward, ai_generated, age_modes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 5, $9, $10)
               ON CONFLICT (slug) DO NOTHING"#,
        )
        .bind(title)
        .bind(slug)
        .bind(habitat)
        .bind(taxonomy)
        .bind(&video_url)
        .bind(duration_s)
        .bind(secret)
        .bind(sticker)
        .bind(ai_gen)
        .bind(&age_modes_vec)
        .execute(pool)
        .await?;
    }
    println!("explore_videos seeded ({} entries)", videos.len());
    Ok(())
}

async fn seed_quick_makes(pool: &PgPool) -> anyhow::Result<()> {
    // (slug, title, studio, difficulty, time_minutes, mess_level, materials, ai_generated)
    let makes: &[(&str, &str, &str, i16, i16, i16, &[&str], bool)] = &[
        (
            "galaxy-slime",
            "Galaxy Slime",
            "craft",
            1,
            20,
            3,
            &[
                "white PVA glue",
                "food colouring",
                "glitter",
                "borax",
                "warm water",
            ],
            false,
        ),
        (
            "pop-up-box-card",
            "Pop-Up Box Card",
            "art",
            2,
            30,
            1,
            &["cardstock", "scissors", "ruler", "glue stick", "markers"],
            false,
        ),
    ];

    for (slug, title, studio, difficulty, time_min, mess, materials, ai_gen) in makes {
        let materials_vec: Vec<String> = materials.iter().map(|s| s.to_string()).collect();
        let video_url = format!("https://assets.idea-pop.app/quick-makes/{slug}.mp4");
        sqlx::query(
            r#"INSERT INTO quick_makes
               (title, slug, studio, difficulty, time_minutes, materials,
                mess_level, video_url, xp_reward, ai_generated)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 5, $9)
               ON CONFLICT (slug) DO NOTHING"#,
        )
        .bind(title)
        .bind(slug)
        .bind(studio)
        .bind(difficulty)
        .bind(time_min)
        .bind(&materials_vec)
        .bind(mess)
        .bind(&video_url)
        .bind(ai_gen)
        .execute(pool)
        .await?;
    }
    println!("quick_makes seeded ({} entries)", makes.len());
    Ok(())
}
