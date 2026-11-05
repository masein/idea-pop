/** How many of the first challenges show the sketch tutorial video. Change this one number. */
export const SKETCH_TUTORIAL_CHALLENGES = 5;

/** The tutorial teaches sketching once, during the kid's first few challenges. */
export function showsSketchTutorial(challenge: { season?: number | null; week_number?: number | null }): boolean {
  return challenge.season === 1 && (challenge.week_number ?? Infinity) <= SKETCH_TUTORIAL_CHALLENGES;
}
