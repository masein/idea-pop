'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { fetchMyHeroIdeas, type SavedHeroIdea } from '@/lib/api/client';
import KidProjectsGrid from './KidProjectsGrid';

type KidProjectSummary = import('@/lib/api/schema').components['schemas']['KidProjectSummary'];

/**
 * Every idea the kid has saved, grouped by challenge, newest challenge first. A sketch shows with
 * its idea, on its usual project card, so it isn't listed twice on the page. Private to the kid.
 */
export default function KidIdeas({
  projects,
  onLoaded,
  onVisibilityChanged,
}: {
  projects: KidProjectSummary[];
  /** The projects attached to ideas: the page's own project list leaves these out. */
  onLoaded: (attachedProjectIds: string[]) => void;
  onVisibilityChanged?: (projectId: string, visibility: 'private' | 'class' | 'public') => void;
}) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const [ideas, setIdeas] = useState<SavedHeroIdea[] | null>(null);

  useEffect(() => {
    fetchMyHeroIdeas(locale)
      .then((list) => {
        setIdeas(list);
        onLoaded(list.flatMap((i) => (i.project_id ? [i.project_id] : [])));
      })
      .catch(() => {
        setIdeas([]);
        onLoaded([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per language
  }, [locale]);

  if (ideas === null) return <div className="h-24 animate-pulse rounded-card bg-white" />;

  const groups = new Map<string, SavedHeroIdea[]>();
  for (const idea of ideas) groups.set(idea.challenge_id, [...(groups.get(idea.challenge_id) ?? []), idea]);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

  return (
    <section data-testid="my-ideas" className="flex flex-col gap-3">
      <h2 className="font-display text-2xl font-bold text-ink">{t('ideas_heading')}</h2>
      {ideas.length === 0 && <p className="font-body text-base font-semibold text-ink/70">{t('ideas_empty')}</p>}
      {[...groups.entries()].map(([challengeId, list]) => {
        const attached = list.flatMap((idea) => projects.filter((p) => p.id === idea.project_id));
        return (
          <div key={challengeId} data-testid="my-ideas-challenge" className="flex flex-col gap-2 rounded-card bg-white p-4 shadow-sm">
            <Link href={`/challenges/${challengeId}`} className="font-body text-lg font-extrabold text-challenge underline-offset-2 hover:underline">
              {list[0].challenge_title}
            </Link>
            <ul className="flex flex-col gap-2">
              {list.map((idea) => (
                <li key={idea.id} className="rounded-xl bg-[#F4F8FC] px-3 py-2">
                  <p dir="auto" className="whitespace-pre-line font-body text-base font-semibold text-ink">{idea.text}</p>
                  <p className="mt-1 font-body text-xs font-semibold text-[#4A5560]">
                    {idea.hero_name ? `${idea.hero_name} · ` : ''}
                    {date.format(new Date(idea.created_at))}
                  </p>
                </li>
              ))}
            </ul>
            {attached.length > 0 && <KidProjectsGrid bare projects={attached} onVisibilityChanged={onVisibilityChanged} />}
          </div>
        );
      })}
    </section>
  );
}
