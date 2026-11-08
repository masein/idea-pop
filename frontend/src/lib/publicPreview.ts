/**
 * Public preview: the live website shows only what is finished. Unfinished sections
 * (Explore, Library, My Profile, Parental Controls, every mission but Max) stay in the
 * code but are covered by Coming Soon, and visitors can play Max as a guest whose work
 * stays in this browser tab only.
 *
 * It is ON only when the image is built with NEXT_PUBLIC_PUBLIC_PREVIEW=1 (the publish
 * workflow does this for the live site). Localhost never sets it, so development keeps
 * full access. The backend has its own matching switch (PUBLIC_PREVIEW) that refuses the
 * same things on the server, so nothing here is only hidden in the browser.
 */
export const PUBLIC_PREVIEW = process.env.NEXT_PUBLIC_PUBLIC_PREVIEW === '1';

export function isPublicPreview(): boolean {
  return PUBLIC_PREVIEW;
}

/** The one mission open on the public site. */
export const PREVIEW_MISSION_SLUG = 'help-max-cross-the-river';

/** Where the landing page's challenge buttons send visitors (no sign-up needed). */
export const PREVIEW_MISSION_PATH = `/challenges/by-slug/${PREVIEW_MISSION_SLUG}`;

/** Ref callback: makes a block unreachable by mouse, touch, keyboard and screen readers
 *  (the `inert` attribute; React 18 has no prop for it). */
export function makeInert(el: HTMLElement | null) {
  el?.setAttribute('inert', '');
}
