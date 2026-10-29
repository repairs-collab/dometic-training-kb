# Deployment Guide

## GitHub Pages

The repository workflow `.github/workflows/pages.yml` validates every push to `main`, but publishing requires an explicit manual release.

1. Create the public GitHub repository and push `main`.
2. In the repository, open **Settings → Pages**.
3. Set **Source** to **GitHub Actions** if it is not already selected.
4. Confirm the latest push-triggered **Test and deploy GitHub Pages** run is green; this run validates only and does not publish.
5. Select **Run workflow**, enable the `deploy` option, and start the manual release from `main`.
6. Confirm the test-auth build, browser suite, fresh production build, upload and deploy jobs are green.
7. Open the deployment URL, confirm the login screen appears, sign in with the production credential, and test Search, Manuals, logout, representative PDF links and the Excel download.

The workflow installs dependencies, validates all catalogues, builds a test-auth site for desktop and phone browser tests, then creates a fresh production build. It verifies 20 source resources, 221 indexed source records, 87 reviewed answers and the authentication marker on both entry pages. Only the fresh production `dist` is eligible for upload.

## cPanel or ordinary subdomain hosting

The output is a fully static site and does not require PHP or a database.

1. Run the complete quality sequence in `README.md`, ending with `pnpm build` and `pnpm verify:dist` so `dist` contains the production verifier.
2. Create the chosen subdomain in the website hosting panel.
3. Upload the **contents** of `dist` into that subdomain's document root.
4. Preserve the `assets`, `data` and `manuals` folders exactly.
5. Open the subdomain, verify login and logout, run several searches and open PDF and spreadsheet references.

Relative URLs are used throughout, so the same `dist` folder works at a subdomain root or GitHub Pages repository path. The shared login remains a client-side casual-use barrier on either host; server-side protection requires authenticated hosting.

## Custom subdomain on GitHub Pages

The production hostname is `dometic.motts.com.au`.

1. Keep a DNS `CNAME` record named `dometic` pointing to `repairs-collab.github.io`.
2. Keep `content/CNAME` set to `dometic.motts.com.au`; `pnpm build:data` copies it into every deployment.
3. Keep `dometic.motts.com.au` under **Settings → Pages → Custom domain**.
4. Keep **Enforce HTTPS** enabled after GitHub completes its DNS and certificate checks.

The default GitHub Pages address redirects to the production hostname while the custom-domain setting is active.

## Manual rollback

GitHub Pages deployments retain workflow history. To roll back, restore the last known-good commit on `main`, confirm validation passes, then run the workflow manually with `deploy` enabled. For cPanel, upload a previously verified production `dist` archive over the current document root.
