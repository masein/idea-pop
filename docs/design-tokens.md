# Idea Pop — Design Tokens (locked)

These are the canonical tokens wired into `frontend/tailwind.config.ts`. They were
reconciled from the design's **UI Review** (which quotes exact hexes) and the
**Figma SVG exports** in the project folder.

> Note on live Figma: the file is on a **Starter plan / View seat**, so the Figma
> MCP `get_variable_defs` tool (which reads named variables) requires a Dev-Mode
> selection in the desktop app and could not be read remotely. The two values
> marked **TODO** below should be confirmed once a Dev seat is available, or by
> selecting the relevant frame in Figma desktop and re-running the variables tool.

## Colors

| Token | Hex | Source | Use |
|---|---|---|---|
| `challenge` | `#2D9CDB` | UI review | Challenges section accent |
| `library` | `#F2994A` | UI review | Library section accent |
| `explore` | `#27AE60` | **TODO confirm** | Explore section accent (green) |
| `pricing` | `#9B51E0` | **TODO confirm** | Pricing section accent (purple) |
| `tint.lime` | `#F3FFC2` | UI review | Page tint |
| `tint.cream` | `#FBF7D5` | UI review | Page tint |
| `tint.blue` | `#C0F0FF` | UI review | Page tint |
| `tint.lavender` | `#F1D8FB` | UI review | Page tint |
| `tint.blush` | `#F9DED7` | UI review | Page tint |
| `ink` | `#2B2B2B` | derived | Default text |

The "chameleon" nav recolors the active tab to its section accent — drive this off
the section accent tokens above.

## Typography

- **Baloo 2** — display / headlines **only** (loaded via `next/font` as `--font-baloo`).
- **Nunito** — body and reading text (`--font-nunito`).
- Minimum body size ~14px; larger for kid-facing copy. (UI review: the bubble/display
  font was overused at small sizes — keep it to headlines.)

## Radii

- `card` = 1.25rem · `pill` = 9999px

## Known UI-review corrections to apply when building real screens

- One button system with all states (default/hover/focus/pressed/disabled); one input anatomy.
- One mascot (Poppy); one icon library; scrims/reserved text zones on image cards.
- Copy fixes: "Chose" -> "Choose", "$59.9" -> "$59.90", "None of them above" -> "None of the above";
  remove any "Thrive" brand; sentence-case headings.
- Tablet-first responsive; WCAG AA contrast (watch white text on light-purple, small text on busy art).
