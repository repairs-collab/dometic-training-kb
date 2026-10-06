# Dometic Training Knowledge Base Design

Date: 2026-10-06

## 1. Purpose

Create a publicly accessible, web-based training and troubleshooting resource from the Dometic PDF manuals currently stored in `C:\Users\repai\OneDrive\Desktop\dometic`.

The resource must help users find useful information using ordinary wording such as:

- "RUC error 33"
- "fridge not cooling on gas"
- "awning leaking at the stitching"
- "FJZ air conditioner will not turn on"
- "three flashes on portable fridge"
- "RCD door not closing"

Results must provide a concise, model-specific answer wherever possible, followed by links to the relevant source manual and page.

## 2. Source Audit

The source folder currently contains 18 PDF files and 217 pages.

- 155 pages contain enough embedded text for direct extraction.
- 62 pages contain little or no embedded text and require visual review, OCR, or manual transcription.
- The manuals cover rooftop air conditioners, upright refrigerators, portable refrigerators, awnings, cookers, error codes, installation, servicing, parts, specifications, and training topics.
- `RUC Defrost logic - Master.pdf` and `RUC Defrost logic - Master1.pdf` contain equivalent extracted content and will be treated as duplicate sources.
- Some image-heavy pages contain important tables, diagrams, settings, error codes, or procedures that are not present in the PDF text layer.

The original files may be modified if required, but the implementation will work from copied source files so the supplied originals remain recoverable.

## 3. Goals

The first release will:

1. Search across all supplied manuals.
2. Support plain-language symptoms, exact error codes, model numbers, procedures, parts, specifications, and training topics.
3. Return concise answer cards for high-value troubleshooting and service topics.
4. Return page-level manual matches for all indexed content, including topics without a curated answer.
5. Clearly identify the product family and applicable model or range.
6. Preserve source traceability through manual names and one-based PDF page numbers.
7. Work well on phones, tablets, and desktop computers.
8. Produce a static deployment folder suitable for a public subdomain.
9. Include a repeatable local update process for revised or additional manuals.

## 4. Non-Goals

The first release will not:

- Provide an AI-generated chat answer at runtime.
- Require a database, server-side application, user account, or paid search service.
- Replace official service procedures, product labels, safety requirements, or qualified technician judgement.
- Automatically publish newly added manuals without a local rebuild and review.
- Store user searches, personal data, analytics, or customer information.

## 5. Recommended Architecture

The system will be a generated static website with two complementary search layers:

1. **Curated knowledge entries** provide short, practical answers for common faults, symptoms, codes, procedures, parts, and specifications.
2. **Page-level source records** provide broad coverage of every extractable or transcribed manual page.

The browser downloads compact JSON search data and performs all searching locally. No search query is sent to a server.

The frontend will be built with Vite and TypeScript. MiniSearch will provide weighted full-text matching, prefix matching, and controlled fuzzy matching. The extraction and indexing tool will use Python because the available PDF libraries provide reliable page-level text and image access.

## 6. Content Model

### 6.1 Curated Knowledge Entry

Each curated entry will contain:

- `id`: stable identifier.
- `title`: concise problem or topic name.
- `kind`: error code, symptom, procedure, part, specification, training, or safety.
- `category`: air conditioner, upright refrigerator, portable refrigerator, awning, cooker, or general.
- `productFamilies`: applicable product ranges.
- `models`: known model numbers and model aliases.
- `codes`: error, warning, or flash codes.
- `symptoms`: common descriptions users may search.
- `aliases`: abbreviations, alternate spellings, and related wording.
- `summary`: concise answer shown in search results.
- `steps`: ordered troubleshooting or procedure steps when appropriate.
- `warnings`: relevant safety and model-compatibility warnings.
- `parts`: referenced part numbers and descriptions.
- `specifications`: structured values such as voltage, current, resistance, temperature, dimensions, or capacity.
- `sourceRefs`: one or more source manual and page references.
- `searchText`: normalized text used for indexing.

### 6.2 Page-Level Source Record

Each indexed page will contain:

- Manual identifier and filename.
- Manual title.
- One-based page number.
- Product category and detected product families.
- Extracted or transcribed page text.
- A short display excerpt.
- Search aliases added during review.
- Source URL in the form `manuals/<encoded filename>.pdf#page=<page number>`.
- Extraction status: embedded text, OCR, manual transcription, visual-only, or excluded.

## 7. Extraction and Review Pipeline

1. Copy the 18 PDFs into a working source directory and calculate file hashes.
2. Extract text from every page using `pypdf` or `PyMuPDF`.
3. Flag pages with fewer than 40 useful characters for visual review.
4. Render flagged pages to images.
5. Use OCR where available, then manually review important tables, diagrams, procedures, codes, part numbers, and measurements.
6. Normalize whitespace and common PDF extraction errors without changing technical values.
7. Detect duplicate pages and documents using normalized text plus file hashes.
8. Classify pages by product category, product family, model, and content type.
9. Generate page-level JSON records.
10. Create curated knowledge entries for high-value troubleshooting and training topics.
11. Validate every curated statement against at least one source page.
12. Generate the static site and run source-link validation.

OCR output is treated as a draft. Numeric values, error codes, part numbers, electrical values, and safety instructions must be checked visually before publication.

## 8. Search Behaviour

Search will normalize capitalization, punctuation, hyphens, repeated spaces, and common model-number variations.

Ranking priority will be:

1. Exact error code or flash-code match.
2. Exact model or product-family match.
3. Curated title match.
4. Curated aliases and symptoms.
5. Curated summary, steps, parts, and specifications.
6. Page-level manual text.

Exact short codes such as `E33`, `W19`, `P1`, or `03` will only receive maximum priority when paired with a relevant model or product family, unless the code is unambiguous in the current filter context.

The initial synonym map will include common trade and customer wording, for example:

- aircon, air conditioner, AC, rooftop unit, and RTU
- fridge, refrigerator, freezer, and cooling cabinet
- not cooling, warm, poor cooling, and no cooling
- not starting, will not turn on, dead, and no power
- three flashes, 3 flashes, and flash code 3
- thermistor, temperature sensor, and NTC
- control board, main board, PCB, and module

Fuzzy matching will be conservative so that similar model numbers and error codes are not incorrectly merged.

## 9. User Interface

### 9.1 Home and Search

The homepage will contain:

- A prominent search field.
- Example searches based on the supplied manuals.
- Quick category links for air conditioners, upright refrigerators, portable refrigerators, awnings, cookers, error codes, procedures, parts, and training topics.
- A short statement explaining that answers are sourced from the listed manuals.

### 9.2 Results

Results will display curated answer cards before page-level matches.

Each curated card will show:

- Title and answer type.
- Applicable product family and models.
- Concise answer or diagnosis.
- Ordered checks or steps when relevant.
- Safety warnings before hazardous steps.
- Related error codes and parts.
- Source manual links with page numbers.

Each page-level result will show:

- Manual title.
- Page number.
- Product category and detected models.
- Highlighted matching excerpt.
- A link opening the PDF at that page.

### 9.3 Filters and States

Users can filter by:

- Product category.
- Product family or model.
- Result type.
- Source manual.

The interface will include clear states for loading, no results, invalid data, and unavailable source files. A no-result screen will suggest broader wording and provide a one-click filter reset.

## 10. Safety and Public Access

Because the site is public, technical content will be presented with clear boundaries:

- A site-wide notice will state that the resource summarises training material and does not replace official service instructions.
- Gas, mains-voltage, refrigerant, stored-tension, lifting, and other hazardous procedures will display prominent warnings.
- Instructions intended for qualified personnel will be labelled accordingly.
- The site will not infer compatibility between models when the manuals do not establish it.
- Model-specific instructions will not be presented as universal advice.
- No customer data, internal contact details, credentials, or private business information will be added.

## 11. Duplicate and Conflicting Information

Duplicate source content will be indexed once while retaining all relevant source references.

When manuals provide different guidance:

- The applicable model, version, or date will be shown.
- Newer information will not silently overwrite older model-specific information.
- The answer will identify the distinction or instruct the user to confirm the model/version.
- Ambiguous content will remain a page-level result until it is manually resolved.

## 12. File and Deployment Structure

The project will produce a ready-to-upload static folder:

```text
dist/
  index.html
  assets/
  data/
    knowledge.json
    pages.json
    manuals.json
  manuals/
    *.pdf
```

Source and build files will remain outside `dist`:

```text
src/                  website source
content/              reviewed knowledge entries and aliases
tools/                extraction, validation, and build utilities
tests/                search and data validation tests
source-manuals/       working copies of supplied PDFs
```

The deployment instructions will cover:

1. A standard hosting account or cPanel subdomain by uploading the contents of `dist`.
2. Cloudflare Pages, Netlify, or similar static hosting as an alternative.
3. HTTPS, cache headers, and PDF MIME-type checks.
4. Replacing the deployed folder after a reviewed rebuild.

The site will use relative URLs so it can run locally and from a subdomain without code changes.

## 13. Update Workflow

To add or replace manuals:

1. Place working copies in `source-manuals`.
2. Run the extraction command.
3. Review the low-text/OCR queue and any changed pages.
4. Update or add curated knowledge entries where required.
5. Run tests and link validation.
6. Build `dist`.
7. Preview the generated site locally.
8. Upload the new `dist` contents to the subdomain.

Stable manual identifiers and knowledge-entry identifiers will prevent links and saved references from changing unnecessarily between builds.

## 14. Testing and Verification

Automated checks will cover:

- JSON schema and required fields.
- Unique identifiers.
- Valid manual and page references.
- Existing PDF files for every source link.
- Page numbers within each PDF's page count.
- Duplicate code/model combinations requiring review.
- Search ranking for representative exact and plain-language queries.
- Category, model, result-type, and manual filters.
- Safe rendering of unusual extracted characters.
- Production build success.

Representative acceptance searches will include:

- `RUC error 33`
- `awning leaking at stitching`
- `FJZ not turning on`
- `three flashes portable fridge`
- `RCD door not closing`
- `RUA settings locked`
- `FreshJet generator size`
- `RUC fuse location`
- `MC101 gas connections`

Manual verification will compare representative answers, technical values, warnings, parts, and page links against the rendered source pages.

## 15. Acceptance Criteria

The prototype is ready for handoff when:

1. All 18 supplied PDFs are represented in the manual catalogue.
2. Every page has an extraction status and source reference.
3. Important image-only technical pages have reviewed searchable text.
4. High-value error codes, symptoms, procedures, parts, and specifications have concise curated answers.
5. Exact codes and model numbers rank above general page matches.
6. Every displayed source link opens the correct manual and page.
7. The representative acceptance searches return useful results.
8. The site works at common phone and desktop widths.
9. Automated tests and the production build complete successfully.
10. `dist` runs locally and can be uploaded unchanged to a public subdomain.

## 16. Future Extension

An optional AI question-answering layer may be added later. It must use the same reviewed knowledge entries and source records, cite the supporting manual pages, and avoid answering when the retrieved evidence is insufficient. The static search experience will remain available as the reliable baseline.
