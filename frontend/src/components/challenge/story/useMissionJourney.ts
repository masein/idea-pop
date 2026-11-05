'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMyHeroIdeas, fetchMyProjects, type SavedHeroIdea } from '@/lib/api/client';

export interface JourneyProject {
  id: string;
  title: string;
  text: string;
  materials: string;
  hasPhoto: boolean;
}

/** One kid's saved work on one challenge, read from their account. Earlier work is never changed. */
export interface MissionJourney {
  /** The kid's idea: its name (from the sketch, when there is one) and their own words. */
  idea: { name: string | null; text: string; heroName: string | null } | null;
  sketch: JourneyProject | null;
  /** The model the kid built and tested first. */
  model: JourneyProject | null;
  /** The lab results, in the words saved to the account. */
  labResults: string | null;
  /** What the kid changed on the Skills page ("clay → foam"). */
  change: string | null;
  /** Every new version the kid made afterwards, oldest first. */
  versions: JourneyProject[];
}

export const EMPTY_JOURNEY: MissionJourney = { idea: null, sketch: null, model: null, labResults: null, change: null, versions: [] };

type RawProject = {
  id: string;
  origin_id?: string;
  title: string;
  description?: string;
  materials?: string;
  photo_keys?: string[];
  step_type?: string | null;
  created_at: string;
};

function toItem(p: RawProject): JourneyProject {
  return { id: p.id, title: p.title, text: p.description ?? '', materials: p.materials ?? '', hasPhoto: (p.photo_keys?.length ?? 0) > 0 };
}

/** Puts a kid's saved ideas and projects in their places. Projects saved before each one recorded
 *  its kind are recognised by what they hold. */
export function buildJourney(challengeId: string, labTitle: string | null, ideas: SavedHeroIdea[], projects: RawProject[]): MissionJourney {
  const mine = ideas.filter((i) => i.challenge_id === challengeId);
  const attached = new Set(mine.map((i) => i.project_id).filter(Boolean));
  const kindOf = (p: RawProject) => {
    if (p.step_type) return p.step_type;
    if (attached.has(p.id)) return 'sketch';
    if (labTitle && p.title === labTitle) return 'lab';
    if ((p.materials ?? '').includes(' → ')) return 'practice';
    // Anything else from before is the kid's, on My Profile; only a real new version counts here.
    return 'other';
  };
  // Newest first, whatever order they came in.
  const here = projects
    .filter((p) => p.origin_id === challengeId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const ofKind = (...kinds: string[]) => here.filter((p) => kinds.includes(kindOf(p)));

  const latest = mine[0] ?? null;
  const sketches = ofKind('sketch');
  const sketch = (latest?.project_id ? here.find((p) => p.id === latest.project_id) : null) ?? sketches[0] ?? null;
  const models = ofKind('model', 'lab');
  const model = models.find((p) => (p.photo_keys?.length ?? 0) > 0) ?? null;
  const lab = ofKind('lab')[0] ?? null;
  const idea = latest
    ? { name: sketch?.title ?? null, text: latest.text, heroName: latest.hero_name }
    : sketch
      ? { name: sketch.title, text: sketch.description ?? '', heroName: null }
      : null;

  return {
    idea,
    sketch: sketch ? toItem(sketch) : null,
    model: model ? toItem(model) : null,
    labResults: lab?.description?.trim() || null,
    change: ofKind('practice')[0]?.materials?.trim() || null,
    versions: ofKind('build').reverse().map(toItem),
  };
}

/** Reads the kid's saved work when `enabled`, again whenever `refreshKey` changes. A failed read
 *  only means empty spots: it never blocks the kid. */
export function useMissionJourney(challengeId: string, locale: string, labTitle: string | null, enabled: boolean, refreshKey: string) {
  const [journey, setJourney] = useState<MissionJourney>(EMPTY_JOURNEY);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    Promise.all([fetchMyHeroIdeas(locale).catch(() => []), fetchMyProjects().catch(() => null)]).then(([ideas, res]) => {
      if (!alive) return;
      const items = Array.isArray(res) ? res : ((res as { items?: unknown[] } | null)?.items ?? []);
      setJourney(buildJourney(challengeId, labTitle, ideas, items as RawProject[]));
    });
    return () => {
      alive = false;
    };
  }, [challengeId, locale, labTitle, enabled, refreshKey, tick]);

  return { journey, refresh };
}
