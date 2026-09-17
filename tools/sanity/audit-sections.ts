// Section registry audit: what is placeable, what renders, what is projected, and what is used.
//
// Run with: yarn audit:sections
//
// A section is only fully wired when it appears in four places (see CLAUDE.md § Section
// Architecture). Each of the three cross-checks below catches a different half-registration, all of
// which fail silently in the app:
//
//   placeable but not rendered  → an editor can add it; the page renders nothing where it sits
//   placeable but not projected → it renders, with every field undefined
//   rendered but not placeable  → dead component, no way to put it on a page
//
// **This is CLI output, not a Storybook page.** Verdicts belong here, where the numbers can be blunt.
// The Foundations/Design System pages describe the system; they do not report findings.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { pageSections } from '@/tools/sanity/helpers/sections';
import sectionsProjection from '@/tools/sanity/projections/common/sections.groq';

import { auditClient } from './lib/auditClient';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

try {
  process.loadEnvFile(join(root, '.env.development'));
} catch {
  // no env file — rely on the ambient environment
}

/**
 * Pages excluded from usage counts.
 *
 * A scratch or kitchen-sink page carrying one of almost every section makes every section look used
 * and empties the "no published instance" list — the one output anybody acts on.
 *
 * These are this boilerplate's conventional scratch paths, and projects built from it inherit them.
 * Override per project with `AUDIT_EXCLUDED_PATHNAMES` (comma-separated) if the convention differs.
 *
 * Match the stored value exactly. `pathname` is a **plain string field with a trailing slash**
 * (`/section-test/`), not an object — an earlier version of this query read `pathname.current`, which
 * is null for every page, so the exclusion silently matched nothing at all.
 */
const EXCLUDED_PATHNAMES = new Set(
  (process.env.AUDIT_EXCLUDED_PATHNAMES ?? '/section-test/,/dev/testing/,/template/')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

/** Placeable: the editor can add it to a page. */
const placeable = new Set(pageSections.map((s) => s.type));

/**
 * Rendered: a component exists for it.
 *
 * Read from the component's own import of its schema interface, which gives an exact
 * `_type` → folder map and handles the camelCase-type → PascalCase-folder naming quirk
 * (`twoColDefaultSection` → `TwoColumnDefaultSection`).
 */
const readSectionDirs = (dir: string) => {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    // No `sections/` at all. `/project-setup` empties it on a new project, so this is a normal
    // state, not a failure — there is simply nothing to analyse yet.
    return [];
  }
};

const rendered = new Map<string, string>();
for (const entry of readSectionDirs(join(root, 'sections'))) {
  if (!entry.isDirectory()) {
    continue;
  }
  try {
    const src = readFileSync(join(root, 'sections', entry.name, 'index.tsx'), 'utf8');
    const match = src.match(/schema\/sections\/(\w+)['"]/);
    if (match) {
      rendered.set(match[1], entry.name);
    }
  } catch {
    // no index.tsx — not a section component
  }
}

/**
 * Projected: the type appears in the built projection string.
 *
 * Regexed out of the **built** projection rather than the source files, because that string is the
 * only artefact that cannot disagree with what production actually sends.
 */
const projected = new Set([...sectionsProjection.matchAll(/_type\s*==\s*['"](\w+)['"]/g)].map((m) => m[1]));

const run = async () => {
  /*
   * Resolve the dataset once and use it for both the client and the header.
   *
   * `auditClient()` with no argument defaults to `production`, while the header printed the value of
   * `NEXT_PUBLIC_SANITY_DATASET` — so a project configured for `staging` queried production and
   * labelled the result "staging". That is exactly the mismatch `auditClient`'s own docstring exists
   * to prevent, reintroduced one level up at the call site.
   */
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
  const client = auditClient(dataset);
  const pages = await client.fetch<{ pathname?: string; types?: string[] }[]>(
    `*[_type == "page" && defined(sections)]{ pathname, "types": sections[]._type }`
  );

  const counted = pages.filter((p) => !EXCLUDED_PATHNAMES.has(p.pathname ?? ''));
  const excluded = pages.length - counted.length;

  const usage = new Map<string, number>();
  let totalInstances = 0;
  for (const page of counted) {
    for (const type of page.types ?? []) {
      usage.set(type, (usage.get(type) ?? 0) + 1);
      totalInstances += 1;
    }
  }

  console.log(`Section usage — dataset "${dataset}", published only`);
  console.log('='.repeat(72));
  console.log(
    `${counted.length} page(s) counted${excluded ? `, ${excluded} excluded (${[...EXCLUDED_PATHNAMES].join(', ')})` : ''}, ${totalInstances} section instance(s)\n`
  );

  /*
   * Rows come from placeable ∪ rendered ∪ used — deliberately **not** ∪ projected.
   *
   * `projected` is regexed out of the whole combined projection string, which also contains the
   * nested `_type ==` branches of shared sub-projections (`link`, `divider`, `blockContentImage`
   * and friends). Those are block-content members, not sections, and listing them prints five rows
   * of "not placeable, no component" noise about things that were never meant to be sections.
   * `projected` is still exactly right for the "placeable but not projected" check below, which is
   * the only thing it is used for.
   */
  const allTypes = [...new Set([...placeable, ...rendered.keys(), ...usage.keys()])].toSorted();
  for (const type of allTypes) {
    const count = usage.get(type) ?? 0;
    // Guarded: an empty dataset would otherwise print `NaN%` for every row.
    const share = totalInstances > 0 ? `${((count / totalInstances) * 100).toFixed(1)}%` : '—';
    const flags = [
      placeable.has(type) ? null : 'not placeable',
      rendered.has(type) ? null : 'no component',
      projected.has(type) ? null : 'not projected'
    ].filter(Boolean);
    const suffix = flags.length ? `  ← ${flags.join(', ')}` : '';
    console.log(`${String(count).padStart(4)}  ${share.padStart(6)}  ${type}${suffix}`);
  }

  const unrendered = [...placeable].filter((t) => !rendered.has(t)).toSorted();
  const unprojected = [...placeable].filter((t) => !projected.has(t)).toSorted();
  const orphanComponents = [...rendered.keys()].filter((t) => !placeable.has(t)).toSorted();
  const orphanContent = [...usage.keys()].filter((t) => !rendered.has(t)).toSorted();

  const report = (title: string, items: string[], why: string) => {
    if (!items.length) {
      return;
    }
    console.log(`\n${title}`);
    console.log(`  ${why}`);
    for (const item of items) {
      console.log(`  ✗ ${item}`);
    }
  };

  /*
   * Orphan content is only a finding once the project has sections of its own.
   *
   * Straight after `/project-setup` there are zero components and the dataset may already be full of
   * content, so every published type is "orphaned". That is the starting position, not a defect, and
   * failing the audit on day one trains everyone to ignore it.
   */
  const hasSections = rendered.size > 0 || placeable.size > 0;

  report('Placeable but no component', unrendered, 'An editor can add these; the page renders nothing where they sit.');
  report('Placeable but not projected', unprojected, 'These render with every field undefined.');
  report('Component but not placeable', orphanComponents, 'Dead code — no way to put these on a page.');
  if (hasSections) {
    report('Published content with no component', orphanContent, 'Live pages are rendering nothing for these.');
  } else if (orphanContent.length) {
    console.log(
      `\n${orphanContent.length} published section type(s) have no component. Not reported — this project has no sections yet, so there is nothing to compare against.`
    );
  }

  if (unrendered.length || unprojected.length || orphanComponents.length || (hasSections && orphanContent.length)) {
    process.exit(1);
  }
  console.log('\nEvery section type is placeable, rendered and projected.');
};

/*
 * Wrapped, so a network failure is distinguishable from a finding.
 *
 * A bare top-level `await run()` exits 1 on a DNS blip — the same code used above for a real
 * registry mismatch. Any caller gating on the exit code could not tell "a placeable section has no
 * component" from "the wifi dropped". Exit 2 means the audit did not run.
 */
try {
  await run();
} catch (error) {
  console.error(`Audit could not run: ${(error as Error).message}`);
  process.exit(2);
}
