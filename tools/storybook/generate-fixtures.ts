// Generates Storybook fixtures from the configured Sanity dataset — two passes.
//
// Why: section components render Sanity-shaped data, and images only resolve
// through useNextSanityImage when given a real Sanity asset (with _id/url/
// metadata). Hand-written mocks can't satisfy that, so we pull one real
// instance of each section type from the dataset and commit it as JSON. The
// loader (sectionFixture.ts) prefers these over mock data.
//
// The second pass covers the site-wide singletons — header, footer, socials —
// which sections never carry. The components reading them are async server
// components that Storybook replaces with mocks, and a mock that hardcodes its
// content is invisible drift by construction: it keeps rendering whatever was
// typed the day it was written. `globalFixture.ts` reads the result.
//
// Run with: yarn storybook:fixtures
// Re-run after content changes, or on a new project once /project-setup has
// pointed the env at the new dataset. The story-fixture-checker agent also
// runs this during /commit and /pr.
//
// Maintenance: both passes reuse the app's own `sectionsProjection` and query
// constants, so they stay in sync with production automatically — there is no
// per-section or per-global query to maintain here. A new section is picked up
// as soon as it has a component + published content.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createClient } from '@sanity/client';

import { FOOTER_QUERY, HEADER_QUERY, SOCIAL_MEDIA_QUERY } from '@/tools/sanity/lib/queries.groq';
import sectionsProjection from '@/tools/sanity/projections/common/sections.groq';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const fixturesDir = join(here, 'fixtures');

// Load .env.development if present (CI may inject real env vars instead).
try {
  process.loadEnvFile(join(root, '.env.development'));
} catch (error) {
  /*
   * Only a missing file is expected — CI may inject real env vars and have no file at all.
   *
   * Anything else is rethrown. A bare `catch` here also swallowed
   * `TypeError: process.loadEnvFile is not a function`, which is what Node below 20.12 raises, and
   * the run then failed with exactly the confusing downstream error this block exists to prevent.
   * `engines` in package.json states the floor; this makes a breach of it say so.
   */
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error;
  }
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2021-03-25';
const token = process.env.SANITY_API_READ_TOKEN;

// Exit 2, not 1. Exit 1 is reserved for drift and always carries `DRIFT:` lines for the caller to
// quote; this path has none, so reusing 1 would report a misconfigured environment as content drift.
if (!(projectId && dataset)) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET.');
  process.exit(2);
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: 'published' });

// A section type belongs to this project when it has a renderable component.
// Each section component imports its interface from
// `@/tools/sanity/schema/sections/<type>`, so reading that import gives an
// exact component → `_type` map (handles the camelCase-type → PascalCase-folder
// naming quirk, e.g. twoColDefaultSection → TwoColumnDefaultSection).
const readSectionDirs = (dir: string) => {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    // No `sections/` at all. `/project-setup` empties it on a new project, so this is a normal
    // state, not a failure — there is simply nothing to analyse yet.
    return [];
  }
};

const localSectionTypes = new Set<string>();
for (const entry of readSectionDirs(join(root, 'sections'))) {
  if (!entry.isDirectory()) {
    continue;
  }
  try {
    const src = readFileSync(join(root, 'sections', entry.name, 'index.tsx'), 'utf8');
    const match = src.match(/schema\/sections\/(\w+)['"]/);
    if (match) {
      localSectionTypes.add(match[1]);
    }
  } catch {
    // no index.tsx — skip
  }
}

/**
 * Scratch pages, excluded from both the fixture pass and the drift report.
 *
 * A kitchen-sink page carrying one of almost every section is where retired and experimental types
 * accumulate. Counting it makes every section look used, and — more importantly here — makes every
 * abandoned type on it read as drift forever, which is how a `DRIFT:` block becomes something people
 * scroll past.
 *
 * Kept identical to `tools/sanity/audit-sections.ts` so the two commands agree about what a scratch
 * page is; override per project with `AUDIT_EXCLUDED_PATHNAMES` (comma-separated). Match the stored
 * value exactly — `pathname` is a plain string field **with a trailing slash**.
 */
const excludedPathnames = (process.env.AUDIT_EXCLUDED_PATHNAMES ?? '/section-test/,/dev/testing/,/template/')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Reuse the app's section projection verbatim — fixtures match production shape
// (images dereferenced, block content, buttons, links) with zero maintenance.
const query = `*[_type == "page" && defined(sections) && !(pathname in $excludedPathnames)].sections[]${sectionsProjection}`;

// The site-wide singletons, keyed by the name `globalFixture()` looks up. These are the app's own
// query constants, which is the property that makes this pass maintenance-free: they cannot drift
// from what production fetches, because they *are* what production fetches.
const GLOBAL_QUERIES: Record<string, string> = {
  header: HEADER_QUERY,
  footer: FOOTER_QUERY,
  socialMedia: SOCIAL_MEDIA_QUERY
};

// Rough "content richness" heuristic so we pick a populated instance.
const size = (section: unknown) => JSON.stringify(section).length;

const writeBarrel = (types: string[]) => {
  const imports = types.map((type) => `import ${type} from './${type}.json';`).join('\n');
  const entries = types.map((type) => `  ${type}`).join(',\n');
  writeFileSync(
    join(fixturesDir, 'index.ts'),
    `// AUTO-GENERATED by \`yarn storybook:fixtures\`. Do not edit by hand.
${imports}

const fixtures: Record<string, unknown> = {
${entries}
};

export default fixtures;
`
  );
};

// A fixture carrying only these keys means the section matched no `_type ==` branch in
// `tools/sanity/projections/common/sections.groq.ts`, so the query returned the bare document with
// none of its content. The story renders an empty section and nothing says why.
const EMPTY_FIXTURE_KEYS = new Set(['_key', '_type', 'sectionFields']);

const run = async () => {
  const sections = await client.fetch<{ _type?: string }[]>(query, { excludedPathnames });
  mkdirSync(fixturesDir, { recursive: true });

  const datasetTypes = [...new Set(sections.map((s) => s?._type).filter(Boolean))].filter(
    (type): type is string => typeof type === 'string'
  );

  const sectionTypes = datasetTypes.filter((type) => localSectionTypes.has(type)).toSorted();

  // The `localSectionTypes` filter above used to be silent. These are the two things it was hiding.
  const orphanContent = datasetTypes.filter((type) => !localSectionTypes.has(type)).toSorted();
  const unpublished = [...localSectionTypes].filter((type) => !datasetTypes.includes(type)).toSorted();

  // Everything is fetched and staged in memory before anything touches the disk. Writing as we go
  // means a failure in the globals pass below leaves the section fixtures rewritten against a stale
  // globals.json and barrel — while the catch at the bottom prints "Keeping the committed fixtures"
  // and exits 0, so the checker stages the half-updated state as a success.
  const pending = new Map<string, string>();
  const written: string[] = [];
  const unresolved: string[] = [];
  for (const type of sectionTypes) {
    const richest = sections.filter((s) => s?._type === type).toSorted((a, b) => size(b) - size(a))[0];
    pending.set(`${type}.json`, `${JSON.stringify(richest ?? {}, null, 2)}\n`);
    written.push(type);
    if (Object.keys(richest ?? {}).every((key) => EMPTY_FIXTURE_KEYS.has(key))) {
      unresolved.push(type);
    }
  }

  // Globals, one query at a time so the reporting can name which singleton is empty.
  const globals: Record<string, unknown> = {};
  const emptyGlobals: string[] = [];
  for (const [name, globalQuery] of Object.entries(GLOBAL_QUERIES)) {
    const value = await client.fetch<unknown>(globalQuery);
    globals[name] = value ?? null;
    if (value === null || value === undefined) {
      emptyGlobals.push(name);
    }
  }
  pending.set('globals.json', `${JSON.stringify(globals, null, 2)}\n`);

  /*
   * Two very different situations produce zero fixtures, and only one of them is a problem.
   *
   * **The project has no sections yet.** `/project-setup` deletes every placeholder section, so a
   * freshly set-up project legitimately has an empty `sections/` until the first one is built. An
   * empty barrel is the correct output here, and writing it matters: `mockImage` imports
   * `./fixtures` and `globalFixture` imports `./fixtures/globals.json`, so the files have to exist
   * or Storybook fails to build at all.
   *
   * **The project has sections, but the dataset returned none of them.** That is destructive:
   * `writeBarrel([])` is a valid module that drops every existing fixture, `sectionFixture()` starts
   * returning undefined for everything, `mockImage`'s pool empties so every image becomes the grey
   * placeholder, and in `--mode=commit` the checker stages the wipe. Refuse, and keep what is
   * committed.
   */
  if (written.length === 0 && localSectionTypes.size > 0) {
    console.error(
      'DRIFT: the dataset returned no section type with a local component, so every fixture would be dropped'
    );
    console.error('Refusing to write an empty barrel. The committed fixtures are unchanged.');
    process.exit(1);
  }

  for (const [name, contents] of pending) {
    writeFileSync(join(fixturesDir, name), contents);
  }
  writeBarrel(written);

  if (localSectionTypes.size === 0) {
    console.log('No sections in sections/ yet, so there are no section fixtures to write.');
    console.log('Wrote an empty barrel so `mockImage` and `sectionFixture` still resolve.');
    console.log('Component stories will use the mock helpers until the first section is built.\n');
  } else {
    console.log(`Wrote ${written.length} fixtures to tools/storybook/fixtures/:`);
    for (const type of written) {
      console.log(`  ✓ ${type}`);
    }
  }

  console.log('\nGlobals written to fixtures/globals.json:');
  for (const name of Object.keys(GLOBAL_QUERIES)) {
    console.log(`  ${emptyGlobals.includes(name) ? '–' : '✓'} ${name}`);
  }

  if (unpublished.length) {
    console.log('\nNo published instance, so these keep their mock-based stories:');
    for (const type of unpublished) {
      console.log(`  – ${type}`);
    }
  }

  /*
   * Orphan content is only drift once the project has sections of its own.
   *
   * A project that has just run `/project-setup` has zero components and a dataset that may already
   * be full of content. Every published type is "orphaned" in that state, which is not a finding —
   * it is the starting position, and reporting fourteen DRIFT lines on day one trains everyone to
   * ignore them. With no local sections there is simply nothing to compare against.
   */
  const orphanContentIsDrift = localSectionTypes.size > 0;

  // Drift. Printed in a fixed `DRIFT:` shape so `story-fixture-checker` can quote the lines rather
  // than re-deriving them.
  if (orphanContentIsDrift) {
    for (const type of orphanContent) {
      console.error(`DRIFT: ${type} — published content exists but there is no sections/*/index.tsx for it`);
    }
  } else if (orphanContent.length) {
    console.log(
      `\n${orphanContent.length} published section type(s) in the dataset have no component yet. Not reported as drift — this project has no sections at all, so there is nothing to compare against.`
    );
  }
  for (const type of unresolved) {
    console.error(
      `DRIFT: ${type} — fixture came back with no content, so it matches no branch in projections/common/sections.groq.ts`
    );
  }
  for (const name of emptyGlobals) {
    console.error(`DRIFT: ${name} — global query returned nothing, so any story reading it falls back to its mock`);
  }

  // Exit 1 means drift, and only drift; every exit-1 path prints a `DRIFT:` line. Exit 2 means the
  // environment is misconfigured and prints none. The `catch` below keeps using 1 for a hard failure
  // under `--strict`, which is why the agent never passes that flag — it would make that case
  // indistinguishable from drift.
  if ((orphanContentIsDrift && orphanContent.length) || unresolved.length || emptyGlobals.length) {
    process.exit(1);
  }
};

// Best-effort: if the dataset is unreachable (offline, missing token, CI without
// secrets), keep the committed fixtures and exit 0. Pass --strict to fail hard.
try {
  await run();
} catch (error) {
  const strict = process.argv.includes('--strict');
  console.error(`Fixture generation skipped: ${(error as Error).message}`);
  console.error('Keeping the committed fixtures.');
  process.exit(strict ? 1 : 0);
}
