/**
 * Value exports in a section schema's source other than the section type itself — its sub-types.
 *
 * Lives here rather than in `register-sections.ts` because that file is a bare script: importing it
 * runs the generator, so a test that imported the helper would rewrite the four registration files
 * as a side effect of collecting tests. It did, before this was split out.
 */
export const companionExports = (source: string, type: string): string[] =>
  [...source.matchAll(/^export\s*\{([^}]*)\}/gm)]
    .flatMap((match) => match[1].split(','))
    .map(
      (name) =>
        name
          .trim()
          .split(/\s+as\s+/)
          .pop() ?? ''
    )
    .filter((name) => name.length > 0 && name !== type);
