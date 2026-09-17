# Sanity Create

Create or update a Sanity page document by reading a Figma design, matching each section to existing built sections, and populating all text content from the design.

## Arguments

`$ARGUMENTS`

Optional: a Figma URL to skip the interactive prompt.

---

## Step 0: Prerequisites

### 0a: Verify MCP availability

| MCP    | How to check                   | Required? |
| ------ | ------------------------------ | --------- |
| Figma  | `mcp__figma__get_screenshot`   | Yes       |
| Sanity | `mcp__sanity__query_documents` | Yes       |

Use `ToolSearch` to check. Both are hard blockers.

### 0b: Read Sanity project config

Read `NEXT_PUBLIC_SANITY_PROJECT_ID` and the dataset name from `.env.development`. These are needed for all Sanity MCP calls. Default dataset is `production` if not specified.

### 0c: Read available sections

Read `tools/sanity/helpers/sections.ts` to get the list of registered section types. Then for each section type, read its schema file at `tools/sanity/schema/sections/{sectionType}.ts` to build a map of:

- Section type name (e.g., `gridSection`)
- Human-readable title (e.g., `Grid`)
- Available fields and their types
- TypeScript interface

Store this as the **section catalogue** for matching in Step 2.

---

## Step 1: Gather Input

Use `AskUserQuestion` to collect all required information. Batch into a single call:

1. **"Document type?"** — Options: "Page (default)", "Blog Post", "Blog Landing Page". Default to `page` if skipped.
2. **"Page title?"** — Free text. The document title (e.g., "About Us", "Contact").
3. **"Page slug?"** — Free text. The URL path (e.g., `about`, `contact`). Auto-derive from title if skipped (lowercase, hyphenated).
4. **"Figma URL for this page?"** — Required. The Figma frame URL containing the full page design.

If `$ARGUMENTS` contains a Figma URL, use it and only ask for title, slug, and document type.

---

## Step 2: Analyse Figma Design

### 2a: Get visual reference

Call `mcp__figma__get_screenshot` on the Figma URL to see the full page layout.

### 2b: Get design context

Call `mcp__figma__get_design_context` on the same URL to extract:

- The page structure — identify each distinct section from top to bottom
- Text content within each section (headings, body copy, taglines, button labels)
- Section characteristics (dark/light background, image placement, card count, etc.)

### 2c: Map sections to catalogue

For each section identified in the Figma design, match it to the closest section type from the catalogue built in Step 0c. Consider:

- **Layout pattern**: grid of cards → `gridSection`, two columns with image → `twoColDefaultSection`, FAQ accordion → `faqSection`, etc.
- **Field compatibility**: does the section type have the right fields for the content? (title, content, image, cards, button)
- **Theme**: infer light/dark from the section's background colour in Figma

Present the mapping for approval:

```
## Section Mapping

| # | Figma Section | Matched Type | Theme | Confidence |
|---|---|---|---|---|
| 1 | Hero with background image | headerHeroSection | dark | High |
| 2 | Two-column text + image | twoColDefaultSection | light | High |
| 3 | 3-card grid with icons | gridSection | dark | High |
| 4 | FAQ accordion | faqSection | light | High |
| 5 | CTA banner | closingCtaSection | dark | High |

**Unmatched sections:**
- {section description} — no matching section type exists. Run `/create-section` to build it first.

Proceed with creating this page?
```

If any sections can't be matched, list them and suggest running `/create-section` first. Ask the user whether to proceed with the matched sections or stop.

---

## Step 3: Extract Content from Figma

For each matched section, extract the text content from the Figma design context. Map each piece of text to the correct field:

### Field mapping rules

| Figma content                       | Section field           | Format                                                 |
| ----------------------------------- | ----------------------- | ------------------------------------------------------ |
| Small uppercase label above heading | `tagline`               | Plain string                                           |
| Main heading text                   | `title`                 | Plain string (Sanity handles rich text via TitleInput) |
| Body paragraphs                     | `content`               | Sanity block content array (see format below)          |
| Button/CTA label                    | `button.label`          | Plain string                                           |
| Card headings                       | `cards[n].title`        | Plain string                                           |
| Card body text                      | `cards[n].content`      | Sanity block content array                             |
| Card button labels                  | `cards[n].button.label` | Plain string                                           |
| FAQ questions                       | `faqItems[n].title`     | Plain string                                           |
| FAQ answers                         | `faqItems[n].content`   | Sanity block content array                             |

### Sanity block content format

Rich text fields (`blockContentSimple`, `blockContentStandard`, `blockContentAdvanced`) must use Sanity's portable text format:

```json
[
  {
    "_type": "block",
    "_key": "{unique-key}",
    "style": "normal",
    "markDefs": [],
    "children": [
      {
        "_type": "span",
        "_key": "{unique-key}",
        "text": "The actual paragraph text goes here.",
        "marks": []
      }
    ]
  }
]
```

For multiple paragraphs, create multiple block objects. For bold text, add a mark definition and reference it:

```json
{
  "_type": "block",
  "_key": "{unique-key}",
  "style": "normal",
  "markDefs": [{ "_type": "strong", "_key": "bold1" }],
  "children": [
    { "_type": "span", "_key": "s1", "text": "Regular text ", "marks": [] },
    { "_type": "span", "_key": "s2", "text": "bold text", "marks": ["bold1"] },
    { "_type": "span", "_key": "s3", "text": " more regular.", "marks": [] }
  ]
}
```

**Generate unique `_key` values** for every block, span, and markDef. Use short random strings (e.g., 8-12 alphanumeric characters).

### Image fields

Images cannot be populated from Figma automatically — leave image fields empty. Note in the summary which sections need images added manually in Sanity Studio.

### Button link fields

Button links cannot be fully populated (internal links need Sanity document references). Set:

- `addButton`: `true` (if the section has a button in Figma)
- `button.label`: the button text from Figma
- `button.link.linkType`: `"internal"` (default — the user will set the actual link in Studio)

---

## Step 4: Check for Existing Document

Query Sanity to see if a document with this slug already exists:

```
*[_type == "{docType}" && slug.current == "{slug}"][0]{ _id, title, slug }
```

Use `mcp__sanity__query_documents` with the project ID and dataset from Step 0b.

- **If found**: Store the `_id`. The document will be updated (patched) in Step 5.
- **If not found**: A new document will be created in Step 5.

---

## Step 5: Create or Update in Sanity

### 5a: Build the sections array

For each matched section, construct the Sanity object:

```json
{
  "_type": "{sectionType}",
  "_key": "{unique-key}",
  "internalLabel": "{Figma section description}",
  "tagline": "{extracted tagline}",
  "title": "{extracted title}",
  "content": [
    /* block content array */
  ],
  "addButton": true,
  "button": {
    "label": "{button text}",
    "link": {
      "linkType": "internal"
    }
  },
  "sectionFields": {
    "spacingOptions": {
      "removeTopSpacing": false,
      "removeBottomSpacing": false
    },
    "themeOptions": {
      "theme": "{inferred theme}"
    }
  }
}
```

Only include fields that exist in the section's schema. Omit fields that have no content (don't set them to empty strings).

### 5b: Build the document

```json
{
  "title": "{page title}",
  "slug": {
    "_type": "slug",
    "current": "{slug}"
  },
  "sections": [
    /* sections array from 5a */
  ]
}
```

### 5c: Write to Sanity

**If updating an existing document** (Step 4 found a match):

Use `mcp__sanity__patch_document_from_json` with:

- `documentId`: `"drafts.{existingId}"` (patch the draft)
- `set`: Set `title`, `slug`, and `sections` fields

**If creating a new document**:

Use `mcp__sanity__create_documents_from_json` with:

- `type`: the document type (e.g., `page`)
- `content`: the full document object

---

## Step 6: Summary

```
## Sanity Page Created

**Document:** {title}
**Slug:** /{slug}
**Type:** {document type}
**Status:** {Created / Updated} as draft

### Sections Populated: {count}

| # | Section Type | Title/Tagline | Content | Theme |
|---|---|---|---|---|
| 1 | headerHeroSection | "Welcome to Acme" | 2 paragraphs | dark |
| 2 | twoColDefaultSection | "About Us" | 1 paragraph | light |
| ... | ... | ... | ... | ... |

### Needs Manual Attention

- **Images**: {list sections that need images uploaded in Sanity Studio}
- **Button links**: {list sections with buttons that need internal links set}
- **Unmatched sections**: {any sections from Figma that couldn't be matched}

### Next Steps

1. Open Sanity Studio at `/studio` and find the draft document
2. Upload images for each section
3. Set button link targets
4. Review and publish the document
```
