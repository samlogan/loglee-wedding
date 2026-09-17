# Schema Audit

**IMPORTANT: Before doing anything else, use the EnterPlanMode tool to enter plan mode. Explore the schema files, then present your audit plan for approval before producing the report.**

Audit JSON-LD structured data schemas for correctness and alignment with Google/schema.org best practices. Reads schema source files and validates against current guidelines — no build required.

## Arguments

`$ARGUMENTS`

Optional flags:

- `--fix` — Auto-fix issues found (apply code changes)

---

## No interactive prompts

---

## Step 1: Read All Schema Files

Read every file in `components/JsonLd/`:

1. **Schema functions:** all files in `components/JsonLd/schemas/` (e.g., `article.ts`, `webPage.ts`, `organization.ts`, `webSite.ts`, `listItem.ts`, `breadcrumbList.ts`, `faqPage.ts`)
2. **Consumer components:** `components/JsonLd/JsonLdPage/index.tsx`, `components/JsonLd/JsonLdArticle/index.tsx`, and any other `JsonLd*` component directories
3. **Config:** `config/website.ts` (site identity data used by schemas — also reveals site description / domain)
4. **Index:** `components/JsonLd/index.tsx` (exports)

Read **every** document type schema (not just blog/page) so Step 3 can reason about the site's domain:

- All files in `tools/sanity/schema/documents/*.ts`
- Scan `app/(frontend)/**/page.tsx` for route patterns that signal page types (e.g. `/designs/[slug]`, `/properties/[id]`, `/courses/[slug]`)
- If clarity is needed, peek at a couple of seeded documents via `sanityFetch` or the Studio

---

## Step 2: Validate Against 8 Check Categories

For each check, assign one of:

- **Pass** — meets best practice
- **Fail** — violates best practice (include specific fix)
- **Warning** — potential issue, needs manual review
- **N/A** — does not apply

### Category 1: Universal Schema Types

Verify these baseline schema types exist and are rendered. They apply to nearly every website:

- `Organization` — on all pages
- `WebSite` — on all pages (or at minimum the homepage)
- `WebPage` — on all standard pages
- `Article` — on blog post pages (if blog exists)
- `BreadcrumbList` — on all pages
- `FAQPage` — where FAQ content exists

**Domain-appropriate schemas are checked separately in Step 3.**

### Category 2: @context Usage

- Only root-level schema objects should have `@context: 'https://schema.org'`
- Sub-objects (e.g., `ListItem` inside `BreadcrumbList`, `ImageObject` inside `Article`) must NOT have `@context`
- Check return types: root schemas use `WithContext<T>`, sub-objects use just `T`

### Category 3: @id Graph Linking

Best practice is a connected entity graph using `@id` references:

- `Organization` has `@id: '{siteUrl}/#organization'`
- `WebSite` has `@id: '{siteUrl}/#website'`
- `WebPage` has `@id: '{pageUrl}#webpage'`
- `Article` has `@id: '{articleUrl}#article'`
- Cross-references use `{ '@id': '...' }` (not duplicated inline data)
- `WebPage.isPartOf` references `WebSite` `@id`
- `WebSite.publisher` references `Organization` `@id`
- `Article.publisher` and `Article.author` reference `Organization` `@id`
- `WebPage.author`, `copyrightHolder`, `creator` reference `Organization` `@id` (not `Person` for company sites)

### Category 4: Organization Schema

- Has `name`, `url`, `logo`, `sameAs`
- `logo` is an `ImageObject` (not a plain URL string) with `url`, `width`, `height`
- Has `description`
- `legalName` present if different from `name`

### Category 5: Article Schema

- Has `headline`, `description`, `datePublished`, `dateModified`, `image`, `author`, `publisher`
- `author` is `Organization` reference (for company blogs) or `Person` with `name` and `url`
- `mainEntityOfPage` is set to the canonical URL
- `publisher` references `Organization` via `@id`
- Optional recommended fields: `wordCount`, `articleSection`

### Category 6: WebPage Schema

- Has `headline`, `description`, `inLanguage`, `datePublished`, `dateModified`, `image`
- `author`, `copyrightHolder`, `creator` reference `Organization` (not `Person` for company sites)
- `copyrightYear` uses document creation year (not runtime `new Date().getFullYear()`)
- `isPartOf` references `WebSite`
- `mainEntityOfPage` is set

### Category 7: BreadcrumbList Schema

- Root `BreadcrumbList` has `@context`, individual `ListItem` entries do not
- Always starts with Home (`position: 1`)
- Page breadcrumbs include the current page as the last crumb (not just Home)
- Article breadcrumbs include intermediate "Blog" crumb: Home → Blog → Article
- Positions are sequential (1, 2, 3...)
- Each item has `name` and `item` (URL)

### Category 8: Data Completeness

- All schemas pull from `config/website.ts` consistently (same `siteName`, `siteUrl`, etc.)
- `description` from website config is used where needed
- Image URLs are absolute (not relative paths)
- Date fields use ISO 8601 format
- No hardcoded placeholder values in schema output
- Unused props or dead code in schema functions

---

## Step 3: Domain-Specific Schema Recommendations

This step is open-ended reasoning, not a lookup. The goal is to propose schema.org types appropriate to **this specific site** based on what its content models reveal about the business — using the full schema.org type hierarchy, not a fixed list.

### How to reason

1. **Read every document type** in `tools/sanity/schema/documents/` and any route patterns from Step 1.
2. **Infer what the business is and does.** Treat the document types, route names, settings copy, and site description in `config/website.ts` as evidence. What products or services does it offer? Is it a marketplace, a service business, a publication, a B2B SaaS, an accommodation provider, an education provider, a non-profit, a clinic, a bank, a real estate listing, a transport operator? Be specific.
3. **For each piece of evidence, walk the schema.org hierarchy** and propose the most specific applicable type. Always prefer subtypes over their parents when they fit — `House` over `Product`, `Hospital` over `LocalBusiness`, `Recipe` over `CreativeWork`, `Course` over `Thing`. Schema.org has hundreds of types; the table below is **illustrative, not exhaustive**. Propose anything from schema.org that genuinely fits, even if it's not in this list.
4. **Cross-reference with what's already implemented** in `components/JsonLd/schemas/`. Don't recommend something that already exists.
5. **For each recommendation, state:**
   - The schema.org type (and subtype path, e.g. `Thing > Product > House`)
   - Which document type(s) or routes triggered it
   - Why this subtype over a more generic ancestor
   - Which page(s) should render it
   - A suggested function filename in `components/JsonLd/schemas/`
   - Required and recommended fields from the doc type that map to schema.org fields

### Illustrative mapping (examples — NOT a closed list)

| Doc-type / page signal                  | Likely schema.org type                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `product`, `item`, `sku`                | `Product` (or `IndividualProduct`, `ProductGroup`)                                                     |
| `design`, `model`, `home`, `floorPlan`  | `Product` or `House` / `Residence` / `Apartment`                                                       |
| `accommodation`, `room`, `stay`         | `LodgingBusiness` / `Hotel` / `BedAndBreakfast` + `Accommodation`                                      |
| `property`, `listing` (real estate)     | `RealEstateListing` + `Residence`                                                                      |
| `recipe`                                | `Recipe`                                                                                               |
| `event`, `session`, `class`             | `Event` / `EducationEvent` / `BusinessEvent`                                                           |
| `course`, `lesson`, `module`            | `Course` / `LearningResource`                                                                          |
| `job`, `vacancy`, `position`            | `JobPosting`                                                                                           |
| `service`, `treatment`                  | `Service` / `MedicalProcedure` / `FinancialProduct`                                                    |
| `location`, `branch`, `clinic`, `store` | `LocalBusiness` (+ specific subtype: `Dentist`, `Restaurant`, `BankOrCreditUnion`, `AutoDealer`, etc.) |
| `review`, `testimonial`, `rating`       | `Review` / `AggregateRating`                                                                           |
| `faq`, `question`                       | `FAQPage` (already covered in Category 1)                                                              |
| `howTo`, `guide`, `tutorial`            | `HowTo` / `HowToStep`                                                                                  |
| `video`, `podcast`, `episode`           | `VideoObject` / `PodcastEpisode`                                                                       |
| `book`, `chapter`                       | `Book` / `Chapter`                                                                                     |
| `person`, `author`, `staff`             | `Person` (where surfaced publicly)                                                                     |
| `vehicle`, `car`                        | `Vehicle` / `Car` / `Motorcycle`                                                                       |
| `software`, `app`, `tool`               | `SoftwareApplication` / `MobileApplication` / `WebApplication`                                         |

Use this table as a hint, then **think beyond it**. If the site has `clinicalTrial`, propose `MedicalStudy`. If it has `flight`, propose `Flight`. If it has `dataset`, propose `Dataset`. If nothing matches, say so.

### Confidence levels

For each recommendation, tag confidence:

- **Strong** — clear 1:1 mapping; should be implemented
- **Likely** — fits the content model but worth confirming with the team
- **Speculative** — possible based on a few signals; offered for consideration

---

## Step 4: Generate Structured Report

Output the report in this format:

```
## JSON-LD Schema Audit

**Files Analyzed:** {list of files read}
**Inferred Site Domain:** {one-sentence description, e.g. "CLT timber homes manufacturer with a consultant-driven quote tool and editorial blog"}

### Overall: {X}/{total} passed, {Y} failed, {Z} warnings · {N} domain recommendations

### 1. Universal Schema Types
| # | Check                    | Status | Details                                        |
|---|--------------------------|--------|------------------------------------------------|
| 1 | Organization rendered    | Pass   | Rendered on all pages via JsonLdPage/Article   |
| 2 | WebSite rendered         | Pass   | Rendered on all pages                          |

### 2. @context Usage
| # | Check                    | Status | Details                                        |
|---|--------------------------|--------|------------------------------------------------|
| 1 | Root schemas have @context | Pass | All root schemas use WithContext<T>            |
| 2 | Sub-objects clean         | Pass   | ListItem returns plain ListItem type           |

(repeat for all 8 categories)

### Domain-Specific Recommendations

For each recommendation, in confidence order (Strong → Likely → Speculative):

#### {N}. {Schema.org type} — {Strong | Likely | Speculative}

- **Schema.org path:** `Thing > Product > House`
- **Triggered by:** `tools/sanity/schema/documents/design.ts`, route `/designs/[slug]`
- **Why this subtype:** Designs are pre-engineered residential buildings sold as a product line — `House` is more specific than `Product` and adds `numberOfRooms`, `floorSize`, `numberOfBathroomsTotal`
- **Pages to render on:** Design Detail (`/designs/[slug]`)
- **Suggested file:** `components/JsonLd/schemas/house.ts`
- **Field mapping:**
  - `name` ← `design.title`
  - `description` ← `design.longDescription`
  - `image` ← `design.heroImage`
  - `numberOfRooms` ← `design.bedrooms` (if present)
  - `floorSize` ← `design.sizeVariants[].sqm`
  - `offers.priceRange` ← `design.priceRange`
  - `brand` ← Organization @id reference

### Required Fixes
1. **[Category] Check name** (`path/to/file.ts:line`)
   - Current: `description of current code`
   - Fix: `description of what to change`

### Warnings (Manual Review)
1. **[Category] Check name** — What to verify manually

### Summary
- {X} issues require code changes
- {Z} items need manual review
- {N} domain recommendations ({strong}/{likely}/{speculative})
- {passing_count} checks passed
```

---

## Step 5: Offer to Auto-Fix and Scaffold Recommendations

Two separate prompts — fixes are mechanical, domain recommendations need a content judgement.

### 5a. Fixes (mechanical)

If any **Fail** items were found and `--fix` was NOT passed, use `AskUserQuestion`:

**"Found {N} schema issues. Would you like to fix them?"**

Options:

- "Yes, fix all" — Apply all suggested fixes
- "Let me review first" — Do nothing
- "No" — Do nothing

If `--fix` was passed or user chose "Yes, fix all":

1. Apply each fix listed in the "Required Fixes" section
2. Run `/check` to verify no errors were introduced
3. Report all changes made with file paths and line numbers

### 5b. Domain recommendations (judgement-required)

For each **Strong** recommendation, offer to scaffold the new JSON-LD schema function:

**"Recommendation: add `{SchemaType}` schema for `{docType}`. Scaffold it now?"**

Options:

- "Yes, scaffold" — Create the function file at the suggested path with field mappings stubbed, register it in `components/JsonLd/index.tsx`, and (if a consumer JsonLd component is the natural integration point) update that component too. Do **not** wire it into a page render — leave that to the developer so they can confirm field availability.
- "Skip" — Move on
- "Skip all recommendations" — Stop offering for this run

For **Likely** and **Speculative** recommendations, do not auto-scaffold — just list them in the report so the team can discuss.

---

## Step 6: Summary

After completion, report:

- Total checks run and pass/fail/warning counts
- Number of fixes applied (if auto-fix was chosen)
- Number of domain recommendation schemas scaffolded
- Reminder about manual review items (if any warnings)
- Reminder that scaffolded schemas need a developer to (a) confirm field mappings, (b) wire them into the relevant page renders, (c) validate output with Google's Rich Results Test
