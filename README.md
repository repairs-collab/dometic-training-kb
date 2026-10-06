# Dometic Training Knowledge Base

A public, static search resource built from the supplied Dometic training manuals. It supports plain-language searches for problems, symptoms, error codes, procedures, parts, specifications and training topics, then links each result back to its source manual and page.

Live site: https://repairs-collab.github.io/dometic-training-kb/

## What is included

- 18 source manuals and 217 indexed pages.
- 63 reviewed answer cards for common service and training questions.
- Model-, family- and error-code-aware search.
- Product, model, information-type and manual filters.
- One-based PDF page references and links.
- Visible safety warnings before hazardous procedures.
- Responsive phone and desktop layouts.
- No login, database, telemetry or runtime AI service.

## Local preview

Prerequisites: Node.js 24, pnpm 11 and Python 3.13 or compatible current versions.

```text
pnpm install --frozen-lockfile
python -m pip install -e .
pnpm build:data
pnpm dev
```

Open the local address printed by Vite. For a production-equivalent preview:

```text
pnpm build
pnpm verify:dist
pnpm preview
```

## Quality checks

```text
pnpm typecheck
pnpm test
python -m pytest -v
pnpm build:data
pnpm build
pnpm verify:dist
pnpm test:e2e
```

The browser suite checks all nine acceptance searches on desktop and phone, source-PDF availability, keyboard use, layout overflow and serious accessibility issues.

## Updating manuals

1. Add or replace PDFs in `source-manuals` and update the stable filename mapping in `tools/extract_manuals.py`.
2. Run extraction into `.work/extracted` and confirm the expected manual and page totals.
3. Render every low-text page with `tools/review_pages.py`.
4. Visually review each flagged page and update `content/page-overrides.json`; never treat OCR as authoritative for codes, parts, warnings or numeric values.
5. Regenerate `content/pages.json`, update `content/manuals.json`, `content/knowledge.json` and `content/aliases.json`, then run `python -m tools.validate_content`.
6. Run the complete quality checks before publishing.

The source PDFs are committed so every public answer remains traceable. Do not silently merge conflicting model or revision guidance.

## Publishing

The `main` branch is configured for automatic GitHub Pages deployment. See `DEPLOYMENT.md` for GitHub Pages, cPanel and future custom-subdomain instructions.

## Safety and rights

This resource is a training and reference aid. Confirm the model, document revision and cited page before service work. Electrical, gas, refrigeration and stored-energy work requires appropriately qualified personnel.

No software, documentation or manual-content licence is granted by this repository. The included manuals and trademarks remain subject to their owners' rights.
