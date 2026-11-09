'use client';

import { useTranslations } from 'next-intl';
import BadgeIcon from '@/components/challenge/story/BadgeIcon';
import { useAvatarBadge } from '@/lib/avatarBadge';

/** The newest mission badge, pinned to the corner of the kid's avatar (the avatar's parent
 *  must be `relative`). Nothing shows until a mission is finished. */
export default function AvatarBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const t = useTranslations('story');
  const badge = useAvatarBadge(t);
  if (!badge) return null;
  const box = size === 'sm' ? 'h-7 w-7 -bottom-1 -end-1' : 'h-9 w-9 -bottom-1 -end-1';
  return (
    <span
      data-testid="avatar-badge"
      title={badge.name}
      aria-label={t('avatar_badge_aria', { name: badge.name })}
      role="img"
      className={`absolute ${box} z-10 flex items-center justify-center overflow-hidden rounded-full border-2 border-[#F2B705] bg-[#FFF5D1] shadow-[0_2px_6px_rgba(0,0,0,0.2)]`}
    >
      <BadgeIcon art={badge.art} className="h-full w-full" compact />
    </span>
  );
}
