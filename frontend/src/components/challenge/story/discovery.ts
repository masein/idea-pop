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

export interface Discovery {
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
