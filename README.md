# Motts Training Hub

A multi-company static training hub. Its global search covers every published company library, while each company has its own scoped search and resource area. The first company section contains the supplied Dometic training manuals and reference files.

Live site: https://training.motts.com.au/

Dometic search: https://training.motts.com.au/dometic/

Dometic manual library: https://training.motts.com.au/dometic/manuals.html

## What is included

- 20 source resources and 221 indexed source records.
- 87 reviewed answer cards for common service and training questions.
- A hub-wide search plus Dometic-scoped search.
- A Companies submenu ready for additional company libraries.
- Model-, family- and error-code-aware search.
- Product, model, information-type and manual filters.
- One-based PDF page references plus direct spreadsheet source links.
- A current resource library with PDF viewing and PDF or Excel downloads.
- Visible safety warnings before hazardous procedures.
- Responsive phone and desktop layouts.
- A lightweight shared login for the normal site journey, with no database, telemetry or runtime AI service.

## Local preview

Prerequisites: Node.js 24, pnpm 11 and Python 3.13 or compatible current versions.

```text
pnpm install --frozen-lockfile
python -m pip install -e .
pnpm build:data
pnpm dev --mode auth-test
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
pnpm build:test-auth
pnpm verify:dist
pnpm test:e2e
pnpm build
pnpm verify:dist
```

The browser suite uses test-only credentials and checks the login flow, eleven acceptance searches, PDF and Excel source availability, keyboard use, layout overflow and serious accessibility issues on desktop and phone. The final `pnpm build` restores the production credential configuration after browser testing.

## Shared login

The login is intentionally a casual-use barrier for this static site. It protects the normal hub, company Search and Manuals pages, but it does not protect known direct file URLs, repository files or a browser whose session state is manually modified. Strong access control requires server-side authenticated hosting.

Successful login stores only the marker `dometic-training-auth-v1` in `sessionStorage`. It lasts for the current browser session and is cleared by **Log out**. The plaintext production password is not stored in the repository or generated site; the browser bundle contains a salted PBKDF2 verifier that can still be attacked offline.

To rotate the shared credential, set `AUTH_USERNAME` and `AUTH_PASSWORD` as temporary environment values in a trusted local shell, run `node scripts/generate-auth-config.mjs`, then clear both environment values immediately. The script rewrites `src/auth/productionConfig.ts` with only the username, random salt, iteration count and verifier. Run the complete quality sequence before committing or publishing, and never place the plaintext password in source, documentation, command arguments or test fixtures.

## Updating manuals

1. Add or replace source files in `source-manuals`; update the stable PDF filename mapping in `tools/extract_manuals.py` when needed.
2. Run extraction into `.work/extracted` and confirm the expected manual and page totals.
3. Render every low-text page with `tools/review_pages.py`.
4. Visually review each flagged page and update `content/page-overrides.json`; never treat OCR as authoritative for codes, parts, warnings or numeric values.
5. Regenerate `content/pages.json`, update `content/manuals.json`, `content/knowledge.json` and `content/aliases.json`, then run `python -m tools.validate_content`.
6. Run the complete quality checks before publishing.

The source resources are committed so every public answer remains traceable. Do not silently merge conflicting model or revision guidance.

## Publishing

Pushes to `main` run complete validation but do not publish. Production deployment requires a manual **Test and deploy GitHub Pages** workflow run with the `deploy` option enabled. See `DEPLOYMENT.md` for release and recovery instructions.

## Safety and rights

This resource is a training and reference aid. Confirm the model, document revision and cited page before service work. Electrical, gas, refrigeration and stored-energy work requires appropriately qualified personnel.

No software, documentation or manual-content licence is granted by this repository. The included manuals and trademarks remain subject to their owners' rights.
