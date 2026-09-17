// Layout audit: which spacing steps and container widths the sections actually use.
//
// Run with: yarn audit:layout
//
// Answers two questions a token file cannot: which steps of the scale have real users, and whether a
// section's own `spacing` prop actually takes effect.
//
// **CLI output, not a Storybook page.** The Foundations/Design System pages describe the system;
// judgements like "this step has no users" live here.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

/**
 * Where a helper spreads default props, a component's own prop only wins when written **after** the
 * spread:
 *
 *   <Section spacing="xs" {...getSectionSpacingProps(props)}>   ← dead: the spread overwrites it
 *   <Section {...getSectionSpacingProps(props)} spacing="xs">   ← wins
 *
 * The anchor is the spread itself, not the import. Anchoring on the import makes the check vacuous:
 * every file that uses the helper imports it, so every prop would count as "after".
 */
const SPREAD_ANCHOR = '{...getSectionSpacingProps';

interface Row {
  section: string;
  spacing: string | null;
  width: string | null;
  afterSpread: boolean | null;
  analysable: boolean;
}

const readSectionDirs = (dir: string) => {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    // No `sections/` at all. `/project-setup` empties it on a new project, so this is a normal
    // state, not a failure — there is simply nothing to analyse yet.
    return [];
  }
};

const rows: Row[] = [];

for (const entry of readSectionDirs(join(root, 'sections'))) {
  if (!entry.isDirectory()) {
    continue;
  }
  let src: string;
  try {
    src = readFileSync(join(root, 'sections', entry.name, 'index.tsx'), 'utf8');
  } catch {
    continue;
  }

  const spacingMatch = src.match(/\sspacing=\{?(\[[^\]]*\]|['"][a-z]+['"])/);
  const widthMatch = src.match(/\scontainerWidth=\{?['"]([a-z]+)['"]/);
  const spreadIndex = src.indexOf(SPREAD_ANCHOR);

  /*
   * Fails **closed**. If the anchor is not found — a multi-line spread, or a formatter that emits
   * `{ ...getSectionSpacingProps` — the file is reported as unanalysable rather than assumed to be
   * fine. Assuming `afterSpread: true` on a miss is exactly the vacuousness the anchor was chosen to
   * avoid, just relocated from the import to the brace.
   */
  const usesHelper = src.includes('getSectionSpacingProps');
  const analysable = !usesHelper || spreadIndex !== -1;

  rows.push({
    section: entry.name,
    spacing: spacingMatch ? spacingMatch[1].replaceAll(/['"]/g, '') : null,
    width: widthMatch ? widthMatch[1] : null,
    afterSpread: spacingMatch && spreadIndex !== -1 ? (spacingMatch.index ?? 0) > spreadIndex : null,
    analysable
  });
}

console.log('Layout usage across sections/');
console.log('='.repeat(72));

const tally = (label: string, values: (string | null)[]) => {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value ?? '(inherits default)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  console.log(`\n${label}`);
  for (const [key, count] of [...counts].toSorted((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)}  ${key}`);
  }
};

tally(
  'Section spacing',
  rows.map((r) => r.spacing)
);
tally(
  'Container width',
  rows.map((r) => r.width)
);

const dead = rows.filter((r) => r.afterSpread === false);
const unanalysable = rows.filter((r) => !r.analysable);

if (dead.length) {
  console.log('\nSpacing prop written BEFORE the spread — dead code, the spread overwrites it:');
  for (const r of dead) {
    console.log(`  ✗ ${r.section} — spacing="${r.spacing}" never applies`);
  }
}

if (unanalysable.length) {
  console.log('\nCould not locate the spread anchor, so these were not analysed:');
  for (const r of unanalysable) {
    console.log(`  ? ${r.section} — expected \`${SPREAD_ANCHOR}\` on one line`);
  }
}

if (dead.length || unanalysable.length) {
  process.exit(1);
}

console.log(`\n${rows.length} section(s) analysed, no dead spacing props.`);
