/*
 * The four registrations a section needs, checked at build time rather than by eye.
 *
 * A section is only wired up when it appears in four places (CLAUDE.md § Section Architecture), and
 * every half-registration fails *silently*:
 *
 *   schema/index.ts missing       → the Studio throws "Unknown type" on every render of the document
 *                                   that references it. The route still serves HTTP 200, so nothing
 *                                   short of opening the Studio finds it.
 *   helpers/sections.ts missing   → no way to place it on a page
 *   sections/index.ts missing     → the page renders a dev-only placeholder and, in production, null
 *   sections.groq.ts missing      → it renders with every field undefined
 *
 * `yarn audit:sections` covers the middle two and the projection, but it queries the dataset and
 * exits 2 when that is unreachable — so it cannot be the only guard. These run offline.
 */

import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSchema } from 'sanity';
import { describe, expect, it } from 'vitest';

import * as sectionsLibrary from '@/sections';
import { toCapitalise } from '@/tools/helpers/string';
import { pageSections } from '@/tools/sanity/helpers/sections';
import sectionsProjection from '@/tools/sanity/projections/common/sections.groq';

import schema from '.';

/** `createSchema` never throws — it collects problems here, which is why they are so easy to miss. */
interface CompiledSchema {
  _validation?: { path?: { name?: string }[]; problems?: { severity?: string; message?: string }[] }[];
}

const errorsIn = (types: unknown[]) =>
  ((createSchema({ name: 'default', types: types as never }) as unknown as CompiledSchema)._validation ?? []).flatMap(
    (entry) =>
      (entry.problems ?? [])
        .filter((problem) => problem.severity === 'error')
        .map(
          (problem) =>
            `${(entry.path ?? [])
              .map((p) => p?.name)
              .filter(Boolean)
              .join('.')}: ${problem.message}`
        )
  );

describe('Sanity schema', () => {
  it('compiles with no errors', () => {
    expect(errorsIn(schema)).toEqual([]);
  });

  it('reports a dangling type reference — the negative control for the test above', () => {
    /*
     * Without this, a `_validation` key that Sanity renamed would make the assertion above pass on
     * an empty array forever. A checker that can never fire is worse than none, so this proves the
     * one above is live by feeding it the exact failure it exists to catch.
     */
    const errors = errorsIn([
      ...schema,
      { name: 'danglingProbe', type: 'object', fields: [{ name: 'ghost', type: 'deletedSectionType' }] }
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Unknown type: deletedSectionType.');
  });
});

describe('section registrations', () => {
  const placeable = pageSections.map((section) => section.type);

  it.each(placeable)('%s is registered in the schema', (type) => {
    expect(schema.map((definition) => definition.name)).toContain(type);
  });

  it.each(placeable)('%s has a component exported from sections/index.ts', (type) => {
    /*
     * `toCapitalise`, because that is exactly how `components/Sections` resolves a `_type` to a
     * component — a lookup on the barrel's exported names. Recomputing the name here rather than
     * reading the folder is the point: the folder can exist while the barrel export is missing.
     */
    expect(sectionsLibrary).toHaveProperty(toCapitalise(type));
  });

  it.each(placeable)('%s is projected in sections.groq.ts', (type) => {
    /*
     * Matched against the *built* projection string — the only artefact that cannot disagree with
     * what production actually sends. Quote-agnostic and whitespace-tolerant, so a section written
     * with double quotes is not reported as unprojected; `audit-sections.ts` reads it the same way.
     */
    expect(sectionsProjection).toMatch(new RegExp(`_type\\s*==\\s*['"]${type}['"]`));
  });
});

describe('section folders', () => {
  /*
   * The reverse of the checks above, and the direction a new section actually fails in.
   *
   * Those assert that everything *registered* has its files. This asserts that everything with files
   * is *registered* — because creating the folder is the step you remember and editing four
   * unrelated lists is the step you don't. `yarn sections:register` writes all four from this same
   * folder listing, so a failure here means it has not been run.
   */
  const folders = readdirSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'sections'), {
    withFileTypes: true
  })
    .filter((entry) => entry.isDirectory() && /^[A-Z][A-Za-z0-9]*Section$/.test(entry.name))
    .map((entry) => entry.name);

  it('finds at least one section folder — the negative control for the cases below', () => {
    /* `it.each([])` reports zero tests and passes, so a wrong path would silently assert nothing. */
    expect(folders.length).toBeGreaterThan(0);
  });

  it.each(folders)('%s is registered — run `yarn sections:register` if this fails', (folder) => {
    const type = folder.charAt(0).toLowerCase() + folder.slice(1);
    expect(pageSections.map((section) => section.type)).toContain(type);
  });
});
