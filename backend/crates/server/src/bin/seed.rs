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
    seed_challenges(&pool).await?;
    seed_badges(&pool).await?;

    println!("seed complete");
    Ok(())
}

async fn seed_badges(pool: &PgPool) -> anyhow::Result<()> {
    let badges: &[(&str, &str, &str, serde_json::Value)] = &[
        (
            "nature-scout",
            "Nature Scout",
            "Watch 3 Explore videos",
            serde_json::json!({"type": "video_count", "min": 3}),
        ),
        (
            "bridge-builder",
            "Bridge Builder",
            "Complete your first Challenge",
            serde_json::json!({"type": "challenge_count", "min": 1}),
        ),
        (
            "slime-master",
            "Slime Master",
            "Complete 3 Lessons",
            serde_json::json!({"type": "lesson_count", "min": 3}),
        ),
        (
            "cycle-starter",
            "Cycle Starter",
            "Complete a Creative Cycle (Explore + Learn + Solve in one week)",
            serde_json::json!({"type": "cycle_count", "min": 1}),
        ),
    ];

    for (slug, name, description, criteria) in badges {
        sqlx::query(
            "INSERT INTO badges (slug, name, description, criteria)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (slug) DO NOTHING",
        )
        .bind(slug)
        .bind(name)
        .bind(description)
        .bind(sqlx::types::Json(criteria))
        .execute(pool)
        .await?;
    }
    println!("seeded badges");
    Ok(())
}

async fn seed_creators(pool: &PgPool) -> anyhow::Result<()> {
    let rows: &[(&str, &str, &str, &str)] = &[
        (
            "Ms. Noor",
            "Art educator and illustrator who believes every child is a natural artist.",
            "art",
            "https://assets.idea-pop.app/creators/ms-noor.png",
        ),
        (
            "Mr. Modaresi Nia",
            "AI Expert, 7 years teaching kids. Every lesson is reviewed by the Idea Pop team before it goes live.",
            "code",
            "https://assets.idea-pop.app/creators/modaresi-nia.png",
        ),
    ];

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

async fn creator_id_by_name(pool: &PgPool, name: &str) -> anyhow::Result<Option<uuid::Uuid>> {
    Ok(
        sqlx::query_scalar("SELECT id FROM creators WHERE display_name = $1 LIMIT 1")
            .bind(name)
            .fetch_optional(pool)
            .await?,
    )
}

async fn seed_courses(pool: &PgPool) -> anyhow::Result<()> {
    // (title, slug, studio, creator_name, summary, difficulty, age_min, materials)
    let courses: &[(&str, &str, &str, &str, &str, i16, i16, &[&str])] = &[
        (
            "Drawing Animals 101",
            "drawing-animals-101",
            "art",
            "Ms. Noor",
            "Learn to draw 6 beloved animals step by step — from the first pencil line to the final colour wash.",
            1,
            8,
            &["paper", "pencil"],
        ),
        (
            "Let's Learn about AI",
            "lets-learn-about-ai",
            "code",
            "Mr. Modaresi Nia",
            "Discover how computers 'see' shapes and patterns in the world — then build your very own creature.",
            1,
            11,
            &["laptop", "internet"],
        ),
    ];

    for (title, slug, studio, creator_name, summary, difficulty, age_min, materials) in courses {
        let Some(creator_id) = creator_id_by_name(pool, creator_name).await? else {
            println!("creator '{creator_name}' not found — skipping course '{slug}'");
            continue;
        };
        let materials: Vec<String> = materials.iter().map(|m| m.to_string()).collect();
        sqlx::query(
            r#"INSERT INTO courses
                   (title, slug, studio, creator_id, summary, difficulty, age_min, materials)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (slug) DO NOTHING"#,
        )
        .bind(title)
        .bind(slug)
        .bind(studio)
        .bind(creator_id)
        .bind(summary)
        .bind(difficulty)
        .bind(age_min)
        .bind(&materials)
        .execute(pool)
        .await?;
    }

    println!("courses seeded");
    Ok(())
}

async fn seed_lessons(pool: &PgPool) -> anyhow::Result<()> {
    // (course_slug, [(ordinal, title, duration_s, xp_reward)])
    let courses: &[(&str, &[(i16, &str, i32, i16)])] = &[
        (
            "drawing-animals-101",
            &[
                (1, "Warm-Up: Circles & Ovals", 300, 10),
                (2, "Drawing a Bunny", 480, 10),
                (3, "Drawing a Fox", 540, 10),
                (4, "Drawing an Owl", 510, 10),
                (5, "Drawing a Whale", 600, 10),
                (6, "Drawing an Elephant", 660, 10),
            ],
        ),
        (
            "lets-learn-about-ai",
            &[
                (1, "Shapes hiding in animals", 360, 10),
                (2, "Big cat faces", 420, 10),
                (3, "Birds in 5 lines", 480, 10),
                (4, "The octopus — curves everywhere", 480, 10),
                (5, "Texture: scales & fur", 540, 10),
                (6, "Make your OWN creature!", 600, 20),
            ],
        ),
    ];

    for (slug, lessons) in courses {
        let course_id: Option<uuid::Uuid> =
            sqlx::query_scalar("SELECT id FROM courses WHERE slug = $1 LIMIT 1")
                .bind(slug)
                .fetch_optional(pool)
                .await?;

        let Some(course_id) = course_id else {
            println!("course '{slug}' not found — skipping lessons");
            continue;
        };

        for (ordinal, title, duration_s, xp_reward) in *lessons {
            let video_url =
                format!("https://assets.idea-pop.app/courses/{slug}/lesson-{ordinal}.mp4");
            sqlx::query(
                r#"INSERT INTO lessons (course_id, ordinal, title, video_url, duration_s, xp_reward)
                   VALUES ($1, $2, $3, $4, $5, $6)
                   ON CONFLICT (course_id, ordinal) DO NOTHING"#,
            )
            .bind(course_id)
            .bind(ordinal)
            .bind(title)
            .bind(&video_url)
            .bind(duration_s)
            .bind(xp_reward)
            .execute(pool)
            .await?;
        }
    }
    println!("lessons seeded");
    Ok(())
}

async fn seed_explore_videos(pool: &PgPool) -> anyhow::Result<()> {
    // (slug, title, superpower_category, taxonomy, design_secret, sticker_id, age_modes, ai_generated, duration_s)
    let videos: &[(&str, &str, &str, &str, &str, &str, &[&str], bool, i32)] = &[
        (
            "how-octopuses-think",
            "How Octopuses Think",
            "masters_of_disguise",
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
            "master_builders",
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
            "masters_of_disguise",
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
            "master_builders",
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
            "masters_of_disguise",
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
            "soft_engineers",
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
            "master_builders",
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
            "soft_engineers",
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
            "speed_champions",
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
            "speed_champions",
            "Aves",
            "Each bird rides the upwash from the wingtip ahead — teamwork saves energy!",
            "goose",
            &["young", "older"],
            false,
            220,
        ),
    ];

    for (slug, title, category, taxonomy, secret, sticker, age_modes, ai_gen, duration_s) in videos
    {
        let age_modes_vec: Vec<String> = age_modes.iter().map(|s| s.to_string()).collect();
        let video_url = format!("https://assets.idea-pop.app/explore/{slug}.mp4");
        sqlx::query(
            r#"INSERT INTO explore_videos
               (title, slug, superpower_category, taxonomy, video_url, duration_s,
                design_secret, sticker_id, xp_reward, ai_generated, age_modes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 5, $9, $10)
               ON CONFLICT (slug) DO NOTHING"#,
        )
        .bind(title)
        .bind(slug)
        .bind(category)
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

async fn seed_challenges(pool: &PgPool) -> anyhow::Result<()> {
    // Each challenge is a full 8-step mission stored as JSONB.
    // ON CONFLICT (slug) DO NOTHING makes re-runs idempotent.

    // (slug, title, season, week, steps, tools, variants, is_premium)
    let challenges: &[(&str, &str, i16, i16, &str, &str, &str, bool)] = &[
        (
            "help-max-cross-the-river",
            "Help Max Cross the River",
            1,
            1,
            // steps JSON
            r#"[
  {"step":"brief","title":"Max Can't Get to School!","story":"Max the rabbit wakes up and discovers the old wooden bridge over the river has collapsed. All his friends are waiting on the other side — and today is the science fair! Can YOU help Max find a way to cross safely?","image_url":null},
  {"step":"your_idea","prompt":"Do you already have an idea for how Max could cross the river?","fork_to_step":6},
  {"step":"nature_clues","intro":"Nature has solved river-crossing problems for millions of years. Let's look for clues!","clues":[{"text":"Water striders have wide, waxy feet that spread their weight across the surface — they never sink!","image_url":null,"habitat":"jungle"},{"text":"Beavers build log dams to block rivers and create calm ponds behind them.","image_url":null,"habitat":"jungle"},{"text":"Mangrove tree roots tangle together and trap mud, building new land in the water.","image_url":null,"habitat":"jungle"},{"text":"Coconuts float for months! Their thick husk traps air and keeps the seed dry.","image_url":null,"habitat":"ocean"}]},
  {"step":"design_secret","secret":"Surface tension lets water stick to itself. A wide, flat object spreads weight across many water molecules — that's why a paperclip can float on still water even though metal is heavy!","reveal_hint":"Think about how you could spread Max's weight as broadly as possible…"},
  {"step":"skill","instructions":"Watch how you can make a small ball of modelling clay sink, then flatten the same clay into a boat shape and make it float. Weight hasn't changed — shape has! Experiment with different widths and depths to see what holds the most cargo before sinking.","skill_refs":[]},
  {"step":"sketch","prompt":"Draw Max's crossing solution — a bridge, a raft, stepping stones, or your own invention!","guidance":"Show the materials you would use and how they connect. Add labels for the most important parts."},
  {"step":"build_and_test","instructions":"Build a small model of your crossing using cardboard, sticks, foil, or anything at home. Then test it by placing a small coin or pebble on it over a bowl of water.","test_criteria":["Does it hold at least one 'passenger' (coin) without sinking?","Does it stay stable when you gently push the water to create tiny waves?","Could Max step onto it from the bank — is there a clear entry point?"]},
  {"step":"celebrate_and_share","celebration_text":"Max made it to the science fair — and won first prize for Most Creative Solution! Your bridge/raft/crossing idea is now part of Max's adventure forever.","share_prompt":"Take a photo of your model and share it on the Ideas Wall — which animal's trick inspired your design?"}
]"#,
            // tools JSON
            r#"[
  {"kind":"five_whys","age_mode":"young"},
  {"kind":"scamper","age_mode":"older"}
]"#,
            // age_tier_variants JSON
            r#"[
  {"age_tier":"8-10","title_override":null,"summary":"Focus on floating and surface area — build a wide raft from natural materials."},
  {"age_tier":"10-12","title_override":null,"summary":"Compare bridge vs. raft solutions; measure load capacity and stability."},
  {"age_tier":"12-18","title_override":"Engineering Max's Crossing","summary":"Apply truss and arch bridge principles; calculate load-per-unit-area and compare to surface tension data."}
]"#,
            false, // free — the intro mission
        ),
        (
            "the-forest-picnic-problem",
            "The Forest Picnic Problem",
            1,
            2,
            // steps JSON
            r#"[
  {"step":"brief","title":"Rain on the Way — Picnic in Danger!","story":"The Rossi family has been planning their forest picnic for weeks. They've packed sandwiches, juice boxes, and a birthday cake. But this morning the sky turned grey and the forecast says: 40% chance of showers. They won't cancel — they just need a shelter smart enough to keep everything dry. That's where YOU come in!","image_url":null},
  {"step":"your_idea","prompt":"Got an idea for a portable, forest-friendly rain shelter?","fork_to_step":6},
  {"step":"nature_clues","intro":"Animals have been keeping dry for millions of years without umbrellas. Let's steal their best ideas!","clues":[{"text":"The lotus leaf is superhydrophobic — water droplets bead up and roll right off without wetting the surface at all.","image_url":null,"habitat":"jungle"},{"text":"A woodpecker's nest hole faces downward so rain can't drip inside.","image_url":null,"habitat":"jungle"},{"text":"Desert beetles tilt their backs into the wind to collect water droplets from fog onto bumpy surfaces — then roll the water to their mouths.","image_url":null,"habitat":"desert"},{"text":"Bird feathers have tiny hooks (barbules) that zip the feather into a nearly waterproof mat.","image_url":null,"habitat":"sky"}]},
  {"step":"design_secret","secret":"The lotus effect works because the surface is covered in microscopic waxy bumps. Water droplets sit on top of these bumps (touching only the tips) and slide off carrying dirt with them. This is called superhydrophobicity!","reveal_hint":"What if you could make your shelter surface behave like a lotus leaf — or at least encourage water to run away from the picnic?"},
  {"step":"skill","instructions":"Test three surfaces for waterproofing: plain paper, wax-coated paper (rub a candle on it), and plastic wrap. Drip water on each and observe. Which repels best? Which absorbs? Record your results in a simple table: Surface | Beads? | Absorbs? | Verdict.","skill_refs":[]},
  {"step":"sketch","prompt":"Design the Rossi family's perfect forest shelter — it should be quick to set up, use natural or recycled materials, and shed rain away from the picnic area.","guidance":"Mark which surfaces are your 'lotus layer'. Show how rain flows off and away. Include a side view and a top view."},
  {"step":"build_and_test","instructions":"Build a model shelter (a small tent or lean-to shape) using materials from around your home. Then pour a tablespoon of water on the roof and watch what happens.","test_criteria":["Does water run off rather than pool?","Is the picnic area underneath dry after the pour?","Would this shelter survive a gust of wind — is it stable?"]},
  {"step":"celebrate_and_share","celebration_text":"The birthday cake stayed perfectly dry and the picnic was the best the Rossi family ever had! Your shelter design protected the day.","share_prompt":"Share your waterproof shelter design on the Ideas Wall — which nature trick did you borrow, and what material was your secret weapon?"}
]"#,
            // tools JSON
            r#"[
  {"kind":"mind_map","age_mode":"young"},
  {"kind":"scamper","age_mode":"older"}
]"#,
            // age_tier_variants JSON
            r#"[
  {"age_tier":"8-10","title_override":null,"summary":"Build a simple lean-to shelter from sticks and leaves; focus on slope direction and drainage."},
  {"age_tier":"10-12","title_override":null,"summary":"Compare materials for waterproofing; measure how much water drains vs. pools in different designs."},
  {"age_tier":"12-18","title_override":"Biomimicry: Designing a Superhydrophobic Shelter","summary":"Research the lotus effect and contact angle; design a shelter surface that maximises water roll-off using the principle of superhydrophobicity."}
]"#,
            true, // premium — unlocks with a family subscription
        ),
    ];

    for (slug, title, season, week, steps_json, tools_json, variants_json, is_premium) in challenges
    {
        let steps_val: serde_json::Value = serde_json::from_str(steps_json)?;
        let tools_val: serde_json::Value = serde_json::from_str(tools_json)?;
        let variants_val: serde_json::Value = serde_json::from_str(variants_json)?;

        sqlx::query(
            r#"INSERT INTO challenges
               (title, slug, season, week_number, xp_reward, steps, tools, age_tier_variants, is_premium)
               VALUES ($1, $2, $3, $4, 20, $5, $6, $7, $8)
               ON CONFLICT (slug) DO NOTHING"#,
        )
        .bind(title)
        .bind(slug)
        .bind(season)
        .bind(week)
        .bind(sqlx::types::Json(&steps_val))
        .bind(sqlx::types::Json(&tools_val))
        .bind(sqlx::types::Json(&variants_val))
        .bind(is_premium)
        .execute(pool)
        .await?;
    }
    println!("challenges seeded ({} entries)", challenges.len());
    Ok(())
}
