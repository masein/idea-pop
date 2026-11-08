#!/usr/bin/env node
// Landing page weight guard (2026-11-07). The landing once shipped a 1.8 MB hero photo and a 30,000-pixel white layer,
// and the deployed page crawled. CI now fails if any landing picture or motion script grows past its budget, so a
// heavy file has to be resized (or the budget consciously raised here) before it can ship.
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../public/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const BUDGETS = [
  // [folder under public/, largest single file in bytes, total of the folder in bytes]
  ["landing", 800_000, 14_000_000],
  ["ideapop-motion", 60_000, 120_000],
  ["method", 800_000, 4_000_000],
  ["for-teachers", 800_000, 4_000_000],
];

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

let failed = false;
for (const [folder, maxFile, maxTotal] of BUDGETS) {
  let files;
  try {
    files = walk(join(ROOT, folder));
  } catch {
    continue;
  }
  let total = 0;
  for (const f of files) {
    const size = statSync(f).size;
    total += size;
    if (size > maxFile) {
      failed = true;
      console.error(`✗ ${relative(ROOT, f)} is ${(size / 1e3).toFixed(0)} KB (limit ${(maxFile / 1e3).toFixed(0)} KB): resize or compress it.`);
    }
  }
  const line = `${folder}: ${files.length} files, ${(total / 1e6).toFixed(1)} MB (limit ${(maxTotal / 1e6).toFixed(1)} MB)`;
  if (total > maxTotal) {
    failed = true;
    console.error(`✗ ${line}`);
  } else console.log(`✓ ${line}`);
}
if (failed) {
  console.error("\nLanding weight budget exceeded (scripts/check-landing-budget.mjs).");
  process.exit(1);
}
