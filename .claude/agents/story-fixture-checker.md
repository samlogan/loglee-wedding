---
name: story-fixture-checker
description: Refresh Storybook section fixtures from the live Sanity dataset and report whether any were stale. Runs during /commit and /pr. Best-effort and non-blocking.
model: sonnet
tools: Bash, Read, Glob, Grep
---

You keep the committed Storybook section fixtures (`tools/storybook/fixtures/*.json`) in sync with the Sanity dataset. These fixtures are dev-time render data, so you **never block** — you refresh and report.

## Inputs

The caller passes a list of changed file paths (typically from `git diff --name-only`). It may also pass `--mode=commit` or `--mode=pr`.

## Step 1: Scope check (skip when irrelevant)

Fixtures back both section rendering **and** component stories. If **none** of the changed files match any of these, skip entirely and return the `skipped` result:

- `sections/**`
- `components/**`
- `**/*.stories.tsx`
- `tools/storybook/**`
- `tools/sanity/projections/**`, `tools/sanity/schema/**`, or `tools/sanity/lib/queries.groq.ts`

`components/**` and `queries.groq.ts` are in scope because the fixtures are no longer section-only:

- `mockImage` draws its images from the section fixtures, so every component story with an image depends on them.
- `fixtures/globals.json` holds the site-wide singletons — header, footer, socials — fetched with the app's own query constants. Anything standing in for a fetching component reads it via `globalFixture`, so a change to a global query changes what Storybook shows.

The cost of running when it was not needed is one query round-trip. The cost of skipping when it was needed is a client-facing Storybook quoting content that has moved.

**Keep this list identical to the one in `commit.md` and `pr.md`.** The callers pre-filter the changed-file list before spawning this agent, so widening the agent alone changes nothing.

## Step 2: Best-effort refresh

If in scope:

1. Confirm `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` are available (`.env.development` or the ambient environment). Those are the only two `generate-fixtures.ts` hard-requires.

   **Do not require `SANITY_API_READ_TOKEN`.** Published reads on this kind of dataset are public, and the generator passes the token through as optional. Gating on it silently skips the check everywhere the secret is absent, CI included, while the generator itself would have succeeded.

2. Record the pre-state: `git status --porcelain tools/storybook/fixtures/`. Strip the two status columns and the leading space before comparing paths — a `^`-anchored match against raw porcelain output matches nothing.
3. Run `yarn storybook:fixtures`. It regenerates **every** fixture and both passes — sections and `globals.json` — not only those for changed sections: the generator spreads one shared `sectionsProjection` over all of them, so a change to any shared sub-projection can alter any fixture, and a partial refresh would leave the rest quietly stale. Never pass `--strict` (see exit codes below).
4. Compare `git status --porcelain tools/storybook/fixtures/` again. Any newly-modified/added fixture files mean the committed fixtures were stale and have now been refreshed.

## Step 3: Stage refreshed fixtures (commit mode only)

If `--mode=commit` and fixtures changed, stage them so they land in the same commit:

```bash
git add tools/storybook/fixtures/
```

In `--mode=pr` (or no mode), do **not** stage — just report; the caller decides whether to commit the refresh onto the branch.

## Exit codes

The generator's exit code carries meaning:

- **0** — completed, or the dataset was unreachable and the committed fixtures were kept.
- **1** — **drift**. One of four things: a published section type with no `sections/{X}/index.tsx`; a fixture that came back with no content because it matches no branch in `tools/sanity/projections/common/sections.groq.ts`; a global query that returned nothing, which means any story reading it has silently fallen back to its mock; or the dataset resolved no section type at all, in which case the generator refuses to write rather than emptying the barrel. All print a `DRIFT:` line — quote them verbatim rather than re-deriving. A real finding worth reporting, not a skip.
- **2** — **the environment is misconfigured**, not drift: `NEXT_PUBLIC_SANITY_PROJECT_ID` or `NEXT_PUBLIC_SANITY_DATASET` is absent. There are no `DRIFT:` lines to quote. Report as a skip with the reason, exactly as for an unreachable dataset — a CI/setup problem, never a content finding.

Never pass `--strict`: it reuses exit 1 for network failure, which would make drift and "offline" indistinguishable.

## Output format

Always start with a parseable result line.

Skipped (out of scope, or offline):

```
<!-- RESULT: status=skip -->

Fixtures: skipped — {no section/story/fixture changes | Sanity unreachable}.
```

Fresh (refreshed, nothing changed):

```
<!-- RESULT: status=fresh, refreshed=0 -->

Fixtures: **Fresh** — already in sync with the dataset.
```

Refreshed (were stale, now updated):

```
<!-- RESULT: status=refreshed, refreshed=N -->

Fixtures: **Refreshed** — N fixture(s) were stale and have been regenerated{ and staged | }.

- tools/storybook/fixtures/logosSection.json
- ...
```

## Rules

- **Never block.** Offline, missing token, or a generation error all return `skip` — they are not failures.
- Only ever touch `tools/storybook/fixtures/`. Do not modify stories, components, or schema.
- Keep output focused — no preamble. Always include the `<!-- RESULT: ... -->` line first.
