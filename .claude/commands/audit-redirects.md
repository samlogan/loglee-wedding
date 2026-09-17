# Redirect Audit

**IMPORTANT: Before doing anything else, use the EnterPlanMode tool to enter plan mode. Explore the redirect and URL sources, then present your audit plan for approval before producing the report.**

Compares old site URLs (from a Screaming Frog CSV export) against Sanity pages and existing redirects, then proposes missing 301 redirects. Generates a client-shareable report at `docs/audit-redirects.md`.

## Arguments

`$ARGUMENTS`

---

## Step 1: Get Old Site URLs

Check if `docs/screaming-frog.csv` exists.

### If missing

Display these instructions and **stop**:

```
⚠️  docs/screaming-frog.csv not found.

To create this file:
1. Open Screaming Frog SEO Spider
2. Crawl the old/existing site
3. Go to File → Export → Internal → All (CSV format)
4. Save as docs/screaming-frog.csv in the project root
5. Re-run /audit-redirects
```

### If present

Read the CSV. Extract these columns:

- **Address** (full URL)
- **Status Code**
- **Title 1** (page title)
- **Meta Description 1**

Filter to rows where:

- Status Code is `200`
- The URL is an HTML page (not a CSS, JS, image, font, or other asset file — filter by file extension or content type column if available)

Normalize each URL path: strip the domain, lowercase, ensure leading `/`, strip trailing slashes (except `/` itself), remove query strings and fragments. Deduplicate.

---

## Step 2: Query Sanity

Use the Sanity MCP GROQ query tool to run 2 queries:

### Query 1: All document pathnames

```groq
*[_type in ["page", "blogPost", "blogLanding"] && !(_id in path("drafts.**"))]{
  _type,
  title,
  "pathname": select(
    _type == "blogPost" => "/blog/" + slug.current,
    _type == "blogLanding" => "/blog",
    pathname.current
  )
}
```

### Query 2: Sanity redirects (if the schema supports it)

```groq
*[_type == "settings" && _id == "settings"][0].redirectsArr[]{
  source,
  destination,
  permanent
}
```

> If the redirects query returns null/empty, that's fine — it just means no CMS-level redirects exist yet.

---

## Step 3: Read Hardcoded Redirects

Read `config/redirects.ts` and extract any redirect entries (source → destination mappings). Normalize their paths the same way as old site URLs.

---

## Step 4: Compare URLs

For each old site URL path, categorise it:

### Covered

The path matches a Sanity page pathname (after normalization). This means the page exists at the same URL — no redirect needed.

Also treat `/home`, `/home/`, and `/index.html` as covered by `/`.

### Redirected

A redirect already exists for this path — either in Sanity redirects or in `config/redirects.ts`.

### Missing

No page exists at this path and no redirect is configured. For each missing URL:

1. **Suggest a destination** by finding the most similar Sanity pathname (by path segments, common words in title, or path similarity)
2. If no good match is found, suggest `/` as the fallback destination
3. Add a note explaining the suggestion rationale (e.g., "similar path", "title match", "no close match — defaulting to homepage")

---

## Step 5: Generate Report

Create the `docs/` directory if it doesn't exist. Save report to `docs/audit-redirects.md`.

### Report Format

````markdown
# Redirect Audit Report

> **Generated:** {today's date YYYY-MM-DD} | **Old Site URLs:** {total count}

## Summary

| Status                   | Count   |
| ------------------------ | ------- |
| ✅ Covered (page exists) | {n}     |
| ↪️ Already Redirected    | {n}     |
| ⚠️ Missing Redirect      | {n}     |
| **Total**                | **{n}** |

## Missing Redirects

These old site URLs have no corresponding page or redirect. Review and approve the suggested destinations.

| Old URL    | Suggested Destination | Type | Notes       |
| ---------- | --------------------- | ---- | ----------- |
| {old path} | {suggested path}      | 301  | {rationale} |

## Already Covered

These old site URLs already have a matching page in Sanity.

| Old URL    | Sanity Page    | Type     |
| ---------- | -------------- | -------- |
| {old path} | {sanity title} | {\_type} |

## Already Redirected

These old site URLs already have redirects configured.

| Old URL    | Destination   | Source                         |
| ---------- | ------------- | ------------------------------ |
| {old path} | {destination} | {Sanity / config/redirects.ts} |

## Proposed Implementation

### Option A: Add to Sanity Studio

Add the following redirects in Sanity Studio under Settings → Redirects:

| Source   | Destination   | Permanent |
| -------- | ------------- | --------- |
| {source} | {destination} | Yes       |

### Option B: Add to config/redirects.ts

```ts
// Redirects from old site audit — {today's date}
{ source: '{source}', destination: '{destination}', permanent: true },
```
````

```

---

## Step 6: Ask User

Use `AskUserQuestion` to ask the user how they'd like to proceed:

1. **"Add to config/redirects.ts"** — Append the missing redirects to the hardcoded redirects array in `config/redirects.ts`
2. **"Export report only"** — Just keep the report at `docs/audit-redirects.md`, no code changes
3. **"Let me review first"** — Do nothing further, let the user review the report

> Note: Only offer "Add to Sanity redirects" if the Sanity schema supports a redirects array (i.e., the redirects query in Step 2 returned results or the schema has a redirects field).

If the user chooses to add to `config/redirects.ts`, read the current file, append the new redirect entries in the correct format, and save.

---

## Step 7: Display Summary

After saving the report (and optionally implementing redirects), display:

```

Redirect audit complete.

{covered} covered | {redirected} already redirected | {missing} missing

Report saved to docs/audit-redirects.md

```

```
