# Dometic Training Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, publish, and document a public static knowledge base that searches the 18 supplied Dometic manuals and returns concise answers with exact manual/page references.

**Architecture:** A Python ingestion pipeline extracts and reviews page-level source content, then produces versioned JSON catalogues. A Vite and TypeScript single-page frontend uses MiniSearch for local weighted search, displays curated answer cards before page matches, and opens copied source PDFs at one-based page anchors. GitHub Actions builds and deploys the static `dist` folder to GitHub Pages.

**Tech Stack:** Python, `pypdf`, PyMuPDF, pytest, Vite, TypeScript, MiniSearch, Vitest, Testing Library DOM, Playwright, Git, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-06-dometic-training-knowledge-base-design.md`

## Global Constraints

- Build the project in `work/dometic-training-kb` and initialize it as a Git repository with branch `main`.
- Copy source PDFs from `C:\Users\repai\OneDrive\Desktop\dometic`; do not delete the supplied folder.
- Catalogue all 18 supplied PDFs and all 217 pages.
- Keep the deployed application fully static with no database, login, telemetry, or runtime AI service.
- Use one-based page numbers in every user-visible citation and PDF `#page=` link.
- Treat OCR output as untrusted until error codes, model numbers, parts, measurements, electrical values, and warnings are visually checked.
- Rank exact model and error-code matches above fuzzy or general manual text matches.
- Preserve model-specific distinctions and never silently merge conflicting instructions.
- Use relative site URLs so the same build works locally, on GitHub Pages, and on a future custom subdomain.
- Build a responsive, keyboard-usable interface for phone and desktop use.
- Commit source copies and reviewed content, but ignore generated review images, `public/data`, `public/manuals`, and `dist`.
- Do not add a software or documentation licence unless the user requests one.

## Review Focus

- Ambiguous short codes such as `03` must not outrank model-specific matches without model or filter context; Task 5 tests this.
- PDF filenames containing spaces and punctuation must produce encoded, working page links; Task 6 tests this.
- Low-text pages containing tables or diagrams must enter a review queue and cannot be published as reviewed text without an override; Tasks 2 and 3 test this.
- Duplicate or revised manuals must retain source traceability without silently overwriting model/version-specific guidance; Tasks 3 and 4 test this.
- Missing or malformed JSON/PDF data must fail the build or show a clear UI error instead of a blank screen; Tasks 4, 7, and 8 test this.

---

### Task 1: Repository and Data Contracts

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `pyproject.toml`
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/data/types.ts`
- Create: `src/data/validation.ts`
- Test: `src/data/validation.test.ts`
- Create: `docs/superpowers/specs/2026-10-06-dometic-training-knowledge-base-design.md`
- Create: `docs/superpowers/plans/2026-10-06-dometic-training-knowledge-base.md`

**Interfaces:**
- Produces: `ManualRecord`, `PageRecord`, `KnowledgeEntry`, `SourceRef`, `ExtractionStatus`, `ProductCategory`, and `EntryKind` types.
- Produces: `validateCatalogs(manuals: unknown, pages: unknown, knowledge: unknown): CatalogValidationResult`.

- [ ] **Step 1: Create the project and test harness configuration**

Create `work/dometic-training-kb`, initialize `main`, add the Vite/TypeScript and pytest configurations, install the declared dependencies with pnpm and Python, and copy the approved spec and plan into `docs/superpowers`.

- [ ] **Step 2: Write the failing data-contract tests**

Test that valid records pass and that duplicate IDs, zero-based pages, missing source references, unknown categories, and invalid extraction statuses fail with named errors.

```ts
expect(validateCatalogs(manuals, pages, knowledge)).toEqual({ valid: true, errors: [] });
expect(validateCatalogs(manuals, [{ ...page, pageNumber: 0 }], knowledge).errors)
  .toContain('page page-1 must use a one-based pageNumber');
```

- [ ] **Step 3: Run the test and confirm RED**

Run: `pnpm vitest run src/data/validation.test.ts`

Expected: FAIL because `validateCatalogs` and the record types do not exist.

- [ ] **Step 4: Implement the typed records and catalogue validation**

Implement the exact types named above and return all validation errors in stable input order.

- [ ] **Step 5: Run the test and confirm GREEN**

Run: `pnpm vitest run src/data/validation.test.ts`

Expected: PASS with no warnings.

- [ ] **Step 6: Commit the repository foundation**

```bash
git add .
git commit -m "chore: establish knowledge base project"
```

### Task 2: Manual Inventory and Page Extraction

**Files:**
- Create: `tools/__init__.py`
- Create: `tools/models.py`
- Create: `tools/extract_manuals.py`
- Test: `tests/python/test_extract_manuals.py`
- Create: `source-manuals/*.pdf`

**Interfaces:**
- Consumes: the 18 copied PDFs in `source-manuals`.
- Produces: `normalise_text(text: str) -> str`.
- Produces: `extract_manual(path: Path, manual_id: str) -> tuple[ManualRecord, list[PageRecord]]`.
- Produces: CLI `python -m tools.extract_manuals --source source-manuals --output .work/extracted`.

- [ ] **Step 1: Write the failing extraction tests**

Generate a two-page temporary PDF in the test and assert that extraction returns two one-based records, normalized text, SHA-256 metadata, encoded source filenames, and `low_text=True` below 40 useful characters.

```python
manual, pages = extract_manual(pdf_path, "fixture-manual")
assert manual.page_count == 2
assert [page.page_number for page in pages] == [1, 2]
assert pages[1].low_text is True
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `python -m pytest tests/python/test_extract_manuals.py -v`

Expected: FAIL because the extraction module does not exist.

- [ ] **Step 3: Implement extraction and stable manual identifiers**

Use `pypdf` for text and metadata, calculate hashes without changing source files, normalize whitespace, and derive stable IDs from a reviewed filename-to-ID mapping rather than filenames alone.

- [ ] **Step 4: Copy and inventory the supplied PDFs**

Copy exactly 18 PDFs into `source-manuals`, run the CLI, and verify the summary reports 217 pages and 62 pages below the 40-character threshold.

- [ ] **Step 5: Run extraction tests and inventory checks**

Run: `python -m pytest tests/python/test_extract_manuals.py -v`

Run: `python -m tools.extract_manuals --source source-manuals --output .work/extracted --expect-files 18 --expect-pages 217`

Expected: both commands exit 0.

- [ ] **Step 6: Commit the extraction pipeline and source copies**

```bash
git add tools tests/python source-manuals
git commit -m "feat: extract page-level manual content"
```

### Task 3: Image-Page Review and Overrides

**Files:**
- Create: `tools/review_pages.py`
- Create: `tools/apply_overrides.py`
- Create: `content/page-overrides.json`
- Create: `content/pages.json`
- Test: `tests/python/test_page_review.py`

**Interfaces:**
- Consumes: `.work/extracted/manuals.json` and `.work/extracted/pages.json` from Task 2.
- Produces: `PageOverride` with `manual_id`, `page_number`, `text`, `status`, `aliases`, and `review_note` fields.
- Produces: `build_review_queue(pages: list[PageRecord], threshold: int = 40) -> list[PageRecord]`.
- Produces: `apply_overrides(pages: list[PageRecord], overrides: list[PageOverride]) -> list[PageRecord]`.
- Produces: CLI rendering under `.work/review-pages` and reviewed `content/pages.json`.

- [ ] **Step 1: Write failing review and override tests**

Test that low-text pages enter the queue, ordinary text pages do not, an override replaces draft text and status, duplicate normalized pages share a duplicate group, and a low-text technical page without a reviewed override fails validation.

- [ ] **Step 2: Run the test and confirm RED**

Run: `python -m pytest tests/python/test_page_review.py -v`

Expected: FAIL because review and override functions do not exist.

- [ ] **Step 3: Implement review queue rendering and override merging**

Render flagged pages with PyMuPDF, store only temporary PNGs under `.work`, and require each low-text page to be classified as `ocr`, `manual-transcription`, `visual-only`, or `excluded`.

- [ ] **Step 4: Review all 62 flagged pages**

Visually check every flagged page, transcribe searchable technical content, preserve warnings and numeric values, and mark covers, photographs without instructional text, blank pages, and end slides as `visual-only` or `excluded` with a reason.

- [ ] **Step 5: Consolidate the duplicated defrost source**

Assign the two RUC defrost PDFs to one duplicate group, keep both manual records, and ensure the final page record retains both relevant source references without duplicated search text.

- [ ] **Step 6: Run review validation and confirm GREEN**

Run: `python -m pytest tests/python/test_page_review.py -v`

Run: `python -m tools.apply_overrides --input .work/extracted/pages.json --overrides content/page-overrides.json --output content/pages.json --require-reviewed-low-text`

Expected: PASS and 217 final page records.

- [ ] **Step 7: Commit reviewed page content**

```bash
git add tools content/page-overrides.json content/pages.json tests/python/test_page_review.py
git commit -m "feat: review image-based manual pages"
```

### Task 4: Manual Catalogue and Curated Knowledge

**Files:**
- Create: `content/manuals.json`
- Create: `content/knowledge.json`
- Create: `content/aliases.json`
- Create: `tools/validate_content.py`
- Test: `tests/python/test_content_validation.py`

**Interfaces:**
- Consumes: the types from Task 1 and reviewed pages from Task 3.
- Produces: `validate_content(manuals, pages, knowledge, aliases) -> list[str]`.
- Produces: at least 45 reviewed `KnowledgeEntry` records covering every supplied product category and all acceptance searches.

- [ ] **Step 1: Write failing content-validation tests**

Test exactly 18 unique manuals, 217 pages, source page bounds, valid categories and kinds, required warnings for hazardous entries, at least 45 curated entries, and presence of entries covering each acceptance-search topic.

```python
assert len(manuals) == 18
assert len(pages) == 217
assert len(knowledge) >= 45
assert not validate_content(manuals, pages, knowledge, aliases)
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `python -m pytest tests/python/test_content_validation.py -v`

Expected: FAIL because the catalogues and validator do not exist.

- [ ] **Step 3: Build the reviewed manual catalogue and aliases**

Record stable IDs, display titles, filenames, page counts, categories, product families, dates where known, duplicate groups, and common spelling/model variations.

- [ ] **Step 4: Curate concise answer entries**

Create entries for high-value error codes, warning codes, flash codes, symptoms, procedures, parts, specifications, and training topics. Every factual statement must have one or more source references and every hazardous procedure must carry the relevant warning before its steps.

- [ ] **Step 5: Run content tests and confirm GREEN**

Run: `python -m pytest tests/python/test_content_validation.py -v`

Run: `python -m tools.validate_content`

Expected: PASS with zero validation errors.

- [ ] **Step 6: Commit reviewed catalogues**

```bash
git add content tools/validate_content.py tests/python/test_content_validation.py
git commit -m "feat: add reviewed troubleshooting knowledge"
```

### Task 5: Weighted Search Engine

**Files:**
- Create: `src/search/normalise.ts`
- Create: `src/search/synonyms.ts`
- Create: `src/search/engine.ts`
- Test: `src/search/engine.test.ts`

**Interfaces:**
- Consumes: `ManualRecord`, `PageRecord`, and `KnowledgeEntry` from Task 1 plus `content/aliases.json` semantics from Task 4.
- Produces: `SearchCorpus`, `SearchEngine`, `SearchFilters`, `SearchHit`, and `MatchReason` types.
- Produces: `createSearchEngine(input: SearchCorpus): SearchEngine`.
- Produces: `search(engine: SearchEngine, query: string, filters: SearchFilters): SearchHit[]`.
- Produces: `SearchFilters` fields `category`, `model`, `kind`, and `manualId`.

- [ ] **Step 1: Write failing ranking and normalization tests**

Use real reviewed fixture entries to prove exact code/model ranking, plain-language synonym expansion, punctuation and hyphen normalization, conservative fuzzy matching, filters, and no-result handling.

```ts
expect(search(engine, 'RUC error 33', {})[0].id).toBe('ruc-compressor-start-error-33');
expect(search(engine, 'awning leaking at stitching', {})[0].id).toBe('awning-stitching-water-leak');
expect(search(engine, '03', {})[0]?.matchReason).not.toBe('unqualified-exact-code');
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `pnpm vitest run src/search/engine.test.ts`

Expected: FAIL because the search engine does not exist.

- [ ] **Step 3: Implement query normalization and synonym expansion**

Normalize case, punctuation, hyphen variants, model spacing, and common terminology while preserving exact model and code tokens.

- [ ] **Step 4: Implement MiniSearch indexes and deterministic ranking**

Index curated entries and page records separately, weight codes/models/title above aliases/symptoms/summary/body, place curated hits before page hits when relevance is comparable, and cap fuzzy matching for short codes.

- [ ] **Step 5: Run search tests and confirm GREEN**

Run: `pnpm vitest run src/search/engine.test.ts`

Expected: PASS with stable ordered IDs.

- [ ] **Step 6: Commit the search engine**

```bash
git add src/search
git commit -m "feat: add model-aware manual search"
```

### Task 6: Result View Models, Filters, and Source Links

**Files:**
- Create: `src/ui/viewModel.ts`
- Create: `src/ui/filters.ts`
- Create: `src/ui/sourceLinks.ts`
- Test: `src/ui/viewModel.test.ts`
- Test: `src/ui/sourceLinks.test.ts`

**Interfaces:**
- Consumes: `SearchHit[]` and catalogue records from Tasks 1 and 5.
- Produces: `buildResultCards(hits: SearchHit[], corpus: SearchCorpus): ResultCard[]`.
- Produces: `deriveFilterOptions(corpus: SearchCorpus): FilterOptions`.
- Produces: `buildPdfUrl(filename: string, pageNumber: number): string`.

- [ ] **Step 1: Write failing view-model and URL tests**

Test curated cards before page cards, applicable model labels, warnings before procedure steps, merged duplicate references, filter counts, and percent-encoded PDF filenames with `#page=N`.

```ts
expect(buildPdfUrl('RCD 10.5 update July 26 Master.pdf', 21))
  .toBe('./manuals/RCD%2010.5%20update%20July%2026%20Master.pdf#page=21');
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `pnpm vitest run src/ui/viewModel.test.ts src/ui/sourceLinks.test.ts`

Expected: FAIL because the UI data functions do not exist.

- [ ] **Step 3: Implement result-card and filter derivation**

Keep rendering-independent transformations pure and return explicit empty, loading, ready, and error states.

- [ ] **Step 4: Implement safe source links**

Encode only the filename path segment, reject page numbers below one, and preserve the PDF page fragment.

- [ ] **Step 5: Run the tests and confirm GREEN**

Run: `pnpm vitest run src/ui/viewModel.test.ts src/ui/sourceLinks.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit UI data preparation**

```bash
git add src/ui
git commit -m "feat: prepare cited search results"
```

### Task 7: Responsive Search Interface

**Files:**
- Create: `src/main.ts`
- Create: `src/app.ts`
- Create: `src/ui/renderHome.ts`
- Create: `src/ui/renderFilters.ts`
- Create: `src/ui/renderResults.ts`
- Create: `src/styles.css`
- Test: `src/app.test.ts`

**Interfaces:**
- Consumes: search and view-model interfaces from Tasks 5 and 6 plus `./data/*.json` at runtime.
- Produces: `createApp(root: HTMLElement, loader: CatalogLoader): Promise<AppController>`.
- Produces: public search UI with category shortcuts, filters, concise cards, source links, and safety notices.

- [ ] **Step 1: Write failing DOM behaviour tests**

Test loading, successful first render, example search submission, filter reset, no-results suggestions, visible safety notices, keyboard-accessible expandable details, and clear data-load failure text.

- [ ] **Step 2: Run the test and confirm RED**

Run: `pnpm vitest run src/app.test.ts`

Expected: FAIL because the application components do not exist.

- [ ] **Step 3: Implement the application controller and renderers**

Use semantic HTML, native buttons/details where appropriate, progressive status messages, and no raw HTML from extracted content.

- [ ] **Step 4: Add responsive visual styling**

Implement a Dometic-inspired neutral interface without copying proprietary website code, with a large search field, high-contrast badges, readable answer cards, touch-sized controls, and single-column phone layout.

- [ ] **Step 5: Run UI tests and confirm GREEN**

Run: `pnpm vitest run src/app.test.ts`

Expected: PASS without console errors.

- [ ] **Step 6: Commit the interface**

```bash
git add index.html src/main.ts src/app.ts src/ui src/styles.css
git commit -m "feat: build responsive training search interface"
```

### Task 8: Production Data Build and Integrity Checks

**Files:**
- Create: `tools/build_site_data.py`
- Create: `scripts/verify-dist.mjs`
- Modify: `package.json`
- Modify: `.gitignore`
- Test: `tests/python/test_build_site_data.py`
- Test: `scripts/verify-dist.test.ts`

**Interfaces:**
- Consumes: reviewed `content/*.json` and `source-manuals/*.pdf`.
- Produces: `public/data/manuals.json`, `public/data/pages.json`, `public/data/knowledge.json`, `public/data/aliases.json`, and `public/manuals/*.pdf`.
- Produces: scripts `pnpm build:data`, `pnpm build`, `pnpm verify:dist`, and `pnpm test`.

- [ ] **Step 1: Write failing build-integrity tests**

Test that the builder copies 18 PDFs, leaves source hashes unchanged, writes 18 manuals and 217 pages, rejects out-of-range references, and makes every generated source URL resolve inside the build tree.

- [ ] **Step 2: Run the tests and confirm RED**

Run: `python -m pytest tests/python/test_build_site_data.py -v`

Run: `pnpm vitest run scripts/verify-dist.test.ts`

Expected: FAIL because build and verification scripts do not exist.

- [ ] **Step 3: Implement deterministic production-data generation**

Validate first, then copy PDFs and emit normalized JSON with stable ordering. Abort before writing deployable output on any missing manual, invalid page, malformed entry, or content-validation error.

- [ ] **Step 4: Implement `dist` verification**

Check the built HTML/assets, four data files, 18 PDF files, all referenced manual IDs, and every one-based page bound.

- [ ] **Step 5: Run full data build and confirm GREEN**

Run: `pnpm build:data && pnpm build && pnpm verify:dist`

Expected: exit 0; 18 PDFs, 18 manuals, and 217 page records reported.

- [ ] **Step 6: Commit integration tooling**

```bash
git add tools/build_site_data.py scripts package.json pnpm-lock.yaml .gitignore tests
git commit -m "build: generate verified static knowledge base"
```

### Task 9: Acceptance, Accessibility, and Browser Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/search.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `tests/e2e/source-links.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the production build from Task 8.
- Produces: repeatable browser-level acceptance checks against the static site.

- [ ] **Step 1: Write failing browser acceptance tests**

Cover the exact searches `RUC error 33`, `awning leaking at stitching`, `FJZ not turning on`, `three flashes portable fridge`, `RCD door not closing`, `RUA settings locked`, `FreshJet generator size`, `RUC fuse location`, and `MC101 gas connections`. Also cover exact model/code ranking, filters, no-result recovery, source-link HTTP availability, warning visibility, keyboard operation, phone viewport layout, and no serious accessibility violations.

- [ ] **Step 2: Run the browser tests and confirm RED**

Run: `pnpm test:e2e`

Expected: at least one new acceptance or accessibility assertion fails before integration fixes.

- [ ] **Step 3: Fix only the search, content, or UI behaviour exposed by the tests**

Keep fixes within the owning modules and add unit regressions for any ranking or data issue found.

- [ ] **Step 4: Run browser and full test suites**

Run: `pnpm test:e2e`

Run: `pnpm test && python -m pytest -v && pnpm build && pnpm verify:dist`

Expected: all commands pass with no unreported failures.

- [ ] **Step 5: Manually compare representative cards to rendered pages**

Verify at least one air-conditioner code, refrigerator code, portable-fridge flash code, awning procedure, electrical value, part number, and safety warning against the cited PDF page.

- [ ] **Step 6: Commit verified acceptance coverage**

```bash
git add playwright.config.ts tests package.json pnpm-lock.yaml src content
git commit -m "test: verify public knowledge base journeys"
```

### Task 10: Documentation, GitHub, and Pages Deployment

**Files:**
- Create: `README.md`
- Create: `DEPLOYMENT.md`
- Create: `.github/workflows/pages.yml`
- Test: `src/config/pagesWorkflow.test.ts`

**Interfaces:**
- Consumes: the verified build and Git history from Tasks 1-9.
- Produces: a public GitHub repository named `dometic-training-kb` and a GitHub Pages deployment.

- [ ] **Step 1: Write the failing deployment-configuration test**

Assert that the workflow installs pnpm and Python dependencies, runs both test suites, builds the site, verifies `dist`, uploads the Pages artifact, and deploys only from `main`.

- [ ] **Step 2: Run the test and confirm RED**

Run: `pnpm vitest run src/config/pagesWorkflow.test.ts`

Expected: FAIL because `.github/workflows/pages.yml` does not exist.

- [ ] **Step 3: Add user and deployment documentation**

Document local preview, search behaviour, manual update workflow, low-text page review, tests, production build, cPanel upload, GitHub Pages, and the later custom-subdomain DNS/CNAME steps. State that no licence is granted by the repository.

- [ ] **Step 4: Implement GitHub Pages deployment workflow**

Use official GitHub Pages actions, least-required permissions, dependency caching, full tests before upload, and the `dist` folder as the only deployment artifact.

- [ ] **Step 5: Run final local verification**

Run: `pnpm vitest run src/config/pagesWorkflow.test.ts`

Run: `pnpm test && python -m pytest -v && pnpm build && pnpm verify:dist && pnpm test:e2e`

Expected: all commands exit 0.

- [ ] **Step 6: Commit release and deployment files**

```bash
git add README.md DEPLOYMENT.md .github src/config
git commit -m "docs: add publishing and maintenance workflow"
```

- [ ] **Step 7: Create and push the GitHub repository**

Because GitHub CLI is not currently installed, create the public `dometic-training-kb` repository through the user's authenticated GitHub browser session or install/authenticate GitHub CLI if explicitly available during execution. Add the resulting HTTPS remote, push `main`, and verify the remote commit matches local `HEAD`.

- [ ] **Step 8: Enable and verify GitHub Pages**

Allow the Pages workflow to finish, open the deployed URL, run the representative searches, open at least three PDF page references, and record the public Pages URL in `README.md` if this changes the file.

- [ ] **Step 9: Prepare custom-subdomain handoff**

Do not invent a domain. Document the required `CNAME` file and DNS CNAME record, ready for the user to supply the chosen subdomain after the default Pages deployment is working.

## Final Verification Checklist

- [ ] `pnpm test` passes.
- [ ] `python -m pytest -v` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm verify:dist` reports 18 manuals, 217 pages, and valid source references.
- [ ] `pnpm test:e2e` passes at desktop and phone widths.
- [ ] All nine acceptance searches return useful results.
- [ ] Representative technical values and warnings match rendered source pages.
- [ ] Source PDF hashes in the original folder are unchanged from the audit or any differences are explicitly reported.
- [ ] Local `HEAD` matches GitHub `main`.
- [ ] The public GitHub Pages URL loads and PDF page links work.
