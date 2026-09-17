// Enforces the Storybook sidebar taxonomy.
//
// Run with: yarn audit:groups
//
// The guard is deliberately dumb: an allow-list comparison, not a judgement about whether a
// component sits in the *right* group. Choosing between `Surfaces` and `Content` needs judgement and
// is rare; typing `Componets/` is common and needs none.
//
// It matters most for sections. The `Sections/` prefix is a **contract**, not a label —
// `tools/storybook/sectionStory.tsx` gates the theme decorator, the error boundary and the
// full-width docs preview on `title.startsWith('Sections/')`. Renaming that group disables all three
// silently at runtime, which is why `/commit` and `/pr` hard-block on this script.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

/**
 * Each group is a question answerable yes or no. That is what stops the taxonomy drifting — a group
 * whose test you cannot apply is a group that collects misfits.
 *
 * There is deliberately no `Components/` group: "it lives in components/" is not a question about
 * what a thing is. `Data` (owns a data dependency) and `Feedback` (loading, toast, status) are
 * absent because this project has no members yet — add them back with the same test-per-group shape
 * when there is a real one, rather than pre-creating empty buckets.
 */
const GROUPS: Record<string, string> = {
  Foundations: 'Has no domain meaning and no content of its own — a primitive, or structural infrastructure',
  Content: 'Renders editorial copy that came from the CMS',
  Surfaces: 'Presents or discloses other content',
  Navigation: 'Helps someone get somewhere, including site chrome and assistive affordances',
  Forms: 'Collects input',
  Sections: 'A page-builder section. This prefix is a contract — see the note above'
};

interface StoryTitle {
  path: string;
  title: string;
  group: string;
}

const stories: StoryTitle[] = [];
const unreadable: { path: string; why: string }[] = [];

/**
 * Walk for story files, and fail **closed**.
 *
 * Anything Storybook would index but this script cannot parse is reported and exits non-zero rather
 * than being skipped. That includes `.stories.ts` (a CSF3 meta needs no JSX, so it is perfectly
 * valid) — skipping those quietly is how a bad title ships through a gate that reported success.
 */
const collect = (dir: string) => {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(path);
      continue;
    }
    if (!/\.stories\.tsx?$/.test(entry.name)) {
      continue;
    }
    const source = readFileSync(join(root, path), 'utf8');
    /*
     * Anchored to a two-space-indented `title:` — the meta object literal — rather than matched
     * anywhere in the file. Mock data routinely carries its own `title` field (this repo has
     * `title: 'Get in touch'` and `title: '<h2>Built for teams</h2>'` inside story args), and an
     * unanchored search returns whichever comes first in the file.
     */
    const match = source.match(/^ {2}title: '([^']+)',?$/m);
    if (!match) {
      unreadable.push({ path, why: "no meta `title: '…'` found at the expected indent" });
      continue;
    }
    const title = match[1];
    const group = title.split('/')[0];
    stories.push({ path, title, group });
  }
};

collect('components');
collect('sections');

// `Object.hasOwn`, not `in`: `in` walks the prototype chain, so a title of `constructor/Foo` or
// `toString/Bar` would pass.
const unknown = stories.filter((s) => !Object.hasOwn(GROUPS, s.group));

// Matched on the full `Sections/` prefix that sectionStory.tsx actually gates on, not just the first
// path segment, so `SectionsExtra/Foo` is caught rather than accepted.
const sectionFiles = stories.filter((s) => s.path.startsWith('sections/'));
const lostPrefix = sectionFiles.filter((s) => !s.title.startsWith('Sections/'));

console.log(`Story groups — ${stories.length} stories`);
console.log('='.repeat(60));
for (const [name, test] of Object.entries(GROUPS)) {
  const count = stories.filter((s) => s.group === name).length;
  console.log(`${String(count).padStart(5)}  ${name.padEnd(12)} ${test}`);
}

let failed = false;

if (unreadable.length) {
  failed = true;
  console.error('\nCould not read a title from these story files:');
  for (const u of unreadable) {
    console.error(`  ✗ ${u.path} — ${u.why}`);
  }
}

if (unknown.length) {
  failed = true;
  console.error('\nUnknown group:');
  for (const s of unknown) {
    console.error(`  ✗ ${s.path} — '${s.title}' uses group '${s.group}'`);
  }
  console.error(`\nKnown groups: ${Object.keys(GROUPS).join(', ')}`);
}

if (lostPrefix.length) {
  failed = true;
  console.error('\nSection story without the `Sections/` prefix — this breaks theming at runtime:');
  for (const s of lostPrefix) {
    console.error(`  ✗ ${s.path} — '${s.title}'`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('\nAll story titles use a known group.');
