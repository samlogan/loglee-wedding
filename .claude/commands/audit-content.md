# Content Audit

**IMPORTANT: Before doing anything else, use the EnterPlanMode tool to enter plan mode. Explore the content sources, then present your audit plan for approval before producing the report.**

Audits all Sanity CMS content for placeholder text, missing SEO metadata, missing alt text, and incomplete pages. Generates a client-shareable report at `docs/audit-content.md`.

## Arguments

`$ARGUMENTS`

Optional flags:

- `--compare` — Show old site meta data alongside Sanity gaps (reads from `docs/screaming-frog.csv`)

---

## Step 1: Query Sanity Content

Use the Sanity MCP GROQ query tool to run 3 queries against the project dataset.

### Query 1: Pages

```groq
*[_type == "page" && !(_id in path("drafts.**"))]{
  _id,
  title,
  "pathname": pathname.current,
  seoData {
    seoTitle,
    seoDescription,
    "hasOgImage": defined(openGraphImage.asset)
  },
  "sectionCount": count(sections),
  "allTextSpans": sections[].body[]{ children[].text },
  "allImageAlts": sections[]{ "images": *[_type == "image"]{ altText } },
  sections[]{
    _type,
    "textSpans": array::compact([
      ...body[].children[].text,
      ...content[].children[].text,
      ...items[].body[].children[].text,
      ...items[].content[].children[].text,
      ...items[].title[].children[].text,
      title,
      subtitle,
      heading,
      description,
      label
    ]),
    "imageAlts": array::compact([
      image.altText,
      ...images[].altText,
      ...items[].image.altText
    ])
  }
}
```

### Query 2: Blog Posts

```groq
*[_type == "blogPost" && !(_id in path("drafts.**"))]{
  _id,
  title,
  "pathname": "/blog/" + slug.current,
  seoData {
    seoTitle,
    seoDescription,
    "hasOgImage": defined(openGraphImage.asset)
  },
  "hasFeatureImage": defined(featureImage.asset),
  "featureImageAlt": featureImage.altText,
  categories,
  publishDate,
  "sectionCount": count(sections),
  sections[]{
    _type,
    "textSpans": array::compact([
      ...body[].children[].text,
      ...content[].children[].text,
      title,
      subtitle,
      heading,
      description,
      label
    ]),
    "imageAlts": array::compact([
      image.altText,
      ...images[].altText,
      ...items[].image.altText
    ])
  }
}
```

### Query 3: Blog Landing

```groq
*[_type == "blogLanding" && !(_id in path("drafts.**"))][0]{
  _id,
  title,
  seoData {
    seoTitle,
    seoDescription,
    "hasOgImage": defined(openGraphImage.asset)
  }
}
```

> **Note:** Adapt query field names if the schema uses different names. The key goal is to pull all plain text content and image alt texts from every section.

---

## Step 2: Scan Codebase Config

Read `config/website.ts` and `config/metadata.ts`. Search for any values containing `PLACEHOLDER_`, `PLACEHOLDER`, `TODO`, or `TBD`.

---

## Step 3: Parse Old Site SEO Data (if `--compare`)

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
5. Re-run /audit-content --compare
```

### If present

Read the CSV and extract these columns:

- **Address** (URL)
- **Title 1** (page title)
- **Meta Description 1**
- **H1-1** (first H1)
- **Status Code**

Normalize the URL paths from the "Address" column (strip domain, lowercase, ensure leading `/`). Match against Sanity page pathnames for use in the report.

---

## Step 4: Audit Against 4 Categories

Analyse all queried content against these categories:

### Category 1: Placeholder Text

Search all text spans, titles, subtitles, descriptions, headings, and labels for:

- **Latin**: `lorem ipsum`, `dolor sit amet`, `consectetur adipiscing`, `sed do eiusmod`
- **Markers**: `TBD`, `TODO`, `PLACEHOLDER`, `[insert`, `[add`, `FIXME`, `XXX`
- **Dummy data**: `555-`, `example@`, `test@`, `john@`, `jane@`, `foo@`, `bar@`

Case-insensitive matching. Flag each match with the page pathname, section type, field name, and matched text snippet.

### Category 2: SEO Metadata

For every page and blog post, check:

- Missing `seoTitle` → **issue**
- Missing `seoDescription` → **issue**
- Missing `openGraphImage` → **warning**
- `seoTitle` longer than 60 characters → **warning**
- `seoDescription` longer than 160 characters → **warning**

### Category 3: Alt Text

Check all images across sections:

- Section images without `altText` → **issue**
- Blog feature images without `altText` → **issue**

### Category 4: Incomplete Content

- Pages with 0 sections → **issue**
- Blog posts without a feature image → **warning**
- Blog posts with 0 sections → **issue**
- Blog posts without a publish date → **warning**

---

## Step 5: Generate Report

Create the `docs/` directory if it doesn't exist. Save report to `docs/audit-content.md`.

### Report Format

```markdown
# Content Audit Report

> **Generated:** {today's date YYYY-MM-DD} | **Pages:** {count} | **Blog Posts:** {count}

## Summary

| Category           | Issues  | Warnings |
| ------------------ | ------- | -------- |
| Placeholder Text   | {n}     | —        |
| SEO Metadata       | {n}     | {n}      |
| Alt Text           | {n}     | —        |
| Incomplete Content | {n}     | {n}      |
| **Total**          | **{n}** | **{n}**  |

## Issues by Page

### {Page pathname}

| Category   | Field   | Detail                        | Action        |
| ---------- | ------- | ----------------------------- | ------------- |
| {category} | {field} | {matched text or description} | {what to fix} |

{repeat for each page with issues}

## SEO Migration Reference

> Only included when run with `--compare` flag.

| Page   | Old Title   | Sanity Title                   | Old Description | Sanity Description            | Status     |
| ------ | ----------- | ------------------------------ | --------------- | ----------------------------- | ---------- |
| {path} | {old title} | {sanity title or "⚠️ Missing"} | {old desc}      | {sanity desc or "⚠️ Missing"} | {✅ or ⚠️} |

## Config Placeholders

| File   | Line   | Value               |
| ------ | ------ | ------------------- |
| {file} | {line} | {placeholder value} |

If none: "No placeholder values found in config files."

## How to Fix

- **CMS issues** (placeholder text, SEO metadata, alt text, incomplete content): Fix directly in [Sanity Studio](/studio)
- **Config placeholders**: Update the values in the codebase files listed above
```

---

## Step 6: Display Summary

After saving the report, display a summary:

```
Content audit complete.

{n} issues, {n} warnings across {page count} pages and {post count} blog posts.

Report saved to docs/audit-content.md
```
