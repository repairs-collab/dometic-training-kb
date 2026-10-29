# FreshJet 4 and 7 Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the supplied FreshJet 4/7 PDF and workbook as searchable, downloadable, source-linked training resources.

**Architecture:** Extend the existing manual catalogue with an optional file format and sheet count, while keeping PDF behavior as the default. Add reviewed page records and curated knowledge entries for the supplied source content, then build both files into the static resource library.

**Tech Stack:** Python 3.13, TypeScript 7, Vite 8, Vitest, Playwright, static JSON catalogues

**Spec:** `docs/superpowers/specs/2026-10-29-freshjet-resources-design.md`

## Global Constraints

- Preserve the supplied source files without editing them.
- Do not invent thermistor values, tolerances, error codes or procedures.
- Keep existing PDFs backward compatible by treating a missing format as `pdf`.
- Keep the site offline until the content and login work pass full validation.

## Review Focus

- XLSX source links must download the workbook without a `#page=` fragment.
- PDF source links must retain one-based page fragments.
- Exact error codes must not cross-match unrelated FreshJet models.
- The FreshJet resistance entry must contain only the four supplied temperatures.
- The resource library must remain usable on phone layouts.

---

### Task 1: Mixed Resource Catalogue

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/ui/sourceLinks.ts`
- Modify: `src/ui/sourceLinks.test.ts`
- Modify: `src/ui/viewModel.ts`
- Modify: `src/manualLibrary.ts`
- Create: `src/manualLibrary.test.ts`
- Modify: `tools/validate_content.py`
- Modify: `tests/python/test_content_validation.py`

**Interfaces:**
- Produces optional `ManualRecord.format: 'pdf' | 'xlsx'` and `sheetCount`.
- Produces `buildSourceUrl(filename, pageNumber, format)` with PDF page fragments and fragment-free XLSX URLs.

- [ ] Write failing unit tests for PDF and XLSX source links and resource-library actions.
- [ ] Run the focused tests and confirm they fail.
- [ ] Implement the mixed-resource types, URL builder, validation and conditional library rendering.
- [ ] Run the focused tests, typecheck and confirm they pass.

### Task 2: Source Files and Reviewed Catalogues

**Files:**
- Add: `source-manuals/FJ 4 & 7 Error codes.pdf`
- Add: `source-manuals/Thermistor chart.xlsx`
- Modify: `tools/extract_manuals.py`
- Modify: `content/manuals.json`
- Modify: `content/pages.json`
- Modify: `content/page-overrides.json`
- Modify: `content/knowledge.json`
- Modify: `content/aliases.json`
- Modify: `tests/python/test_content_validation.py`
- Modify: `README.md`

**Interfaces:**
- Produces resource IDs `freshjet-4-7-error-codes` and `freshjet-4-7-thermistor-chart`.
- Produces 22 error-code entries, one ADB procedure and one thermistor specification entry.

- [ ] Update expected counts first and confirm content validation fails.
- [ ] Add the unchanged source files and stable PDF extraction mapping.
- [ ] Add reviewed page transcriptions, workbook index data and curated knowledge entries.
- [ ] Run extraction consistency, content validation and representative search tests.

### Task 3: Browser Coverage and Documentation

**Files:**
- Modify: `tests/e2e/manuals.spec.ts`
- Modify: `tests/e2e/search.spec.ts`
- Modify: `tests/e2e/source-links.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Verifies both resource formats are published and representative new searches return source-linked answers.

- [ ] Add failing browser assertions for the Excel resource and representative FreshJet queries.
- [ ] Build the static data and application.
- [ ] Run browser tests and correct only failures caused by this change.
- [ ] Run the complete content, unit, type, build and browser validation suite.

