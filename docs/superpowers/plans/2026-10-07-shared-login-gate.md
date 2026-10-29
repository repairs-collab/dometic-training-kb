# Shared Login Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight shared login gate to both public site entry pages while keeping the production password out of source and preserving the existing static deployment.

**Architecture:** A focused authentication module derives a PBKDF2 verifier in the browser, stores only a versioned `sessionStorage` marker, and renders the application only after successful login. Both page entry points use the same gate and shared header/logout renderer; GitHub Actions builds a known test-auth variant for browser tests, rebuilds with the tracked non-plaintext production verifier, and publishes only through a separate manually approved release run.

**Tech Stack:** TypeScript 7, Web Crypto API, Vite 8 modes, Vitest/jsdom, Playwright, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-10-07-shared-login-gate-design.md`

## Global Constraints

- Treat this as a casual-use barrier, not secure server-side authentication.
- Never commit or print the production plaintext password.
- Use PBKDF2 with SHA-256, 210,000 iterations, a 16-byte random salt and a 32-byte derived verifier.
- Derive from the exact UTF-8 string `username + "\u0000" + password`; do not trim or case-normalize either field.
- Store authentication under `sessionStorage` key `dometic-training-auth-v1` with marker `authenticated`.
- Direct PDF URLs, repository files and manually modified browser state remain accepted bypasses.
- Add no runtime dependency; use browser and Node standard crypto APIs.
- Preserve all existing search, manual, source-link, safety, accessibility and responsive behavior.
- Keep GitHub Pages disabled until local and GitHub-hosted validation passes; ordinary pushes must not publish.

## Review Focus

- **Malformed verifier configuration:** reject invalid hex, wrong salt/verifier lengths and iteration counts below 100,000; Task 1 tests each case.
- **Exact credential matching:** reject case changes, leading/trailing spaces and Unicode lookalikes; Task 1 uses literal near-match fixtures.
- **Corrupt session state:** any marker other than exact `authenticated` remains locked; Task 1 tests empty and unknown values.
- **Repeated form submission:** disable submission while verification is pending and perform one check; Task 2 tests a deferred verifier.
- **Unavailable Web Crypto:** fail closed with the generic unavailable message; Task 2 injects a rejecting checker and verifies no session marker is written.

---

### Task 1: Credential Verifier and Session State

**Files:**
- Create: `src/auth/credentials.ts`
- Create: `src/auth/session.ts`
- Create: `src/auth/config.ts`
- Create: `src/auth/productionConfig.ts`
- Create: `src/vite-env.d.ts`
- Create: `src/auth/credentials.test.ts`
- Create: `src/auth/session.test.ts`
- Create: `scripts/generate-auth-config.mjs`
- Create: `scripts/generate-auth-config.test.ts`

**Interfaces:**
- Produces: `CredentialVerifierConfig`, `validateCredentialVerifierConfig(config)`, `deriveCredentialVerifier(username, password, config, subtle?)`, `verifyCredentials(username, password, config, subtle?)`.
- Produces: `isAuthenticated(storage)`, `markAuthenticated(storage)`, `clearAuthentication(storage)` and constants `AUTH_SESSION_KEY`, `AUTH_SESSION_MARKER`.
- Produces: `authConfig`, selected from the production verifier normally and a literal test verifier when `import.meta.env.MODE === 'auth-test'`.

- [ ] **Step 1: Write failing credential tests**

Add tests named `derives the hand-checked test verifier`, `accepts only exact matching credentials`, and `rejects malformed verifier configuration`. Use test-only username `training-test`, password `test-only-password`, salt `00112233445566778899aabbccddeeff` and expected verifier `59c7c73abc390250e3dbac79c0e6f0ca660364d4a5f9718e310e32bc9e32033a`; include case, whitespace and Unicode near-matches as explicit rejected values. This verifier uses the required NUL byte separator, not the two literal characters backslash and zero.

- [ ] **Step 2: Run the credential tests and confirm RED**

Run: `pnpm vitest run src/auth/credentials.test.ts`

Expected: FAIL because `src/auth/credentials.ts` does not exist.

- [ ] **Step 3: Implement credential derivation and validation**

Implement the exact PBKDF2 parameters from Global Constraints. `validateCredentialVerifierConfig` returns a validated config or throws; `verifyCredentials` compares decoded verifier bytes without an early return and accepts an optional `SubtleCrypto` for tests.

- [ ] **Step 4: Run the credential tests and confirm GREEN**

Run: `pnpm vitest run src/auth/credentials.test.ts`

Expected: all credential tests pass.

- [ ] **Step 5: Write failing session-state tests**

Assert an absent or unknown marker is locked, `markAuthenticated` stores the exact versioned marker, and `clearAuthentication` removes it.

- [ ] **Step 6: Implement `src/auth/session.ts` and confirm GREEN**

Run: `pnpm vitest run src/auth/session.test.ts`

Expected: all session tests pass.

- [ ] **Step 7: Write the generator test before the generator**

In `scripts/generate-auth-config.test.ts`, assert `buildCredentialVerifier({ username, password, saltHex })` produces the same literal verifier as the browser derivation fixture and rejects missing inputs.

- [ ] **Step 8: Implement the Node generator and production configuration**

`scripts/generate-auth-config.mjs` exports `buildCredentialVerifier` and, when run directly, reads `AUTH_USERNAME` and `AUTH_PASSWORD` from process environment, generates a random salt, and writes only salt, iteration count and verifier to `src/auth/productionConfig.ts`. It prints only a success message, never credentials or verifier values.

Generate the production file using the supplied credentials through temporary process environment values, then clear those values immediately. Add `src/auth/config.ts` with the deterministic test verifier for `auth-test` mode and `productionAuthConfig` otherwise.

- [ ] **Step 9: Run Task 1 checks**

Run: `pnpm vitest run src/auth/credentials.test.ts src/auth/session.test.ts scripts/generate-auth-config.test.ts && pnpm typecheck`

Expected: all tests pass and TypeScript reports no errors.

- [ ] **Step 10: Commit Task 1**

```text
git add src/auth src/vite-env.d.ts scripts/generate-auth-config.mjs scripts/generate-auth-config.test.ts
git commit -m "feat: add shared credential verifier"
```

### Task 2: Accessible Login Gate

**Files:**
- Create: `src/auth/gate.ts`
- Create: `src/auth/gate.test.ts`
- Modify: `src/styles.css:46-97`

**Interfaces:**
- Consumes: `verifyCredentials`, session helpers and `CredentialVerifierConfig` from Task 1.
- Produces: `AuthSession { logout(): void }` and `requireAuthentication(root: HTMLElement, options: AuthGateOptions): Promise<AuthSession>`.
- `AuthGateOptions` contains `config`, `storage`, optional `verify(username, password)`, optional `subtle`, and optional `reload`; production defaults to `verifyCredentials` with `window.crypto.subtle`, `window.sessionStorage` and `window.location.reload`.

- [ ] **Step 1: Write failing gate tests**

Cover: unauthenticated form labels and heading `Team access`; generic rejection text `The username or password is incorrect.`; successful resolution and session marker; restored session without a form; a rejecting checker showing `Login is unavailable. Please refresh and try again.`; and a deferred checker that is called once while the `Log in` button remains disabled.

- [ ] **Step 2: Run the gate tests and confirm RED**

Run: `pnpm vitest run src/auth/gate.test.ts`

Expected: FAIL because `requireAuthentication` does not exist.

- [ ] **Step 3: Implement the minimal gate**

Render explicit Username and Password labels, password-manager-compatible autocomplete values, submit button and `aria-live` error region. Resolve immediately for an exact valid session marker; otherwise resolve only after successful credential verification. `logout()` clears the marker before invoking `reload`.

- [ ] **Step 4: Add focused responsive styles**

Add `.auth-shell`, `.auth-card`, `.auth-form`, `.auth-error` and `.button--logout` rules using existing colour and focus tokens. Do not alter result or manual-card layout.

- [ ] **Step 5: Run Task 2 checks**

Run: `pnpm vitest run src/auth/gate.test.ts && pnpm typecheck`

Expected: gate tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit Task 2**

```text
git add src/auth/gate.ts src/auth/gate.test.ts src/styles.css
git commit -m "feat: add accessible shared login gate"
```

### Task 3: Gate Both Application Entry Points

**Files:**
- Create: `src/ui/renderSiteHeader.ts`
- Create: `src/ui/renderSiteHeader.test.ts`
- Modify: `src/main.ts:1-6`
- Modify: `src/manualsMain.ts:1-8`
- Modify: `src/app.ts:19-62`
- Modify: `src/app.test.ts:24-50`
- Modify: `src/manualLibrary.ts:12-42`
- Create: `src/manualLibrary.test.ts`

**Interfaces:**
- Consumes: `requireAuthentication`, `authConfig` and `AuthSession.logout` from Tasks 1-2.
- Produces: `renderSiteHeader(currentPage: 'search' | 'manuals', onLogout: () => void): HTMLElement`.
- Updates: `createApp(root, loader, onLogout?)` and `createManualLibrary(root, loader, onLogout?)`; optional callbacks preserve direct unit-test usage.

- [ ] **Step 1: Write the failing shared-header test**

Assert Search and Manuals links preserve their exact hrefs and current-page state, the `Log out` button exists, and clicking it calls the supplied callback once.

- [ ] **Step 2: Run the header test and confirm RED**

Run: `pnpm vitest run src/ui/renderSiteHeader.test.ts`

Expected: FAIL because the shared renderer does not exist.

- [ ] **Step 3: Implement and adopt the shared header**

Move duplicated brand/navigation construction from `src/app.ts` and `src/manualLibrary.ts` into `renderSiteHeader`. Pass the optional logout callback from both page constructors without changing existing content loading.

- [ ] **Step 4: Extend page-constructor tests**

Extend `src/app.test.ts` and `src/manualLibrary.test.ts` to pass a callback, assert the shared `Log out` control exists and confirm clicking it calls the callback once. Authentication startup timing is exercised through the real browser entry points in Task 4 rather than mocked module side effects.

- [ ] **Step 5: Gate both entry points**

Change `src/main.ts` and `src/manualsMain.ts` to await `requireAuthentication` before calling their page constructors and pass `authSession.logout` into the shared header path.

- [ ] **Step 6: Run Task 3 checks**

Run: `pnpm vitest run src/app.test.ts src/manualLibrary.test.ts src/ui/renderSiteHeader.test.ts src/auth/gate.test.ts && pnpm typecheck`

Expected: all targeted tests pass and TypeScript reports no errors.

- [ ] **Step 7: Commit Task 3**

```text
git add src/main.ts src/manualsMain.ts src/app.ts src/app.test.ts src/manualLibrary.ts src/manualLibrary.test.ts src/ui
git commit -m "feat: require login for training pages"
```

### Task 4: Browser Acceptance and Test Build

**Files:**
- Create: `tests/e2e/auth.ts`
- Create: `tests/e2e/login.spec.ts`
- Modify: `tests/e2e/accessibility.spec.ts:1-37`
- Modify: `tests/e2e/manuals.spec.ts:1-49`
- Modify: `tests/e2e/search.spec.ts:1-90`
- Modify: `tests/e2e/source-links.spec.ts:1-35`
- Modify: `package.json:1-24`
- Modify: `.github/workflows/pages.yml:1-63`

**Interfaces:**
- Consumes: `auth-test` Vite mode and its literal test-only credentials from Task 1.
- Produces: `openAuthenticatedPage(page, path)` for all existing browser tests.

- [ ] **Step 1: Add failing login acceptance tests**

`tests/e2e/login.spec.ts` checks both entry URLs show `Team access`, wrong credentials remain locked, test credentials reveal the requested app, Search-to-Manuals navigation remains authenticated, and `Log out` returns to the gate.

- [ ] **Step 2: Add the test-auth build command and observe RED**

Add `"build:test-auth": "vite build --mode auth-test"`, build with `pnpm build:data && pnpm build:test-auth`, then run `pnpm playwright test tests/e2e/login.spec.ts`.

Expected: the new acceptance tests fail until entry integration and helpers are complete.

- [ ] **Step 3: Add and adopt `openAuthenticatedPage`**

The helper navigates to the requested relative path, fills the literal test username/password, submits once and waits for the `Log out` button. Replace direct initial `page.goto` calls in all existing scenarios, except tests intentionally exercising the locked state.

- [ ] **Step 4: Update accessibility and phone checks**

Run axe against both the login and authenticated screens. Confirm the login page and each existing authenticated phone scenario have horizontal overflow no greater than one pixel.

- [ ] **Step 5: Reorder and gate the deployment workflow**

Build data once, run `pnpm build:test-auth`, verify and run browser tests against that artifact, then run a fresh `pnpm build` with the production configuration and `pnpm verify:dist`. Change `workflow_dispatch` to include a boolean `deploy` input defaulting to false. Push-triggered and ordinary manual runs perform every validation step but never configure Pages or upload; only a manually dispatched run with `deploy: true` may configure Pages, upload the final production artifact and execute the deploy job. Never upload the test-auth artifact.

- [ ] **Step 6: Run Task 4 checks**

Run: `pnpm build:data && pnpm build:test-auth && pnpm verify:dist && pnpm test:e2e`

Expected: the full browser suite passes with only the existing intentional project skips.

- [ ] **Step 7: Commit Task 4**

```text
git add tests/e2e package.json .github/workflows/pages.yml
git commit -m "test: cover shared login flow"
```

### Task 5: Distribution Guard and Documentation

**Files:**
- Modify: `index.html:1-13`
- Modify: `manuals.html:1-16`
- Modify: `scripts/verify-dist.mjs:19-28`
- Modify: `scripts/verify-dist.test.ts:7-84`
- Modify: `README.md:1-56`
- Modify: `DEPLOYMENT.md:1-45`

**Interfaces:**
- Consumes: both authenticated entry bundles from Task 3.
- Produces: deployment contract `<meta name="dometic-auth-gate" content="required">` on both entry documents.

- [ ] **Step 1: Write the failing distribution test**

Extend the complete fixture with the auth meta marker, then add independent tests removing it from `index.html` and `manuals.html`; each must reject with `missing authentication gate marker` and name the affected entry.

- [ ] **Step 2: Run the verifier test and confirm RED**

Run: `pnpm vitest run scripts/verify-dist.test.ts -t "authentication gate"`

Expected: FAIL because `verifyDist` does not inspect the marker.

- [ ] **Step 3: Add the marker and verifier requirement**

Add the exact meta element to both source HTML files. Make `verifyDist` read each generated entry and fail if the exact marker is absent.

- [ ] **Step 4: Update operator documentation**

Document the casual-only security boundary, session behavior, credential rotation through `scripts/generate-auth-config.mjs`, test-auth build order, production rebuild requirement and rollback. Never include either production credential value.

- [ ] **Step 5: Run the complete local validation sequence**

Run in order:

```text
pnpm typecheck
pnpm test
python -m pytest -q
pnpm build:data
pnpm build:test-auth
pnpm verify:dist
pnpm test:e2e
pnpm build
pnpm verify:dist
git diff --check
```

Expected: every command exits zero; production `dist` is the final artifact.

- [ ] **Step 6: Check credential hygiene**

With the supplied password held only in a temporary environment value, search tracked files and `dist` for that exact value; expect zero matches. Clear the environment value immediately and confirm `git status --short` contains only intended changes.

- [ ] **Step 7: Commit Task 5**

```text
git add index.html manuals.html scripts/verify-dist.mjs scripts/verify-dist.test.ts README.md DEPLOYMENT.md
git commit -m "docs: enforce authenticated site builds"
```

### Task 6: Publish and Verify Production

**Files:**
- No additional source files expected.

**Interfaces:**
- Consumes: fully validated production `dist` and existing GitHub Pages workflow.
- Produces: deployed lightweight login gate at `https://dometic.motts.com.au/` and `https://dometic.motts.com.au/manuals.html`, only after an explicit release run.

- [ ] **Step 1: Review the complete branch diff**

Confirm no plaintext production credential appears, the production verifier file contains only salt/iterations/verifier, and the workflow uploads only the final production build.

- [ ] **Step 2: Push and monitor validation**

Push `main`, confirm the public site still returns `404`, and wait for the matching non-deploying GitHub Actions run to complete successfully.

- [ ] **Step 3: Restore Pages configuration and release explicitly**

Re-enable GitHub Pages with GitHub Actions as the source, restore custom domain `dometic.motts.com.au`, then manually dispatch the workflow for the validated commit with `deploy: true`. Wait for the deployment job to succeed and record its URL and deployed commit SHA.

- [ ] **Step 4: Verify the public locked state**

In a fresh browser session, both public entry pages must show `Team access`; wrong credentials must remain locked and no catalog request should be required to render the gate.

- [ ] **Step 5: Verify the supplied production credential**

Use the supplied credential without logging it. Confirm Search loads 18 manuals, Manuals lists 18 cards, representative search results work, a PDF returns `application/pdf`, navigation stays authenticated and `Log out` returns to the gate.

- [ ] **Step 6: Confirm repository state**

Run: `git status --short`, `git rev-parse HEAD`, and `git rev-parse origin/main`.

Expected: clean working tree and matching commit SHAs.
