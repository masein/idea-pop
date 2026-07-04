import { getTranslations } from "next-intl/server";
import Image, { type StaticImageData } from "next/image";
import { Link } from "@/i18n/routing";

import logoBadge from "../../../../public/landing/idea-pop-logo.png";
import logoText from "../../../../public/landing/idea-pop-text.svg";
import scientistGirl from "../../../../public/landing/start-free-girl.png";

import arthropodaAvatar from "../../../../public/explore/arthropoda-avatar.png";
import arthropodaIcon from "../../../../public/explore/arthropoda-icon.png";
import molluscaAvatar from "../../../../public/explore/mollusca-avatar.png";
import wormsAvatar from "../../../../public/explore/worms-avatar.png";
import wormsIcon from "../../../../public/explore/worms-icon.png";
import echinodermataAvatar from "../../../../public/explore/echinodermata-avatar.png";
import fishAvatar from "../../../../public/explore/fish-avatar.png";
import amphibiansAvatar from "../../../../public/explore/amphibians-avatar.png";
import amphibiansIcon from "../../../../public/explore/amphibians-icon.png";
import reptileAvatar from "../../../../public/explore/reptile-avatar.png";
import reptileIcon from "../../../../public/explore/reptile-icon.png";
import birdAvatar from "../../../../public/explore/bird-avatar.png";
import birdIcon from "../../../../public/explore/bird-icon.png";
import mammalAvatar from "../../../../public/explore/mammal-avatar.png";
import mammalIcon from "../../../../public/explore/mammal-icon.png";

const INK = "#3B2A26";
const CARD = "#E7A08C";

type Category = {
  key: string;
  avatar: StaticImageData | null;
  icon?: StaticImageData | null;
  emoji?: string;
};

const INVERTEBRATES: Category[] = [
  { key: "arthropoda", avatar: arthropodaAvatar, icon: arthropodaIcon },
  { key: "mollusca", avatar: molluscaAvatar }, // shell held by avatar
  { key: "worms", avatar: wormsAvatar, icon: wormsIcon },
  { key: "echinodermata", avatar: echinodermataAvatar }, // starfish held by avatar
  { key: "cnidaria", avatar: null, emoji: "🪼" }, // asset not exported yet
];

const VERTEBRATES: Category[] = [
  { key: "fish", avatar: fishAvatar, emoji: "🐠" }, // fish icon not exported yet
  { key: "amphibians", avatar: amphibiansAvatar, icon: amphibiansIcon },
  { key: "reptiles", avatar: reptileAvatar, icon: reptileIcon },
  { key: "birds", avatar: birdAvatar, icon: birdIcon },
  { key: "mammals", avatar: mammalAvatar, icon: mammalIcon },
];

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "exploring" });
  return {
    title: `${t("title")} — Idea Pop`,
    description: t("invertebrates_desc"),
  };
}

function CategoryCard({ name, cat }: { name: string; cat: Category }) {
  return (
    <div className="relative pb-14">
      <div
        className="relative h-60 rounded-[2rem] px-6 pt-5"
        style={{ backgroundColor: CARD }}
      >
        <h3
          className="relative z-20 font-display text-2xl font-bold"
          style={{ color: INK, textShadow: "0 1px 1px rgba(255,255,255,0.25)" }}
        >
          {name}
        </h3>

        {/* soft circle behind the animal */}
        <div
          aria-hidden="true"
          className="absolute left-6 top-[84px] h-36 w-36 rounded-full bg-white/25"
        />

        {/* animal: exported icon, or emoji fallback where the asset is missing */}
        {cat.icon ? (
          <Image
            src={cat.icon}
            alt=""
            aria-hidden="true"
            unoptimized
            className="absolute left-7 top-[92px] z-10 h-28 w-28 object-contain"
            sizes="112px"
          />
        ) : cat.emoji ? (
          <span
            aria-hidden="true"
            className="absolute left-12 top-[104px] z-10 text-6xl"
          >
            {cat.emoji}
          </span>
        ) : null}

        {/* kid avatar — overflows below the card */}
        {cat.avatar && (
          <Image
            src={cat.avatar}
            alt=""
            aria-hidden="true"
            unoptimized
            className="absolute -bottom-12 right-1 z-10 h-72 w-auto object-contain"
            sizes="240px"
          />
        )}
      </div>
    </div>
  );
}

export default async function ExploringPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "exploring" });

  const grid = (cats: Category[]) => (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {cats.map((cat) => (
        <CategoryCard key={cat.key} name={t(`cat.${cat.key}`)} cat={cat} />
      ))}
    </div>
  );

  return (
    <div style={{ backgroundColor: "#FAE7E2" }} className="min-h-screen">
      {/* Header */}
      <header style={{ backgroundColor: "#D9A492" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Idea Pop home"
          >
            <Image
              src={logoBadge}
              alt=""
              width={111}
              height={111}
              className="h-14 w-14"
            />
            <span className="hidden sm:block">
              <Image
                src={logoText}
                alt="Idea Pop"
                width={156}
                height={41}
                className="h-7 w-auto"
              />
              <span
                className="mt-0.5 block font-display text-xs font-bold"
                style={{ color: INK }}
              >
                Ask nature, How? Build, with your hands
              </span>
            </span>
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-pill bg-white px-6 py-2.5 font-display text-base font-bold text-[#2E5F4B] shadow-sm transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#D9A492]"
          >
            {t("signup")}
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-6 pb-4">
        {/* Title */}
        <div className="py-12 text-center">
          <h1
            className="font-display text-4xl font-bold md:text-5xl"
            style={{ color: INK }}
          >
            {t("title")}
          </h1>
          <p
            className="mt-3 font-display text-xl font-bold md:text-2xl"
            style={{ color: INK }}
          >
            {t("sub1_pre")}
            <span className="text-library">{t("sub1_em")}</span>
            {t("sub1_post")}
          </p>
          <p
            className="mt-1 font-display text-xl font-bold md:text-2xl"
            style={{ color: INK }}
          >
            {t("sub2_pre")}
            <span className="text-explore">{t("sub2_em")}</span>
            {t("sub2_post")}
          </p>
        </div>

        {/* Invertebrates */}
        <section aria-label={t("invertebrates_heading")} className="mb-6">
          <h2 className="font-display text-3xl font-bold text-[#BC6E5D]">
            {t("invertebrates_heading")}
          </h2>
          <p
            className="mb-8 mt-1 max-w-4xl font-body font-semibold"
            style={{ color: INK }}
          >
            {t("invertebrates_desc")}
          </p>
          {grid(INVERTEBRATES)}
        </section>

        {/* Vertebrates */}
        <section aria-label={t("vertebrates_heading")} className="mt-10">
          <h2 className="font-display text-3xl font-bold text-[#BC6E5D]">
            {t("vertebrates_heading")}
          </h2>
          <p
            className="mb-8 mt-1 max-w-4xl font-body font-semibold"
            style={{ color: INK }}
          >
            {t("vertebrates_desc")}
          </p>
          {grid(VERTEBRATES)}
        </section>
      </main>

      {/* CTA band */}
      <section aria-label="join" className="px-6 pb-16 pt-8">
        <div
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] px-8 py-10 md:px-14"
          style={{ backgroundColor: CARD }}
        >
          <div className="relative z-10 max-w-md text-center md:text-start">
            <h2
              className="font-display text-3xl font-bold leading-snug md:text-4xl"
              style={{ color: INK }}
            >
              {t("cta_1")}
              <br />
              {t("cta_2")}
              <br />
              {t("cta_3")}
            </h2>
            <div className="mt-6">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-pill bg-white px-8 py-3 font-display text-lg font-bold text-[#2E5F4B] shadow-sm transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                style={{ ["--tw-ring-offset-color" as string]: CARD }}
              >
                {t("cta_button")}
              </Link>
            </div>
          </div>
          <Image
            src={scientistGirl}
            alt=""
            aria-hidden="true"
            unoptimized
            className="pointer-events-none absolute -bottom-2 right-0 z-0 hidden h-[118%] w-auto object-contain md:block"
            sizes="420px"
          />
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: "#C08A79" }} className="text-[#FBEDE8]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="max-w-2xl font-display text-2xl font-bold md:text-3xl">
            {t("footer_heading")}
          </h2>
          <div className="mt-8 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <ul className="space-y-3 font-body font-semibold" role="list">
              {[
                { label: t("footer_popular_activity"), href: "/explore" as const },
                { label: t("footer_popular_course"), href: "/library" as const },
                { label: t("footer_challenges"), href: "/challenges" as const },
                { label: t("footer_about"), href: "/method" as const },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="rounded transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <Image
              src={logoText}
              alt="Idea Pop"
              width={156}
              height={41}
              className="h-10 w-auto self-start sm:self-end"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
