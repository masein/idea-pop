import { getTranslations } from "next-intl/server";
import Image, { getImageProps } from "next/image";
import { Link } from "@/i18n/routing";
import PricingPlans from "./_components/PricingPlans";
import AskIdeaPop from "./_components/AskIdeaPop";

// The designer's own composited workshop scene, v3 (3840×1611, 2.384:1 —
// the designer's crop with the ceiling trimmed off the top). Characters and
// props are baked in.
import heroScene from "../../../../public/landing/hero-scene-v4.webp";
// Phones: the same scene without the characters, cropped to the middle 60% a phone actually shows.
import heroSceneMobile from "../../../../public/landing/hero-scene-mobile.webp";
// Phones only: characters layered on that scene (hero-kid-3, the bear and the parrot, oriented per the mobile design).
import heroMobileGirl from "../../../../public/landing/hero-mobile-girl.png";
import heroMobileBear from "../../../../public/landing/hero-mobile-bear.png";
import heroMobileParrot from "../../../../public/landing/hero-mobile-parrot.png";
// The designer's Figma export (5760×3060) at 2880 wide. Its left ~42% is 49% opaque in the export; flattened on white,
// which matches the Figma frame (over the page's #F3FFC2 that side turned green).
import paintingGirl from "../../../../public/landing/paint-together.webp";
import thinkingToolsAvatar from "../../../../public/landing/thinking-tools-avatar.png";
import realMakesAvatar from "../../../../public/landing/real-makes-avatar.png";
import portfolioAvatar from "../../../../public/landing/portfolio-avatar.png";
import seeTheWorld from "../../../../public/landing/see-the-world.png";
import learnCircle from "../../../../public/landing/learn.png";
import solveAndMake from "../../../../public/landing/solve-and-make.png";
// The designer's river PNG, cropped past the generator sparkle in the corner and kept at the 1400:503 shape:
// 1320x474 WebP, 168 KB.
import tryMissionBg from "../../../../public/landing/try-mission-river.webp";
import startFreeGirl from "../../../../public/landing/start-free-girl.png";

const LIME = "#D1EF5A";
const DEEP = "#2E5F4B";
// 1×1 transparent GIF: a <picture> source that makes desktop skip the phone-only hero images entirely.
const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// Headings never end on a lone word on narrow screens: the last two words are joined with a no-break space,
// and the brand name never splits either.
const keepTogether = (text: string) => text.replace(/Idea Pop/g, "Idea\u00A0Pop").replace(/\s+(\S+)\s*$/, "\u00A0$1");

/* Spec: buttons are Montserrat ExtraBold #18785A, the lime button included —
   the designer's call, though it's ~4.2:1 on #D1EF5A (below AA at the 15px mobile size).
   The lime button's 1px stroke is an inset shadow (Figma "inside"), so it doesn't change the size. */
const btnLime =
  "inline-flex items-center justify-center rounded-pill [font-family:var(--font-montserrat)] font-extrabold px-8 md:px-[53px] py-3 text-[clamp(0.9375rem,0.79rem+0.68vw,1.125rem)] text-[#18785A] transition-all duration-150 hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2 select-none shadow-[inset_0_0_0_1px_#18785A,0_4px_4px_rgba(0,0,0,0.25)]";
// Glass button: the fill is 46% white so what's behind shows through (the hero scene, the lime "try a mission" band);
// the 2px stroke is an inset shadow like the lime button's.
const btnGlass =
  "inline-flex items-center justify-center rounded-pill [font-family:var(--font-montserrat)] font-extrabold px-8 md:px-[53px] py-3 text-[clamp(0.9375rem,0.79rem+0.68vw,1.125rem)] bg-white/[.46] text-[#146047] transition-all duration-150 hover:bg-[#F4FADD] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18785A] focus-visible:ring-offset-2 select-none shadow-[inset_0_0_0_2px_#18785A,0_4px_4px_rgba(0,0,0,0.25)]";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.hero" });
  return {
    title: "Idea Pop — Ask nature. Build with your hands.",
    description: t("subhead"),
    openGraph: {
      title: "Idea Pop",
      description: t("subhead"),
      type: "website",
    },
  };
}


export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing" });

  // Phones and desktop get different hero pictures, so the hero is a <picture> built from getImageProps.
  const heroImage = { alt: "", fill: true, quality: 90, loading: "eager", fetchPriority: "high" } as const;
  const {
    props: { srcSet: heroMobileSrcSet, sizes: heroMobileSizes },
  } = getImageProps({ ...heroImage, src: heroSceneMobile, sizes: "max(100vw, 773px)" });
  const { props: heroDesktopProps } = getImageProps({ ...heroImage, src: heroScene, sizes: "max(100vw, 202.6vh, 1836px, calc(835px + 49.1vw))" });
  const { props: heroParrotProps } = getImageProps({ src: heroMobileParrot, alt: "", sizes: "108px", quality: 90, loading: "eager" });
  const { props: heroGirlProps } = getImageProps({ src: heroMobileGirl, alt: "", sizes: "99px", quality: 90, loading: "eager" });
  const { props: heroBearProps } = getImageProps({ src: heroMobileBear, alt: "", sizes: "98px", quality: 90, loading: "eager" });

  const faqItems = t.raw("faq.items") as Array<{ q: string; a: string }>;

  const yearCards = [
    {
      img: thinkingToolsAvatar,
      title: t("year.card1_title"),
      sub: t("year.card1_sub"),
    },
    {
      img: realMakesAvatar,
      title: t("year.card2_title"),
      sub: t("year.card2_sub"),
    },
    {
      img: portfolioAvatar,
      title: t("year.card3_title"),
      sub: t("year.card3_sub"),
    },
  ];

  const cycleCards = [
    {
      img: seeTheWorld,
      label: t("cycle.see_label"),
      desc: t("cycle.see_desc"),
      color: "text-[#2E7D32]",
    },
    {
      img: learnCircle,
      label: t("cycle.learn_label"),
      desc: t("cycle.learn_desc"),
      color: "text-[#B3271E]",
    },
    {
      img: solveAndMake,
      label: t("cycle.solve_label"),
      desc: t("cycle.solve_desc"),
      color: "text-[#1565C0]",
    },
  ];

  /* The designer's tile colours (from the Figma design-thinking graphic). Plain blocks for now — the designer will add
     their own images. White labels on the yellow, coral and green tiles are below AA contrast. */
  const spineTiles = [
    { label: t("curriculum.spine_1"), bg: "bg-[#497AF0]" },
    { label: t("curriculum.spine_2"), bg: "bg-[#FF6C67]" },
    { label: t("curriculum.spine_3"), bg: "bg-[#FDD543]" },
    { label: t("curriculum.spine_4"), bg: "bg-[#934CC1]" },
    { label: t("curriculum.spine_5"), bg: "bg-[#008C9D]" },
    { label: t("curriculum.spine_6"), bg: "bg-[#55D889]" },
  ];

  // The 3-year path: three year cards, then the ranks in order. The icons are decorative (hidden from screen readers).
  const pathYears = [
    { label: t("curriculum.path_year_1"), title: t("curriculum.path_year_1_title"), icon: "🧰" },
    { label: t("curriculum.path_year_2"), title: t("curriculum.path_year_2_title"), icon: "🎓" },
    { label: t("curriculum.path_year_3"), title: t("curriculum.path_year_3_title"), icon: "🌍" },
  ];
  const pathRanks = [
    { label: t("curriculum.path_rank_1"), icon: "🤠" },
    { label: t("curriculum.path_rank_2"), icon: "🛠️" },
    { label: t("curriculum.path_rank_3"), icon: "💡" },
    { label: t("curriculum.path_rank_4"), icon: "🚀" },
    { label: t("curriculum.path_rank_5"), icon: "🥇" },
    { label: t("curriculum.path_rank_6"), icon: "🧑‍🏫" },
  ];
  // Arrow between path steps; it points the other way on the Persian (right-to-left) page.
  const pathArrow = (className: string) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 rtl:-scale-x-100 ${className}`}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );

  const experts = [
    { name: t("experts.e1_name"), role: t("experts.e1_role"), bg: "bg-[#F7E3DC]" },
    { name: t("experts.e2_name"), role: t("experts.e2_role"), bg: "bg-[#E2E7FA]" },
    { name: t("experts.e3_name"), role: t("experts.e3_role"), bg: "bg-[#DFE9E0]" },
    { name: t("experts.e4_name"), role: t("experts.e4_role"), bg: "bg-[#E9DEF5]" },
  ];

  return (
    <div className="bg-[#F3FFC2]">
      {/* 1. Hero — composited workshop scene */}
      <section aria-label="hero" className="relative" dir="ltr">
        {/* Desktop: 85% of viewport height per design, but never shorter than max(770px, 350px + 20.6vw).
            The copy sits at a fixed px position while the bottom-anchored scene scales with the box, so on short
            windows the kids' and animals' faces rose behind the description; from this height every face stays
            below the text (short windows scroll to the kids' feet instead). Mobile keeps a px floor tall enough
            for the stacked copy over the scene. */}
        <div className="relative w-full overflow-hidden min-h-[540px] md:h-[85vh] md:min-h-[max(770px,calc(350px_+_20.6vw))]">
          {/* object-bottom anchors the cover crop so any trim comes off the top, never the kids' feet.
              sizes is the drawn width (box height × 2.384 on desktop, 540px × 1.43 on phones), so the browser
              never fetches a copy it then stretches. quality 90: the default 75 visibly softened faces and hair. */}
          <picture>
            <source media="(max-width: 767px)" srcSet={heroMobileSrcSet} sizes={heroMobileSizes} />
            {/* eslint-disable-next-line @next/next/no-img-element -- a <picture> needs a raw img; its props come from getImageProps */}
            <img {...heroDesktopProps} alt="" className="object-cover object-bottom" />
          </picture>

          {/* Phones only. The scene is drawn 772×540 around the box centre at every phone width, so the parrot's
              offset from 50% keeps it over the same spot. Chrome fetches lazy images even inside display:none,
              so each <picture> swaps in BLANK_GIF from md up to keep desktop from downloading them. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 md:hidden">
            <picture>
              <source media="(min-width: 768px)" srcSet={BLANK_GIF} />
              {/* eslint-disable-next-line @next/next/no-img-element -- a <picture> needs a raw img; its props come from getImageProps */}
              <img {...heroParrotProps} alt="" className="absolute left-[calc(50%_+_30px)] top-4 h-auto w-[108px] -translate-x-1/2" />
            </picture>
            <picture>
              <source media="(min-width: 768px)" srcSet={BLANK_GIF} />
              {/* eslint-disable-next-line @next/next/no-img-element -- a <picture> needs a raw img; its props come from getImageProps */}
              <img {...heroGirlProps} alt="" className="absolute bottom-[33px] left-6 h-[169px] w-auto" />
            </picture>
            <picture>
              <source media="(min-width: 768px)" srcSet={BLANK_GIF} />
              {/* eslint-disable-next-line @next/next/no-img-element -- a <picture> needs a raw img; its props come from getImageProps */}
              <img {...heroBearProps} alt="" className="absolute bottom-[6px] right-[calc(24px_+_25%)] h-[88px] w-auto" />
            </picture>
          </div>

          {/* hero copy — fluid type per the designer's responsive spec
              (clamp() from a 375px mobile floor to the 1440px design size).
              The % keeps the copy composed with the artwork on tall canvases;
              the px floor keeps it clear of the nav on short ones, where the
              scene is only ~514px tall but the nav still needs ~152px.
              Desktop uses a fixed 6rem instead: ~20px under the nav capsule, which is fixed at top-3. */}
          <div
            className="absolute inset-x-0 top-[max(17.5%,7rem)] md:top-[6rem] z-10 px-[clamp(1rem,-1rem+8vw,6rem)] text-center"
            dir={locale === "fa" ? "rtl" : "ltr"}
          >
            {/* Cherry Bomb One ships a single 400 weight — the spec's Regular. */}
            <h1 className="[font-family:var(--font-cherry)] font-normal leading-tight text-[clamp(2rem,1.16rem+4.2vw,4rem)]">
              <span className="text-[#194D3D]">
                {t("hero.headline_1_pre")}
                <span className="text-[#18785A]">
                  {t("hero.headline_1_word")}
                  {t("hero.headline_1_post")}
                </span>
              </span>{" "}
              <span className="text-[#194D3D]">{t("hero.headline_2")}</span>
            </h1>
            <p className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.375rem,0.87rem+2.5vw,2.5rem)] mt-[clamp(0.125rem,0.1rem+0.25vw,0.375rem)]">
              <span className="text-[#194D3D]">{t("hero.sub_1")}</span>{" "}
              <span className="text-[#F2994A]">{t("hero.sub_2")}</span>
            </p>
            <p className="[font-family:var(--font-adlam)] font-normal text-[#4F4F4F] text-[clamp(0.9375rem,0.79rem+0.68vw,1.25rem)] leading-[normal] [text-shadow:0_4px_4px_rgba(0,0,0,0.25)] max-w-[680px] mx-auto mt-3">
              {t("hero.body_1_pre")}
              <span className="text-[#18785A]">{t("hero.body_1_word")}</span>
              {t("hero.body_1_post")}
              {/* Designer's line break after the dash on desktop; phones wrap naturally. */}
              <br className="hidden md:block" />{" "}
              {t("hero.body_2")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-[clamp(0.5rem,0.3rem+0.6vw,0.75rem)]">
              <Link
                href="/exploring"
                className={btnLime}
                style={{ backgroundColor: LIME }}
              >
                {t("hero.cta_explore")}
              </Link>
              <Link href="/challenges" prefetch={false} className={btnGlass}>
                {t("hero.cta_challenge")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. What a year looks like */}
      <section aria-label="what a year looks like" className="pt-8 md:pt-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.875rem,1.435rem+1.878vw,3.125rem)] leading-[normal] md:leading-none text-[#4F4F4F] text-center mb-[76px]">
            {keepTogether(t("year.heading"))}
          </h2>
          {/* Figma cards: 281×325, radius 20, #EEFFA9 fill, 1px inside #D1EF5A stroke (an inset shadow, so it adds no size)
              plus the default drop shadow. One row from ~923px wide, the gap growing to the design's 130px at 1440;
              narrower screens wrap and phones stack. Each bust is 232px tall and rises 60px above its card, so
              wrapped rows get a 92px gap. Gray 1 / Gray 3 are Figma's default #333333 / #828282. */}
          <div className="flex flex-wrap justify-center gap-x-[clamp(1.5rem,calc(20.5vw_-_165px),8.125rem)] gap-y-[92px]">
            {yearCards.map((card) => (
              <div key={card.title} className="relative w-[281px] h-[325px] shrink-0">
                <div className="h-full rounded-[20px] bg-[#EEFFA9] px-1.5 pt-[183px] text-center shadow-[inset_0_0_0_1px_#D1EF5A,0_4px_4px_rgba(0,0,0,0.25)]">
                  <p className="[font-family:var(--font-adlam)] font-normal text-[24px] leading-[normal] text-[#333333]">
                    {card.title}
                  </p>
                  <p className="[font-family:var(--font-adlam)] font-normal text-[15px] leading-[normal] text-[#828282] mt-2">
                    {card.sub}
                  </p>
                </div>
                <Image
                  unoptimized
                  src={card.img}
                  alt=""
                  aria-hidden="true"
                  className="absolute -top-[60px] left-1/2 -translate-x-1/2 h-[232px] w-auto"
                />
              </div>
            ))}
          </div>
          {/* Figma: the pill straddles the top edge of the green "how it works" panel — 79px under the cards, with half
              its 35px height (the section below starts 17px up) laid over the panel. The 1px #D1EF5A edge is an inset shadow. */}
          <div className="relative z-10 flex justify-center mt-[79px] -mb-[17px]">
            <p className="rounded-pill bg-[#EEFFA9] shadow-[inset_0_0_0_1px_#D1EF5A] px-5 py-[7px] text-center [font-family:var(--font-adlam)] font-normal text-[16px] leading-[normal] text-[#2E574D]">
              <span>{t("year.steps_label")}</span>{" "}
              {/* Each step's words stay together ("5 re ask"), so lines only break between steps. */}
              {t("year.steps").split(" · ").map((step) => step.replace(/ /g, "\u00A0")).join(" · ")}
            </p>
          </div>
        </div>
      </section>

      {/* 3. How it works — creative cycle */}
      <section aria-label="how it works">
        {/* Figma: full-width panel with 130px top corners and a square bottom that runs straight into the paint banner. */}
        <div
          className="rounded-t-[clamp(3rem,9vw,130px)] px-4 pt-[49px] pb-[66px]"
          style={{ backgroundColor: DEEP }}
        >
          <h2 className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.875rem,1.435rem+1.878vw,3rem)] leading-[normal] text-[#F3FFC2] text-center">
            {keepTogether(t("cycle.heading"))}
          </h2>
          {/* Cards 260×204, radius 30, #CFEC5A with the default drop shadow; 200px circles rise 137px above each card
              (63px overlap). One row from ~860px wide with the gap growing to the design's 114px at 1440; below that
              the cards wrap/stack, with room for the circle above every row. Descriptions wrap at 180px, as in Figma.
              Phones get 32px between the heading and the first circle (desktop keeps the Figma's none). */}
          <div className="flex flex-wrap justify-center gap-x-[clamp(1.5rem,calc(15.5vw_-_109px),114px)] gap-y-[161px] pt-[169px] md:pt-[137px]">
            {cycleCards.map((card) => (
              <div key={card.label} className="relative w-[260px] h-[204px] shrink-0">
                <div className="h-full rounded-[30px] bg-[#CFEC5A] px-3 pt-[87px] text-center shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
                  <p className={`[font-family:var(--font-adlam)] font-normal text-[20px] leading-[normal] ${card.color}`}>
                    {card.label}
                  </p>
                  <p className="[font-family:var(--font-adlam)] font-normal text-[17px] leading-[normal] text-[#4F4F4F] mt-1 mx-auto max-w-[180px]">
                    {card.desc}
                  </p>
                </div>
                <Image
                  unoptimized
                  src={card.img}
                  alt=""
                  aria-hidden="true"
                  className="absolute -top-[137px] left-1/2 -translate-x-1/2 w-[200px] h-[200px] rounded-full object-cover ring-[3px] ring-white/50"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Paint together banner — full-bleed image with overlaid copy */}
      <section
        aria-label="paint together"
        className="relative flex flex-col overflow-hidden md:block"
      >
        {/* Phones: below the copy (order-2), 260px tall and cropped at 90% across so the girl sits right of centre,
            larger, face clear and helmet in view — no scrim. md+: fills the section behind the copy, as in Figma. */}
        <Image
          unoptimized
          src={paintingGirl}
          alt=""
          aria-hidden="true"
          className="order-2 h-[260px] w-full object-cover object-[90%_50%] md:absolute md:inset-0 md:h-full md:object-right"
        />
        {/* md+: the box takes the photo's own proportions, so the whole picture shows uncropped (1440×765 at 1440 wide).
            Heading box per Figma: 738px wide, 68px from the left and 73px from the top of the 1440 frame — kept as
            percentages with a vw font size, so the layout scales with the picture. The button sits 15px below it.
            Phones: the heading and button come first (order-1) on the page background, above the photo. */}
        <div className="relative order-1 mx-auto flex w-full max-w-6xl items-center px-4 pt-10 pb-8 md:block md:max-w-none md:p-0 md:aspect-[5760/3060]">
          <div className="mx-auto max-w-sm text-center md:absolute md:left-[4.722%] md:top-[9.54%] md:mx-0 md:w-[51.25%] md:max-w-none">
            <h2 className="[font-family:var(--font-cherry)] font-normal text-3xl md:text-[3.333vw] leading-[normal] text-[#4F4F4F]">
              {keepTogether(t("paint.heading"))}
            </h2>
            <div className="mt-6 md:mt-[15px]">
              <Link href="/explore" prefetch={false} className={btnGlass}>
                {t("paint.cta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Curriculum — design-thinking spine */}
      {/* Figma (1440 frame): heading Cherry Bomb One 48 #18785A 57px under the painting banner; subheading ADLaM Display 32
          and paragraph ADLaM Display 20 in #4F4F4F (the paragraph fits one 1157px line, hence the wider container). */}
      <section aria-label="curriculum" className="pt-10 pb-12 md:pt-[57px] md:pb-16">
        <div className="max-w-[1240px] mx-auto px-4 text-center">
          <h2 className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.875rem,1.435rem+1.878vw,3rem)] leading-[1.15] md:leading-[48px] text-[#18785A] mb-3 md:mb-4">
            {keepTogether(t("curriculum.heading"))}
          </h2>
          <p className="[font-family:var(--font-adlam)] font-normal text-[clamp(1.25rem,0.9rem+1.5vw,2rem)] leading-[normal] text-[#4F4F4F]">
            {t("curriculum.sub")}
          </p>
          <p className="[font-family:var(--font-adlam)] font-normal text-[clamp(0.9375rem,0.8rem+0.55vw,1.25rem)] leading-[normal] text-[#4F4F4F] mt-1 md:mt-0">
            {t("curriculum.note")}
          </p>

          {/* Plain colour tiles at the Figma graphic's size (162×279 with 13px gaps — a 1037px row at 1440), top left
              free for the designer's own images, label at the bottom. 108px under the paragraph on desktop; 3 columns on phones. */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-[13px] max-w-[1037px] mx-auto mt-7 md:mt-[108px]">
            {spineTiles.map((tile) => (
              <div key={tile.label} className={`${tile.bg} aspect-[162/279] flex items-end justify-center px-1.5 pb-[13%]`}>
                <span className="[font-family:var(--font-montserrat)] font-bold text-white text-[clamp(0.8125rem,0.55rem+1vw,1.25rem)] leading-[1.2]">
                  {tile.label}
                </span>
              </div>
            ))}
          </div>
          {/* Plain-text credit only — no IDEO artwork or logo. */}
          <p className="[font-family:var(--font-adlam)] font-normal text-[13px] text-[#4F4F4F] text-start max-w-[1037px] mx-auto mt-3 md:mt-4">
            {t("curriculum.spine_credit")}
          </p>

          {/* "The 3-year path" ADLaM Display 32, kept at the Figma position (130px under the tiles). */}
          <h3 className="[font-family:var(--font-adlam)] font-normal text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] leading-[normal] text-[#4F4F4F] mt-10 mb-4 md:mt-24 md:mb-6">
            {t("curriculum.path_heading")}
          </h3>
          {/* Year cards in the year-card colours with arrows centred in the gaps: icon above the text below 1024px,
              beside it from 1024px. */}
          <ol className="flex justify-center gap-x-6 md:gap-x-12 lg:gap-x-16 max-w-[880px] mx-auto">
            {pathYears.map((year, i) => (
              <li key={year.label} className="relative flex flex-1 min-w-0 max-w-[250px]">
                <div className="flex flex-1 flex-col lg:flex-row items-center gap-1.5 lg:gap-3.5 rounded-2xl md:rounded-[20px] bg-[#EEFFA9] px-1.5 py-3 md:px-2.5 md:py-3.5 lg:px-[18px] text-center lg:text-start shadow-[inset_0_0_0_1px_#D1EF5A,0_4px_4px_rgba(0,0,0,0.08)]">
                  <span aria-hidden="true" className="shrink-0 text-[28px] md:text-[32px] lg:text-[34px] leading-none">
                    {year.icon}
                  </span>
                  <span className="flex min-w-0 flex-col items-center lg:items-start [font-family:var(--font-adlam)] font-normal leading-[normal]">
                    <span className="text-[13px] md:text-[15px] text-[#18785A]">{year.label}</span>
                    <span className="text-[15px] md:text-[18px] lg:text-[20px] text-[#4F4F4F]">{year.title}</span>
                  </span>
                </div>
                {i < pathYears.length - 1 && (
                  <span className="absolute top-1/2 start-full flex w-6 md:w-12 lg:w-16 -translate-y-1/2 justify-center text-[#18785A]">
                    {pathArrow("size-[18px] md:size-6 lg:size-[30px]")}
                  </span>
                )}
              </li>
            ))}
          </ol>
          {/* Rank pills. Each arrow stays with the pill before it, so when the row wraps on phones no line starts with an arrow. */}
          <ol className="flex flex-wrap justify-center gap-y-2.5 lg:gap-y-3 max-w-[980px] mx-auto mt-5 md:mt-7 lg:mt-8">
            {pathRanks.map((rank, i) => (
              <li key={rank.label} className="flex items-center">
                <span className="inline-flex items-center gap-1 lg:gap-1.5 rounded-pill bg-white px-2.5 py-[5px] lg:px-3.5 lg:py-1.5 shadow-[inset_0_0_0_1px_#D1EF5A]">
                  <span aria-hidden="true" className="text-[16px] lg:text-[20px] leading-none">
                    {rank.icon}
                  </span>
                  <span className="[font-family:var(--font-adlam)] font-normal text-[14px] lg:text-[16px] leading-[normal] text-[#4F4F4F]">{rank.label}</span>
                </span>
                {i < pathRanks.length - 1 && pathArrow("mx-[5px] lg:mx-2 size-3.5 lg:size-[18px] text-[#18785A]")}
              </li>
            ))}
          </ol>
          <div className="mt-8 md:mt-10">
            <Link href="/method" className={btnGlass}>
              {t("curriculum.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Try one mission */}
      <section aria-label="try a mission">
        {/* Figma: a lime band 194px tall at 1440 — heading box 26px from the top, the line right under it, the button 11px
            lower and 6px above the picture. */}
        <div className="bg-[#CFEC5A] px-4 pt-6 pb-4 md:pt-[26px] md:pb-[6px] text-center">
          <h2 className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.875rem,1.435rem+1.878vw,3rem)] leading-[normal] text-[#4F4F4F]">
            {keepTogether(t("try_now.heading"))}
          </h2>
          <p className="[font-family:var(--font-adlam)] font-normal text-[clamp(1rem,0.85rem+0.6vw,1.25rem)] leading-[1.48] text-[#4F4F4F]">
            {keepTogether(t("try_now.body"))}
          </p>
          <p className="[font-family:var(--font-adlam)] font-normal text-[clamp(1rem,0.85rem+0.6vw,1.25rem)] leading-[1.48] text-[#4F4F4F] mb-[11px]">
            {keepTogether(t("try_now.body2"))}
          </p>
          <Link href="/challenges" prefetch={false} className={btnGlass}>
            {t("try_now.cta")}
          </Link>
        </div>
        {/* The picture opens the mission too: the same link, kept away from screen readers and the keyboard so they
            only meet the labelled button above. */}
        <Link href="/challenges" prefetch={false} aria-hidden="true" tabIndex={-1} className="block">
          <Image
            unoptimized
            src={tryMissionBg}
            alt=""
            aria-hidden="true"
            className="w-full h-auto"
            sizes="100vw"
          />
        </Link>
      </section>

      {/* 7. Made by kids this month */}
      <section aria-label="made by kids" className="pt-8 pb-7 md:pt-[35px] md:pb-[49px]">
        {/* Figma: six 200×178 tiles with 20px gaps (a 1300px row at 1440), 33px under the heading; 3 columns on phones. */}
        <div className="max-w-[1332px] mx-auto px-4">
          <h2 className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.75rem,1.4rem+1.5vw,2.5rem)] leading-[1.15] md:leading-[40px] text-[#4F4F4F] text-center mb-6 md:mb-[33px]">
            {keepTogether(t("kids_made.heading"))}
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[200/178] rounded-card bg-[#F3EDE4]"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 8. Real experts */}
      <section aria-label="experts" className="pt-7 md:pt-12">
        {/* Figma: 104px circles 210px apart, each name and role one ADLaM Display 20 text in a 200px box; 2 columns on phones. */}
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.75rem,1.4rem+1.5vw,2.5rem)] leading-[1.15] md:leading-[40px] text-[#4F4F4F] mb-5 md:mb-[17px]">
            {keepTogether(t("experts.heading"))}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-[repeat(4,minmax(0,210px))] justify-center gap-x-4 gap-y-6 md:gap-0 max-w-[480px] md:max-w-none mx-auto">
            {experts.map((e) => (
              <div key={e.name} className="flex flex-col items-center">
                <div
                  className={`size-[88px] md:size-[104px] rounded-full ${e.bg}`}
                  aria-hidden="true"
                />
                {/* The dot between name and role is drawn on the space between them: when the role wraps to the next
                    line the browser drops that space, and the dot goes with it (as in the design). */}
                <p className="[font-family:var(--font-adlam)] font-normal text-[16px] md:text-[20px] leading-[1.2] text-[#4F4F4F] max-w-[200px] mt-3 md:mt-[17px]">
                  {e.name}
                  <span className="[word-spacing:12px] bg-[radial-gradient(circle,currentColor_1.5px,transparent_2px)] bg-center bg-no-repeat">{" "}</span>
                  {e.role}
                </p>
              </div>
            ))}
          </div>
          <p className="[font-family:var(--font-adlam)] font-normal text-[15px] md:text-[20px] leading-[1.48] text-[#4F4F4F] mt-6 md:mt-[23px]">
            {keepTogether(t("experts.note1"))}
          </p>
          <p className="[font-family:var(--font-adlam)] font-normal text-[15px] md:text-[20px] leading-[1.48] text-[#4F4F4F] mt-0.5">
            {keepTogether(t("experts.note2"))}
          </p>
        </div>
      </section>

      {/* 9. Pricing */}
      <section aria-label="pricing" className="pt-12 pb-16 md:pt-[70px] md:pb-20">
        {/* Figma: the heading only (the plan cards are unchanged) — 70px under the experts note, 17px above the plan switch. */}
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="[font-family:var(--font-cherry)] font-normal text-[clamp(1.75rem,1.4rem+1.5vw,2.5rem)] leading-[1.15] md:leading-[40px] text-[#4F4F4F] text-center mb-5 md:mb-[17px]">
            {keepTogether(t("pricing_teaser.heading"))}
          </h2>
          <PricingPlans
            labels={{
              monthly: t("pricing_teaser.monthly"),
              annual: t("pricing_teaser.annual"),
              freeName: t("pricing_teaser.free_name"),
              freePrice: t("pricing_teaser.free_price"),
              freeFeatures: [
                t("pricing_teaser.free_f1"),
                t("pricing_teaser.free_f2"),
                t("pricing_teaser.free_f3"),
                t("pricing_teaser.free_f4"),
                t("pricing_teaser.free_f5"),
              ],
              ctaFree: t("pricing_teaser.cta_free"),
              plusName: t("pricing_teaser.plus_name"),
              plusPrice: t("pricing_teaser.plus_price"),
              plusBillingAnnual: t("pricing_teaser.plus_billing_annual"),
              plusBillingMonthly: t("pricing_teaser.plus_billing_monthly"),
              plusIntro: t("pricing_teaser.plus_intro"),
              plusFeatures: [
                t("pricing_teaser.plus_f1"),
                t("pricing_teaser.plus_f2"),
                t("pricing_teaser.plus_f3"),
                t("pricing_teaser.plus_f4"),
              ],
              ctaPlus: t("pricing_teaser.cta_plus"),
              badgePopular: t("pricing_teaser.badge_popular"),
              familyName: t("pricing_teaser.family_name"),
              familyPrice: t("pricing_teaser.family_price"),
              familyBillingAnnual: t("pricing_teaser.family_billing_annual"),
              familyBillingMonthly: t("pricing_teaser.family_billing_monthly"),
              familyIntro: t("pricing_teaser.family_intro"),
              familyFeatures: [
                t("pricing_teaser.family_f1"),
                t("pricing_teaser.family_f2"),
                t("pricing_teaser.family_f3"),
              ],
              ctaFamily: t("pricing_teaser.cta_family"),
              badgeValue: t("pricing_teaser.badge_value"),
            }}
          />
        </div>
      </section>

      {/* 10. FAQ */}
      <section aria-label="questions parents ask" className="py-8 md:py-12">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-ink text-center mb-8">
            {keepTogether(t("faq.heading"))}
          </h2>
          <ul className="space-y-3" role="list">
            {faqItems.map((item) => (
              <li
                key={item.q}
                className="rounded-pill bg-white px-6 py-3 shadow-sm font-body text-sm md:text-base text-ink"
              >
                <span className="font-bold">{item.q}</span>
                <span className="text-ink/80"> — {item.a}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 11. Ask Idea Pop */}
      <AskIdeaPop
        heading={t("ask.heading")}
        sub={t("ask.sub")}
        placeholder={t("ask.placeholder")}
        inputLabel={t("ask.input_label")}
        sendLabel={t("ask.send_label")}
        micLabel={t("ask.mic_label")}
      />

      {/* 12. CTA band */}
      <section aria-label="start for free" className="px-3 md:px-6 pb-0">
        <div
          className="max-w-6xl mx-auto rounded-t-[2.5rem] rounded-b-none md:rounded-[2.5rem] px-6 md:px-14 pt-10 md:pt-0 relative overflow-visible"
          style={{ backgroundColor: DEEP }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
            <div className="py-6 md:py-16 text-center md:text-start">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-[#EDF6C5] leading-snug mb-8">
                {keepTogether(t("cta_band.heading"))}
              </h2>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-pill font-display font-bold px-8 py-3 text-lg border-2 border-[#CDEB5A] text-[#EDF6C5] transition-all duration-150 hover:bg-[#CDEB5A] hover:text-[#1F4D33] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDEB5A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E5F4B] select-none"
              >
                {t("cta_band.cta")}
              </Link>
            </div>
            <div className="relative flex justify-center md:justify-end">
              <Image
                unoptimized
                src={startFreeGirl}
                alt=""
                aria-hidden="true"
                className="w-64 md:w-96 h-auto md:-mt-28 drop-shadow-xl"
                sizes="(min-width: 768px) 24rem, 16rem"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
