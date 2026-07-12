import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * Regression guard against untranslated UI text in the kid-app surface.
 *
 * Large parts of the kid app once rendered hardcoded English under /fa because
 * components bypassed next-intl (auth refresh, teacher class, the whole mission
 * player…). These files are now fully internationalised; this test fails the
 * build if a bare alphabetic JSX text node (a word of 3+ letters sitting
 * directly between > and <) sneaks back in. Emoji, punctuation, numbers and
 * {t(...)} expressions are fine — only literal words are flagged.
 *
 * Scope is deliberately the files we internationalised. Attribute strings
 * (aria-label="…") aren't matched by the >text< heuristic; keep passing those
 * through t() by review. New leaks in these files should use useTranslations.
 */

const ROOT = path.resolve(__dirname, '../../..');

// Directories whose .tsx files we have fully internationalised.
const GUARDED_DIRS = [
  'src/components/challenge',
  'src/app/[locale]/challenges/_components',
  'src/app/[locale]/(app)/explore',
  'src/app/[locale]/(app)/library',
  'src/app/[locale]/(app)/profile',
  'src/app/[locale]/(app)/challenges',
  // All four dashboards (kid, parent, teacher, reviewer) are now localised.
  'src/app/[locale]/(app)/dashboard',
];
const GUARDED_FILES = [
  'src/components/AppShell.tsx',
  'src/components/PenguinMascot.tsx',
  'src/components/HelpPanel.tsx',
  'src/components/explore/VideoPlayer.tsx',
  'src/components/library/LessonVideoPlayer.tsx',
];

function walkTsx(dir: string): string[] {
  let out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walkTsx(full));
    else if (e.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

// A JSX text node between tags that contains a run of ≥3 letters.
// {expr}, emoji, digits and symbols are ignored — only real words trip it.
const JSX_TEXT = />[ \t]*([A-Za-z][A-Za-z ,.'!?&:;/()-]{2,})[ \t]*</g;

function leaks(src: string): string[] {
  // Drop JSX/TS comments so commented prose doesn't false-positive.
  const cleaned = src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const found: string[] = [];
  for (const m of cleaned.matchAll(JSX_TEXT)) {
    const text = m[1].trim();
    // Ignore single closing-tag words that are actually type params or fragments.
    if (/^[A-Za-z][A-Za-z ,.'!?&:;/()-]*$/.test(text)) found.push(text);
  }
  return found;
}

describe('kid-app i18n — no hardcoded JSX text', () => {
  const files = [
    ...GUARDED_FILES.map((f) => path.join(ROOT, f)),
    ...GUARDED_DIRS.flatMap((d) => walkTsx(path.join(ROOT, d))),
  ].filter((f) => !f.endsWith('.test.tsx') && !f.endsWith('.stories.tsx'));

  it('resolves the guarded file set', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it.each(files.map((f) => [path.relative(ROOT, f), f] as const))(
    '%s has no bare English JSX text',
    (_rel, file) => {
      const found = leaks(readFileSync(file, 'utf8'));
      expect(found, `Untranslated JSX text — wrap in t(): ${found.join(' | ')}`).toEqual([]);
    },
  );
});
