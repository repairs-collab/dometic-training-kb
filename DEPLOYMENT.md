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

## Custom subdomain on GitHub Pages

The production hostname is `dometic.motts.com.au`.

1. Keep a DNS `CNAME` record named `dometic` pointing to `repairs-collab.github.io`.
2. Keep `content/CNAME` set to `dometic.motts.com.au`; `pnpm build:data` copies it into every deployment.
3. Keep `dometic.motts.com.au` under **Settings → Pages → Custom domain**.
4. Keep **Enforce HTTPS** enabled after GitHub completes its DNS and certificate checks.

The default GitHub Pages address redirects to the production hostname while the custom-domain setting is active.

## Manual rollback

GitHub Pages deployments retain workflow history. To roll back, restore the last known-good commit on `main` and let the workflow publish it again. For cPanel, upload a previously verified `dist` archive over the current document root.
