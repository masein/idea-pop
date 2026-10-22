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
  clues: { key: string; emoji: string; text: string }[];
}

export interface CompanionData {
  activity: 'strider' | 'ants' | 'lily' | 'coconut';
  title: string;
  steps: string[];
  action: string;
  takeaway: string;
  hint: string;
}

/** The WH Questions character (Quizzy) who explains the tool on the Mission Brief. */
export interface WhCharacter {
  name: string;
  popi: string;
  says: string;
  image?: string | null;
}

/** One nature partner's biomimicry lesson: what it does, how, an inspiration, the kid's turn. */
export interface PartnerLesson {
  secret: string;
  how: string;
  /** One or two design directions, as inspiration (never the answer). */
  inspiration: string[];
  your_turn: string;
  /** A reference picture or simple diagram of the mechanism. */
  diagram?: string | null;
  diagram_alt?: string;
}

export interface Discovery {
  /** What the build needs, shown on the challenge card's back. */
  materials?: string[];
  /** "Think like your partner": one lesson per clue card, in the same order. */
  partner_lessons?: PartnerLesson[];
  /** The Initial Design's guiding questions, then the name prompt. */
  idea_questions?: string[];
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
  experiment?: { refs_caption: string; refs: { label: string; image: string | null }[] };
}

export function discoveryOf(story: MissionStory | null | undefined): Discovery | null {
  const d = (story as (MissionStory & { discovery?: unknown }) | null | undefined)?.discovery;
  return d && typeof d === 'object' ? (d as Discovery) : null;
}
