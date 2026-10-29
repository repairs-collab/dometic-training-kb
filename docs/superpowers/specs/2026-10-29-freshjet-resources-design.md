# FreshJet 4 and 7 Resource Update Design

**Date:** 2026-10-29  
**Status:** Approved through the user's request and credential handoff

## Purpose

Add the supplied FreshJet 4 and 7 error-code PDF and thermistor workbook to the existing searchable training resource. Each troubleshooting answer must remain concise, searchable by plain language and code, and traceable to the supplied source file.

## Goals

- Add the error-code PDF for browser viewing and download.
- Add the thermistor workbook as a downloadable Excel resource.
- Create one reviewed answer per display code so exact-code searches return the correct model-specific result.
- Add the ADB temperature-sensor readout procedure.
- Add the FreshJet 4/7 thermistor resistance values at 15, 20, 25 and 30 degrees Celsius.
- Preserve source references and the existing safety, search and responsive behavior.
- Keep the site offline until the content update and approved shared-login gate pass validation.

## Non-Goals

- Inventing resistance values outside the temperatures recorded in the workbook.
- Treating the workbook's separate portable-refrigerator chart as FreshJet data.
- Providing stronger authentication than the already approved shared client-side gate.
- Protecting direct static-file URLs from a determined visitor.

## Resource Handling

The current manual catalogue becomes a mixed resource catalogue while retaining its existing data filename and TypeScript name to avoid an unrelated migration. PDF records default to `format: "pdf"`; the workbook uses `format: "xlsx"` and records its sheet count. The resource library shows PDF view/download actions and an Excel download action.

The workbook receives one reviewed page-style index record representing its relevant `Sheet1` FreshJet column. Knowledge-source labels identify the worksheet rather than claiming a PDF page. Source URL generation omits a page fragment for non-PDF resources.

## Search Content

Create separate error-code entries for P0, P1, P2, P4, P5, P6, P7, P8, P9, E0, E1, E2, E3, E6, E7, E8, E9, EA, EE, EF, EL and EU. Each entry includes the fault type, cause, recommended checks, FreshJet 4/7 model scope and the exact source page.

Create one procedure entry for the five ADB button combinations and one specification entry for the FreshJet 4/7 thermistor resistance values. Do not interpolate or add a tolerance not stated for that product column.

## Validation

- Unit tests cover mixed PDF/Excel source URLs and resource-library actions.
- Content validation expects 20 resources and 221 indexed source records.
- Search tests cover representative protection, sensor, communication and thermistor queries.
- The complete Python, TypeScript, build and browser suites run before publishing.
- The production bundle is scanned to confirm the shared plaintext password is absent.

