# Deployment Guide

## GitHub Pages

The repository workflow `.github/workflows/pages.yml` handles publishing from `main`.

1. Create the public GitHub repository and push `main`.
2. In the repository, open **Settings → Pages**.
3. Set **Source** to **GitHub Actions** if it is not already selected.
4. Open the latest **Test and deploy GitHub Pages** workflow run.
5. Confirm the test, build, browser and deploy jobs are green.
6. Open the deployment URL and test representative searches and PDF links.

The workflow installs dependencies, validates all catalogues, builds `dist`, verifies 18 PDFs and 217 pages, runs desktop and phone browser tests, and uploads only `dist`.

## cPanel or ordinary subdomain hosting

The output is a fully static site and does not require PHP or a database.

1. Run `pnpm build:data`, `pnpm build` and `pnpm verify:dist` locally.
2. Create the chosen subdomain in the website hosting panel.
3. Upload the **contents** of `dist` into that subdomain's document root.
4. Preserve the `assets`, `data` and `manuals` folders exactly.
5. Open the subdomain, run several searches and open PDF references.

Relative URLs are used throughout, so the same `dist` folder works at a subdomain root or GitHub Pages repository path.

## Future custom subdomain on GitHub Pages

Do this only after the default Pages URL is working and the exact subdomain has been chosen.

1. Add a DNS `CNAME` record for the chosen subdomain pointing to the GitHub account's `<account>.github.io` host.
2. Add a file named `CNAME` containing only the chosen full subdomain to the deploy output. For repeatable builds, keep the selected hostname in a small source file and copy it into `dist` after `pnpm build` or extend `tools/build_site_data.py` once the real hostname is known.
3. Enter the same hostname under **Settings → Pages → Custom domain**.
4. Wait for GitHub's DNS check, then enable **Enforce HTTPS**.

Do not add a placeholder `CNAME` file to production. A real hostname is required.

## Manual rollback

GitHub Pages deployments retain workflow history. To roll back, restore the last known-good commit on `main` and let the workflow publish it again. For cPanel, upload a previously verified `dist` archive over the current document root.
