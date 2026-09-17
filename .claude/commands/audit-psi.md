# PageSpeed Insights Audit

Runs all four PSI category agents in parallel — **Performance**, **Accessibility**, **Best Practices**, and **SEO** — then consolidates findings into a prioritised action plan and applies fixes.

## Arguments

`$ARGUMENTS`

**Expected format:** A URL to audit, a file/directory path, or `--code` to scan the full codebase.

**Examples:**

- `/audit-psi https://example.com`
- `/audit-psi sections/HeroSection`
- `/audit-psi --code`

If no argument is provided, use `AskUserQuestion` to ask for a URL or target.

---

## Phase 1: Determine Audit Mode

Parse the argument:

1. **URL** (starts with `http`): Agents will call the PSI API for their category and also scan related code
2. **File/directory path**: Agents will scan the specified files for issues
3. **`--code`**: Agents will scan the entire codebase (`app/`, `sections/`, `components/`, `config/`, `tools/`)

If a URL is provided, first verify it's reachable:

```bash
curl -s -o /dev/null -w "%{http_code}" "URL" 2>/dev/null
```

If unreachable, inform the user and fall back to `--code` mode.

---

## Phase 2: Launch All 4 Agents (PARALLEL)

Launch all four agents **in a single message** so they run concurrently:

### 2a: `psi-performance` agent

Provide:

- Audit mode (URL or code paths)
- Target URL or file paths
- Instruction: "Audit only. Do not fix. Return your full findings report."

### 2b: `psi-accessibility` agent

Provide:

- Audit mode (URL or code paths)
- Target URL or file paths
- Instruction: "Audit only. Do not fix. Return your full findings report."

### 2c: `psi-best-practices` agent

Provide:

- Audit mode (URL or code paths)
- Target URL or file paths
- Instruction: "Audit only. Do not fix. Return your full findings report."

### 2d: `psi-seo` agent

Provide:

- Audit mode (URL or code paths)
- Target URL or file paths
- Instruction: "Audit only. Do not fix. Return your full findings report."

**Wait for all four agents to complete before proceeding.**

---

## Phase 3: Consolidate Findings

Merge all agent reports into a single prioritised list:

### 3a: Deduplicate

Some issues span categories (e.g., image alt text affects both Accessibility and SEO). Deduplicate by keeping the issue under its primary category and cross-referencing the secondary.

### 3b: Prioritise

Order all issues into a single list using this priority:

1. **Critical** — Issues that will directly fail a PSI audit or severely hurt scores
2. **Major** — Issues with significant score impact
3. **Minor** — Incremental improvements

Within each severity, order by estimated score impact (highest first).

### 3c: Generate Consolidated Report

```
## PageSpeed Insights Audit

**Target:** {URL or code paths}
**Mode:** {URL API + code / code only}
**Date:** {current date}

### Score Estimates (code-based)
| Category        | Estimated | Biggest Bottleneck |
|-----------------|-----------|-------------------|
| Performance     | {Poor/Needs Improvement/Good} | {description} |
| Accessibility   | {Poor/Needs Improvement/Good} | {description} |
| Best Practices  | {Poor/Needs Improvement/Good} | {description} |
| SEO             | {Poor/Needs Improvement/Good} | {description} |

### Critical Issues ({count})

1. **{Short description}** — {Category}
   - PSI Audit: {audit name}
   - File: {file path}:{line number}
   - Impact: {description}
   - Fix: {specific code change}

### Major Issues ({count})

1. ...

### Minor Issues ({count})

1. ...

### Quick Wins
{Top 5 fixes that are easy to implement and have highest combined impact across categories}

### Summary
- Total issues: {count} ({critical} critical, {major} major, {minor} minor)
- Categories affected: {list}
- Estimated effort: {description}
```

---

## Phase 4: Apply Fixes

After presenting the report, use `AskUserQuestion`:

**"Found {N} issues across {categories}. How would you like to proceed?"**

Options:

- **"Fix all"** — Apply all fixes in priority order (Critical → Major → Minor)
- **"Fix critical only"** — Apply only Critical severity fixes
- **"Fix critical and major"** — Apply Critical and Major fixes
- **"Don't fix"** — Stop here, leave the report for manual action

### Fix Process

If fixing:

1. Group fixes by file to minimise re-reads
2. Apply fixes in priority order
3. After all fixes, run `yarn fix && yarn ts:check`
4. If lint/type errors arise from fixes, resolve them
5. Report what was fixed:

```
### Fixes Applied

| # | Issue | Category | File | Status |
|---|-------|----------|------|--------|
| 1 | {description} | Performance | {file}:{line} | Fixed |
| 2 | {description} | SEO | {file}:{line} | Fixed |
| 3 | {description} | Best Practices | {file}:{line} | Needs manual action |

**Fixed:** {count}
**Needs manual action:** {count} (infrastructure, CMS content, or deployment changes)
**Skipped:** {count} (minor / low impact)
```

---

## Phase 5: Verify (if fixes were applied)

1. Run `yarn fix && yarn ts:check` one final time
2. If a URL was provided and the site is deployed, suggest re-running PSI after deployment
3. Report final status

---

## Summary

After completion, report:

- Total issues found per category
- Total fixes applied
- Items requiring manual attention (infrastructure, CMS, deployment)
- Suggestion to re-audit after deployment if applicable
