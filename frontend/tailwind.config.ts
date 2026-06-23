import type { Config } from "tailwindcss";

/**
 * Idea Pop design tokens.
 *
 * Sourced from the design's own UI review (which quotes the exact hexes) and the
 * Figma SVG exports in the project folder. Two accent hexes (explore green,
 * pricing purple) are best-guess until confirmed against Figma variables — see
 * docs/design-tokens.md. Rule from the design: Baloo 2 = display/headlines only,
 * Nunito = body.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Per-section accent colors (the "chameleon" nav recolors per section)
        explore: "#27AE60", // TODO: confirm exact green from Figma variables
        library: "#F2994A", // from UI review
        challenge: "#2D9CDB", // from UI review
        pricing: "#9B51E0", // TODO: confirm exact purple from Figma variables
        // Pastel per-section page background tints
        tint: {
          lime: "#F3FFC2",
          cream: "#FBF7D5",
          blue: "#C0F0FF",
          lavender: "#F1D8FB",
          blush: "#F9DED7",
        },
        ink: "#2B2B2B",
      },
      fontFamily: {
        // Baloo 2 — headlines ONLY. Nunito — body/reading text.
        display: ["var(--font-baloo)", "system-ui", "sans-serif"],
        body: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
        pill: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
