/**
 * Which mission slugs embed which on-device tool. Slug-keyed for now — if a
 * fourth tool appears this should become an `embedded_tool` field on the
 * challenge itself (see the note in StepBuild).
 */
export const CLASSIFIER_SLUGS = new Set(['teach-the-machine-to-see', 'spot-the-fake']);
export const ANIMATION_SLUGS = new Set(['bring-it-to-life']);
/** These games replace the photo/capture flow on THREE steps (skill,
 *  sketch/plan, build & test) for their missions — see gameEmbeds.ts. */
export const QTREE_SLUG = 'the-guess-who-tree';
export const MAZE_SLUG = 'train-your-pet-algorithm';
