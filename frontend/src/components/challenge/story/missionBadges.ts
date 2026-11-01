/** The template's badges, by stable id (the server's reward keys). Names are translated
 *  (story.mission_badge_<key>); renaming never changes the id, so nothing is given twice. */
export const MISSION_BADGES = ['define', 'clue', 'solved', 'tool', 'retry', 'river'] as const;
export type MissionBadgeKey = (typeof MISSION_BADGES)[number];

/** Badge artwork: an approved picture's path, or "asset:<ID>" while its picture is pending. */
export const BADGE_ART: Record<MissionBadgeKey, string> = {
  define: '/characters/quizzy.png',
  clue: 'asset:MAX-BADGE-002',
  solved: 'asset:MAX-BADGE-003',
  tool: 'asset:MAX-BADGE-004',
  retry: 'asset:MAX-BADGE-005',
  river: 'asset:MAX-BADGE-006',
};

type BadgeStory = { sticker?: { name: string; emoji: string } | null; tool?: { badge?: string } | null; discovery?: unknown } | null | undefined;

/** A badge's name: the creativity tool's badge and the finish badge (the story's sticker)
 *  belong to each challenge; the others are the template's own. */
export function badgeName(story: BadgeStory, key: MissionBadgeKey, t: (k: string) => string): string {
  if (key === 'river' && story?.sticker?.name) return story.sticker.name;
  if (key === 'tool' && story?.tool?.badge) return story.tool.badge;
  return t(`mission_badge_${key}`);
}

/** A badge's art: another challenge's finish and tool badges belong to its own manifest set. */
export function badgeArt(story: BadgeStory, key: MissionBadgeKey): string {
  const set = (story?.discovery as { asset_set?: string } | null | undefined)?.asset_set;
  if (set && (key === 'river' || key === 'tool')) return `asset:${set}`;
  return BADGE_ART[key];
}

export const PHOTO_KINDS = ['design', 'build'] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

/** 5 XP per badge and 10 XP per photo kind: the most a kid can earn on this mission. */
export const MISSION_XP_MAX = MISSION_BADGES.length * 5 + PHOTO_KINDS.length * 10;
