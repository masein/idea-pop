import type { Config } from "tailwindcss";

/**
 * Tailwind references CSS custom properties so a future Themes layer can swap
 * palettes by overriding variables in :root without touching component classes.
 * Actual hex values live in globals.css under :root.
 */
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./.storybook/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        explore: "var(--color-explore)",
        library: "var(--color-library)",
        challenge: "var(--color-challenge)",
        pricing: "var(--color-pricing)",
        coral: {
          DEFAULT: "var(--color-coral)",
          soft: "var(--color-coral-soft)",
          faint: "var(--color-coral-faint)",
        },
        tint: {
          lime: "var(--color-tint-lime)",
          cream: "var(--color-tint-cream)",
          blue: "var(--color-tint-blue)",
          lavender: "var(--color-tint-lavender)",
          "lavender-deep": "var(--color-tint-lavender-deep)",
          blush: "var(--color-tint-blush)",
        },
        ink: "var(--color-ink)",
        surface: "var(--color-surface)",
        sidebar: "var(--color-sidebar)",
      },
      fontFamily: {
        display: ["var(--font-baloo)", "system-ui", "sans-serif"],
        body: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
        pill: "9999px",
      },
      spacing: {
        sidebar: "16rem",
      },
    },
  },
  plugins: [],
};

export default config;
