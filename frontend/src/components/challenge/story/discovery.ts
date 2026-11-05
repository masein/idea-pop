import type { MissionStory } from './types';

/** A story's hands-on discovery activities (Max's challenge): the mission puzzle, the nature
 *  companions' explorations and hints, and the experiment's reference shapes. */
export interface MissionPuzzleData {
  title: string;
  intro: string;
  summary_lead: string;
  summary: string;
  map: { village: string; river: string; school: string; route: string };
  questions: { key: string; text: string; clue: string; part: string; wrong: string }[];
  clues: { key: string; emoji?: string; asset?: string; text: string }[];
}

export interface CompanionData {
  activity: 'strider' | 'ants' | 'lily' | 'coconut';
  title: string;
  steps: string[];
  action: string;
  takeaway: string;
  hint: string;
}

/** The WH Questions character (Quizi) who explains the tool on the Mission Brief. */
export interface WhCharacter {
  name: string;
  popi: string;
  says: string;
  image?: string | null;
}

/** One Nature Hero's biomimicry lesson: what it does, how, an inspiration, the kid's turn. */
export interface PartnerLesson {
  secret: string;
  how: string;
  /** One or two design directions, as inspiration (never the answer). */
  inspiration: string[];
  your_turn: string;
  /** A reference picture or simple diagram of the mechanism. */
  diagram?: string | null;
  diagram_alt?: string;
  /** "Need a hint?": points at the mechanism and asks a question, never a finished design. */
  hint?: { text: string; ask: string };
}

/** What a Nature Hero's card and video add to its clue card (same order as the clue cards). */
export interface HeroExtra {
  /** One short sentence about the hero, on the front of its card. */
  intro?: string;
  /** Its video, once it exists. Until then its Asset ID holds the spot. */
  video?: string | null;
  /** Popi's two answered questions; without them the card's own words are used. */
  popi?: { question?: string; does?: string; how?: string };
}

export interface Discovery {
  /** This challenge's picture set in the Master Asset Manifest (e.g. CHALLENGE-SET-021). */
  asset_set?: string;
  /** The challenge card's cover picture (no text boxes in it). */
  cover?: string | null;
  /** Under "Choose Your Nature Hero": what the kid has just discovered. */
  /** The top of Nature Clues: Popi repeats the mission question, then the intro under it. */
  clues_top?: { question: string; intro: string };
  choose_hero_text?: string;
  /** One per clue card, in the same order. */
  heroes?: HeroExtra[];
  /** Ends Popi's last question: "How could you use this trick to …?" */
  help_goal?: string;
  /** What the build needs, shown on the challenge card's back. */
  materials?: string[];
  /** "Think like your partner": one lesson per clue card, in the same order. */
  partner_lessons?: PartnerLesson[];
  /** The questions in the sketch tutorial video's script. */
  idea_questions?: string[];
  /** The sketch tutorial video, once it exists. Until then its Asset ID holds the spot. */
  sketch_video?: string | null;
  idea_name_prompt?: string;
  /** The words before "Build It & Test It!" on the build page. */
  checklist_intro?: string;
  /** The last page's improved-idea box (the third star). */
  improved_idea?: { title: string; prompt: string; placeholder: string };
  /** "badges": 5 XP per badge and 10 per photo kind instead of a completion bonus. */
  rewards?: { mode: string };
  /** The Build and Test lab's words before "My prediction". */
  predict_intro?: string;
  wh?: WhCharacter;
  puzzle?: MissionPuzzleData;
  /** One per clue card, in the same order. */
  companions?: CompanionData[];
  experiment?: { refs_caption: string; refs: { label: string; image: string | null; asset?: string }[] };
}

/** The hero's short name for friendly lines ("Lucia" for "Lucia Rossi"). */
export function heroShort(story: MissionStory | null | undefined): string {
  const d = discoveryOf(story) as (Discovery & { hero_short?: string }) | null;
  return d?.hero_short ?? story?.hero.name ?? '';
}

export function heroExtra(story: MissionStory | null | undefined, index: number): HeroExtra | null {
  return discoveryOf(story)?.heroes?.[index] ?? null;
}

export function discoveryOf(story: MissionStory | null | undefined): Discovery | null {
  const d = (story as (MissionStory & { discovery?: unknown }) | null | undefined)?.discovery;
  return d && typeof d === 'object' ? (d as Discovery) : null;
}
