/** Max's challenge badges, by stable id (the server's reward keys). Names are translated
 *  (story.mission_badge_<key>); renaming never changes the id, so nothing is given twice. */
export const MISSION_BADGES = ['define', 'clue', 'solved', 'tool', 'retry', 'river'] as const;
export type MissionBadgeKey = (typeof MISSION_BADGES)[number];

/** Badge artwork for now (emoji), until the drawn badges arrive. */
export const BADGE_ART: Record<MissionBadgeKey, string> = {
  define: '❓',
  clue: '🌿',
  solved: '💡',
  tool: '🧠',
  retry: '🔁',
  river: '🌉',
};

export const PHOTO_KINDS = ['design', 'build'] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

/** 5 XP per badge and 10 XP per photo kind: the most a kid can earn on this mission. */
export const MISSION_XP_MAX = MISSION_BADGES.length * 5 + PHOTO_KINDS.length * 10;
