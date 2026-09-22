/* The marketing pages' shared kit: the two buttons from the UI kit and the small text and motion helpers.
   Kept in one place so the landing page and The Method (and later pages) stay identical. */

// Headings never end on a lone word on narrow screens: the last two words are joined with a no-break space,
// and the brand name never splits either.
export const keepTogether = (text: string) =>
  text.replace(/Idea Pop/g, "Idea Pop").replace(/\s+(\S+)\s*$/, " $1");

/* Motion (motion.css): data-intro plays on load, data-reveal the first time a block scrolls into view, data-scroll moves
   with the scrollbar. motionDelay staggers an entrance; fromCenter orders a row from its middle outward (0 for the
   centre item or pair, then 1, 2 …), so rows open from the centre. */
export const motionDelay = (ms: number) => ({ "--motion-delay": `${ms}ms` }) as React.CSSProperties;
export const fromCenter = (i: number, count: number) => Math.floor(Math.abs(i - (count - 1) / 2));

/* Where a page's heading starts: clear of the nav's circle, which hangs below the pill, and one line shared by the
   pages that open on a heading (The Method, Pricing, For Teachers) so their headings sit at the same height. */
export const pageTop = "pt-[clamp(8.5rem,6rem+5vw,11rem)]";

// The big photo under a page's heading (The Method, For Teachers): rounded corners and a soft shadow.
export const pagePhoto = "rounded-[20px] md:rounded-[28px] shadow-[0_6px_18px_rgba(0,0,0,0.18)]";

/* The button kit: primary is the lime fill with #1F4D33 text (7.3:1 — #18785A only reached 4.2:1, which fails at
   the 15px phone size), secondary is the see-through fill. Both rest on a 1px inset stroke, thicken to 2px and scale
   to 1.11 on hover (the label then reads 20px without the box moving anything), and darken when pressed. */
export const btnLime =
  "inline-flex items-center justify-center rounded-pill [font-family:var(--font-montserrat)] font-extrabold px-8 md:px-[53px] py-3 text-[clamp(0.9375rem,0.79rem+0.68vw,1.125rem)] bg-[#D1EF5A] text-[#1F4D33] transition-all duration-150 hover:brightness-105 hover:scale-[1.11] hover:shadow-[inset_0_0_0_2px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] active:scale-[0.97] active:bg-[#B8D24F] active:shadow-[inset_0_0_0_2px_#18785A,0_2px_2px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D33] focus-visible:ring-offset-2 select-none shadow-[inset_0_0_0_1px_#18785A,0_4px_4px_rgba(0,0,0,0.25)]";
// Glass button: the fill is 46% white so what's behind shows through (the hero scene);
// the stroke is an inset shadow like the lime button's.
export const btnGlass =
  "inline-flex items-center justify-center rounded-pill [font-family:var(--font-montserrat)] font-extrabold px-8 md:px-[53px] py-3 text-[clamp(0.9375rem,0.79rem+0.68vw,1.125rem)] bg-white/[.46] text-[#146047] transition-all duration-150 hover:bg-[#F4FADD] hover:scale-[1.11] hover:shadow-[inset_0_0_0_2px_#18785A,0_4px_4px_rgba(0,0,0,0.25)] active:scale-[0.97] active:bg-[#E3EFC4] active:text-[#0F4C39] active:shadow-[inset_0_0_0_2px_#0F4C39,0_2px_2px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18785A] focus-visible:ring-offset-2 select-none shadow-[inset_0_0_0_1px_#18785A,0_4px_4px_rgba(0,0,0,0.25)]";

/* The glass button was drawn for light backgrounds. On the deep green band its #146047 label only reaches 3.3:1, so
   there it keeps the same fill and stroke and darkens the label to #0E3B2C (5.4:1) - the designer's call. Written as
   a replace so there is still only one glass button to change; the literal class is what Tailwind reads. */
export const btnGlassOnDark = btnGlass.replace("text-[#146047]", "text-[#0E3B2C]");
