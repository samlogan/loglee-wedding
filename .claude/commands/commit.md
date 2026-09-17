# Commit

Commit pending changes with clear, conventional commit messages — grouped logically into separate commits when appropriate.

## Arguments

`$ARGUMENTS`

Optional: a commit message hint or description. If provided, use it to inform the commit message(s).

---

## No interactive prompts

---

## Step 1: Analyse Changes

1. Run `git status` to see all staged, unstaged, and untracked changes
2. Run `git diff` to see unstaged changes
3. Run `git diff --cached` to see already-staged changes
4. Run `git log --oneline -5` to see recent commit style

If there are no changes to commit, inform the user and stop.

---

## Step 2: Group Changes into Logical Commits

Review all changed files and group them into **separate commits** when the changes span distinct concerns. Each commit should represent one logical unit of work.

### Grouping rules

- **Separate by feature/concern**: e.g., schema changes in one commit, component changes in another, config changes in a third
- **Keep related files together**: a component + its styles + its types = one commit. A schema + its registration in 4 files = one commit.
- **Separate cleanup from features**: dead code removal, dependency changes, or formatting fixes should be their own commit
- **Config changes**: `.claude/`, `package.json`, linting config, etc. — group together unless they're directly tied to a feature
- **Commands/docs**: slash command files (`.claude/commands/`) can be grouped together if they're part of the same initiative

### When to use a single commit

- All changes are tightly related to one task
- The total diff is small (< ~5 files, all related)
- The user provided a specific commit message hint that covers everything

### Example groupings

If you see changes to a schema, a component, a config file, and a command file:

1. Commit 1: schema + registration files → "Add testimonial section schema"
2. Commit 2: component + styles + query → "Add testimonial section component"
3. Commit 3: config changes → "Update site config for testimonial support"
4. Commit 4: command file → "Add /audit-schema command"

---

## Step 2.5: Story-Freshness Check

Before staging, run the story-freshness check on the changed files. This catches developers who edited a component or section without updating its Storybook story.

1. Build the list of changed files with **exactly this command**:

   ```bash
   { git diff --no-renames --name-only --diff-filter=AM HEAD; git ls-files --others --exclude-standard; } \
     | grep -E '^(components|sections)/.*/index\.tsx?$' | sort -u
   ```

   Four details are load-bearing, each found by a failure:
   - **Not `git status --porcelain`.** It prefixes every path with two status columns and a space, so a `^`-anchored regex matches **nothing** and this gate silently passes on every branch.
   - **`--no-renames`.** `--diff-filter=AM` drops rename entries, so a renamed `index.tsx` never reaches the checker. `--no-renames` splits a rename into a delete plus an add.
   - **`.*` not `[^/]+`.** Nested components (`components/TextBlock/CtaBox/index.tsx`) live below the top level.
   - **`index\.tsx?`** so `index.ts` barrels are included, and a single backslash — `\\.` is a literal backslash in ERE and matches nothing.

   Keep this command byte-identical in `pr.md` and `.claude/agents/story-freshness-checker.md`. It has three homes and they must not drift.

2. If the list is empty, skip this step
3. Otherwise, spawn the `story-freshness-checker` agent with the list as input
4. Parse the `<!-- RESULT: ... -->` line from the agent's response

### If `status=pass`

Continue to Step 3 without comment.

### If `status=fail` with `missing` entries

For each missing story, **auto-generate a minimal Default story** by following the template in `.claude/commands/create-component.md` (Step 3) or `.claude/commands/create-section.md` (Step 2e). Read the source file's props interface and:

- Components: emit `components/{Name}/{Name}.stories.tsx` with a `Default` story plus one story per union literal
- Sections: emit `sections/{Name}Section/{Name}Section.stories.tsx` with a `Default` story composed from the appropriate `@/tools/storybook/` mock helpers

After auto-generating, add the new story file(s) to the same commit group as the source file (Step 2).

### If `status=fail` with `stale` entries

Surface the prop diff to the user inline. Do NOT auto-regenerate — stale stories are nuanced (a renamed literal vs an added one needs different handling). Print:

```
Stale stories detected:
- {file} — {reason}

Suggested fix: {actionable hint from the agent's output}

Proceed with commit anyway? The /pr command will surface these warnings again but will not block on stale stories.
```

If the user says yes, continue; if no, stop and let them fix manually.

**Never hard-block at /commit time** — the goal is fix-or-defer, not friction.

---

## Step 2.6: Fixture-Freshness Refresh

Storybook fixtures (`tools/storybook/fixtures/*.json`, including `globals.json`) are pulled from the Sanity dataset and can drift as content changes. Keep them current as part of the commit.

1. If none of the changed files touch any of these, skip this step:
   - `sections/**`
   - `components/**`
   - `**/*.stories.tsx`
   - `tools/storybook/**`
   - `tools/sanity/projections/**`, `tools/sanity/schema/**`, or `tools/sanity/lib/queries.groq.ts`

   **Keep this list identical to the one in `story-fixture-checker.md` and `pr.md`.** This caller pre-filters before spawning the agent, so widening the agent alone changes nothing. `components/**` is in scope because `mockImage` draws from the section fixtures and the global mocks read `globals.json`.

2. Otherwise spawn the `story-fixture-checker` agent with the changed-file list and `--mode=commit`.
3. Parse the `<!-- RESULT: ... -->` line:
   - `status=skip` or `status=fresh` → continue silently.
   - `status=refreshed` → the agent regenerated and staged the updated fixtures; fold them into the relevant commit group (Step 2) and note it in the commit body.

This is **best-effort and non-blocking** — if Sanity is unreachable or there's no token, the agent skips and the commit proceeds with the committed fixtures.

---

## Step 2.7: Story-Group Guard

Run `yarn audit:groups`. It is deterministic and takes about a second — no agent needed.

**A non-zero exit hard-blocks the commit.** Two things it catches:

- A story title using an unknown sidebar group (a typo like `Componets/`).
- A section story that has lost its `Sections/` prefix. That one is not cosmetic: `tools/storybook/sectionStory.tsx` gates theme injection, the error boundary and the full-width docs preview on `title.startsWith('Sections/')`, so the section silently stops being themed at runtime with nothing to indicate why.

Fix the title and re-run. The guard also fails on a story file whose title it cannot parse — that is deliberate, not a bug to work around.

---

## Step 2.8: Test-Freshness Check

Catches logic that changed without a test asserting what it should do. Components and sections are
out of scope here — their story _is_ their test under the `storybook` Vitest project.

1. Build the list of changed files:

   ```bash
   { git diff --no-renames --name-only --diff-filter=AM HEAD; git ls-files --others --exclude-standard; } \
     | grep -E '^tools/.*\.tsx?$' | grep -vE '\.test\.tsx?$|\.d\.ts$|^tools/storybook/fixtures/' | sort -u
   ```

   Keep this list identical to the scope in `.claude/agents/test-freshness-checker.md` and to the one
   in `pr.md`. The agent does its own testability check, so a narrower filter here silently disables
   it for the cases only the agent knows about.

   `.tsx?` rather than `.ts`, for that exact reason. The filter was `.ts$` on the first pass, which
   contradicted the sentence above it: `tools/storybook/sectionStory.tsx` branches on
   `title.startsWith('Sections/')` to gate theming, the error boundary and the docs preview, and the
   agent never saw it. Let the agent decide — it skips Studio UI and presentational helpers by rule.

2. Run `yarn test:unit` **unconditionally**, before anything else in this step. It takes well under a
   second, so every commit is gated on it — including commits that touch no `tools/` file at all, since
   a change anywhere can break a helper's test. If it fails, stop and report; do not commit a red suite.
3. If the list from step 1 is empty, skip the rest of this step — there is nothing for the agent to
   check. **Only the agent is skipped, never the suite.**
4. Otherwise spawn the `test-freshness-checker` agent with the list as input.
5. Parse the `<!-- RESULT: ... -->` line.

### If `status=pass`

Continue to Step 3 without comment.

### If `status=fail`

**Do not auto-generate tests the way Step 2.5 auto-generates stories.** A story is a fixture — it
renders, and generating one is harmless. A test is a claim. Assertions written by running a function
and recording its output turn a broken function into a passing test that documents the break.

Instead, surface the gaps and offer:

```
Untested logic:
- PATH — missing test, or the exports with no reference in its test file

I can write these now, deriving cases from each module's documented intent and edge cases.
Write them, or commit and defer?
```

If the user says write them, do so and fold them into the same commit group. If defer, continue —
`/pr` will surface it again and will block there.

**Never hard-block at /commit time** — fix-or-defer, not friction.

---

## Step 3: Stage and Commit Each Group

For each logical group, in order:

### 3a. Stage files

- Add files by name — use `git add <file1> <file2>`, never `git add .` or `git add -A`
- Do NOT stage files that likely contain secrets (`.env`, `.env.development`, `.env.production`, `credentials.json`, etc.)
- Do NOT stage `.claude/settings.local.json` — this is user-specific
- Do NOT stage `yarn.lock` unless dependency changes were made (package.json modified)
- If secret files are the only changes, warn the user and stop

### 3b. Write commit message

- **First line**: imperative mood, under 72 characters, summarises the "why" (e.g., "Add user avatar component" not "Added files")
- **Body** (optional): if the change is non-trivial, add a blank line then a brief explanation of what changed and why
- Use conventional descriptions: "Add" (new feature), "Update" (enhancement), "Fix" (bug fix), "Remove" (deletion), "Refactor" (restructure)
- **Do NOT add Co-Authored-By lines**
- **Do NOT add emoji prefixes**

### 3c. Commit

```bash
git commit -m "$(cat <<'EOF'
Commit message here
EOF
)"
```

Repeat for each group.

---

## Step 4: Push

Push the branch to the remote:

```bash
git push -u origin HEAD
```

---

## Step 5: Confirm

Run `git log --oneline -{N}` (where N = number of commits created) and report all new commit hashes and messages to the user.
