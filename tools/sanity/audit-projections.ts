// Projection weight audit: how much GROQ each section adds to the page query.
//
// Run with: yarn audit:projections
//
// Every section's projection is concatenated into one `sectionsProjection`, which every page query
// carries in full — so an oversized projection is paid for on every page, whether or not that
// section is on it. This makes that cost visible.
//
// **CLI output, not a Storybook page.**

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

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

const sections: { name: string; size: number }[] = [];
for (const entry of readSectionDirs(join(root, 'sections'))) {
  if (!entry.isDirectory()) {
    continue;
  }
  try {
    const src = readFileSync(join(root, 'sections', entry.name, 'queries.groq.ts'), 'utf8');
    sections.push({ name: entry.name, size: Buffer.byteLength(src, 'utf8') });
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
