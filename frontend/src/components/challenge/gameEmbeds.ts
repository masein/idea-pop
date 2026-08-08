/**
 * Registry of missions whose skill / plan / build steps embed an on-device
 * GAME instead of the generic photo/capture flow. The step components look up
 * `GAME_BY_SLUG[challenge.slug]` and, when present:
 *   - render the game's panel (expanded) on skill, sketch and build steps,
 *   - suppress the CaptureCard + paper-photo copy,
 *   - save the game's TEXT SNAPSHOT as the project (sketch & build) so the
 *     celebrate/Ideas-Wall flow keeps its project id — no photo upload.
 *
 * If a third game appears, consider replacing this (and toolSlugs.ts) with an
 * `embedded_tool` field on the challenge itself.
 */

import type { ComponentType } from 'react';
import QuestionTreePanel from '@/components/ai/QuestionTreePanel';
import RewardMazePanel from '@/components/ai/RewardMazePanel';
import { snapshotText as qtreeSnapshot } from '@/lib/ai/questionTreeStorage';
import { mazeSnapshotText } from '@/lib/ai/rewardMazeStorage';
import { MAZE_SLUG, QTREE_SLUG } from './toolSlugs';

/** next-intl translator narrowed to what the snapshot builders need. */
type Translator = (key: string, values?: Record<string, string | number>) => string;

export interface GameEmbed {
  /** i18n namespace holding the game's strings (incl. project_title etc.). */
  i18nNs: 'qtree' | 'maze';
  Panel: ComponentType<{ defaultOpen?: boolean }>;
  /** The game's share artefact as text (null if the kid hasn't played yet). */
  buildSnapshot: (t: Translator) => string | null;
  /** Prefix for the step-level testids: `${prefix}-sketch-continue` etc. */
  testIdPrefix: 'qtree' | 'maze';
}

export const GAME_BY_SLUG: Record<string, GameEmbed> = {
  [QTREE_SLUG]: {
    i18nNs: 'qtree',
    Panel: QuestionTreePanel,
    buildSnapshot: (t) =>
      qtreeSnapshot({
        question: (q) => t(`q_${q}`),
        animal: (id) => t(`animal_${id}`),
        bestLine: (count) => t('best_line', { count }),
      }),
    testIdPrefix: 'qtree',
  },
  [MAZE_SLUG]: {
    i18nNs: 'maze',
    Panel: RewardMazePanel,
    buildSnapshot: (t) =>
      mazeSnapshotText({
        tryLine: (n, steps, outcome) =>
          outcome === 'cheese' ? t('try_line_cheese', { n, steps }) : t('try_line_timeout', { n }),
      }),
    testIdPrefix: 'maze',
  },
};
