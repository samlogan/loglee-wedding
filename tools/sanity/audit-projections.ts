// Projection weight audit: how much GROQ each section adds to the page query.
//
// Run with: yarn audit:projections
//
// Every section's projection is concatenated into one `sectionsProjection`, which every page query
// carries in full — so an oversized projection is paid for on every page, whether or not that
// section is on it. This makes that cost visible.
//
// **CLI output, not a Storybook page.**

import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import sectionsProjection from '@/tools/sanity/projections/common/sections.groq';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

/** Flag anything past this. Not a hard rule — a genuinely rich section can be large and correct. */
const LARGE_KB = 4;

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

const readSectionDirs = (dir: string) => {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    // No `sections/` at all. `/project-setup` empties it on a new project, so this is a normal
    // state, not a failure — there is simply nothing to analyse yet.
    return [];
  }
};

/*
 * The **exported GROQ string**, imported — not the bytes of `queries.groq.ts` on disk, which is what
 * this read before and which measured the wrong thing entirely.
 *
 * A `queries.groq.ts` is mostly prose: `TwoColumnListSection`'s was 3234 bytes of file holding 2649
 * bytes of query, because a 45-line header comment counted toward its score. That inverted the
 * ranking the audit exists to produce — it reported `FaqSection` at 0.5 KB against
 * `TwoColumnListSection` at 3.2 KB, a 6× gap, where the queries they actually send are 1.9 KB and
 * 2.6 KB, a 1.35× one. The tell was in the output all along: the per-section rows summed to 5.3 KB
 * under a "combined" line reading 7.2 KB, because only the combined line was measuring the query.
 *
 * It also makes the note in `sections.groq.ts` true. That comment keeps its own prose outside the
 * template literal on the grounds that "a comment there is query weight (`yarn audit:projections`
 * counts it)" — correct about the API and, until this changed, wrong about the audit, which counted
 * the comment either way.
 */
const sections: { name: string; size: number }[] = [];
for (const entry of readSectionDirs(join(root, 'sections'))) {
  if (!entry.isDirectory()) {
    continue;
  }
  try {
    // `pathToFileURL`, because a bare absolute path is not a valid ESM specifier on every platform.
    const projectionModule = await import(pathToFileURL(join(root, 'sections', entry.name, 'queries.groq.ts')).href);
    const projection: unknown = projectionModule.default;

    if (typeof projection === 'string') {
      sections.push({ name: entry.name, size: Buffer.byteLength(projection, 'utf8') });
    }
  } catch {
    // no queries.groq.ts — not a projected section
  }
}

console.log('Projection weight');
console.log('='.repeat(72));
console.log(`Combined sectionsProjection: ${kb(Buffer.byteLength(sectionsProjection, 'utf8'))}`);
console.log('This is carried by every page query in full, regardless of which sections are on the page.\n');

// Guarded: an empty list would make the mean NaN and `sections[length - 1]` a TypeError.
if (!sections.length) {
  console.log('No sections/*/queries.groq.ts found — nothing to measure.');
  process.exit(0);
}

const sorted = sections.toSorted((a, b) => b.size - a.size);
const total = sorted.reduce((sum, s) => sum + s.size, 0);

for (const { name, size } of sorted) {
  const flag = size / 1024 > LARGE_KB ? '  ← large' : '';
  console.log(`  ${kb(size).padStart(8)}  ${name}${flag}`);
}

console.log(`\n${sorted.length} projected section(s), ${kb(total)} total, ${kb(total / sorted.length)} mean.`);
console.log(`Largest: ${sorted[0].name} (${kb(sorted[0].size)}). Smallest: ${sorted.at(-1)?.name}.`);
