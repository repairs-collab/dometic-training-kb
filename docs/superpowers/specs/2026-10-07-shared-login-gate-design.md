# Shared Login Gate Design

**Date:** 2026-10-07  
**Status:** Approved; amended to keep the site offline until release

## Purpose

Add a lightweight shared login screen to the existing Dometic training site. The goal is to discourage casual public browsing by requiring one shared username and password before the search or manual-library interface appears.

The user explicitly accepts that this is a basic client-side barrier rather than secure access control. The current Crazy Domains account has domain registration and Premium DNS but no Web/Linux Hosting or cPanel, so server-side directory protection is not available without buying hosting.

## Goals

- Require the supplied shared credential before normal site use.
- Gate both the search page and the manual-library page.
- Keep the plaintext password out of Git and the published files.
- Keep a successful login for the current browser session.
- Provide an obvious logout action.
- Preserve the existing static GitHub Pages deployment and custom domain.
- Preserve accessibility, phone layout, search behavior, source links and PDF downloads.

## Non-Goals

- Strong authentication or protection against a determined visitor.
- Individual user accounts, password resets, audit logs or permissions.
- Protecting direct PDF URLs, GitHub repository files or other static assets from someone who already knows their addresses.
- Purchasing or configuring a new hosting product.

## User Experience

An unauthenticated visitor to either site page sees a branded login form instead of the knowledge-base interface. The form contains username and password fields, a submit button and a short explanation that one shared team credential is required.

Incorrect credentials leave the form visible and show a generic error without identifying which field was wrong. Correct credentials store a versioned authenticated marker in `sessionStorage`, then render the requested page. Authentication therefore survives same-tab navigation and linked tabs opened by the site, but ends when the browser session is closed or when the user selects **Log out**.

The site header gains a **Log out** control after authentication. Logging out clears the session marker and returns the current page to the login screen.

## Credential Verification

The repository and published bundle must never contain the plaintext password. Production configuration contains only a random salt and a derived verifier for the combined username and password. The browser uses Web Crypto PBKDF2 with SHA-256 to derive a candidate verifier and performs a constant-time byte comparison.

The verifier remains visible to anyone inspecting the public JavaScript bundle and can be attacked offline. PBKDF2 only reduces casual discovery; it does not turn the static site into secure authentication. This limitation is accepted for the requested use case.

The production verifier is generated locally from the supplied credential and committed as non-plaintext configuration. Tests use separate, clearly identified test credentials and never contain the production password.

## Application Structure

Create a focused authentication module responsible for:

- Rendering the login form.
- Deriving and comparing credential verifiers.
- Reading and writing the versioned browser-session marker.
- Exposing a `requireAuthentication` entry point that resolves only after successful login.
- Clearing authentication during logout.

Both `src/main.ts` and `src/manualsMain.ts` call `requireAuthentication` before creating their existing page applications. Catalog and manual JSON requests do not begin until the gate succeeds, preventing the protected interface from flashing before login.

The authentication UI reuses the existing colour, typography and responsive design tokens. The form uses explicit labels, an announced error region, visible focus styles and standard password-manager-compatible input attributes.

Header rendering remains page-specific, but both headers receive the same logout callback and control. No search or manual-library behavior changes after authentication.

## Failure Behaviour

- Missing or malformed verifier configuration fails closed and shows a generic unavailable message.
- Unsupported Web Crypto fails closed rather than showing the knowledge base.
- Incorrect credentials do not create session state.
- Corrupt or unknown session markers are ignored and the login form is shown.
- Logout clears session state even if page rerendering fails.

## Testing

Unit tests cover verifier derivation, correct and incorrect test credentials, malformed configuration, session restoration and logout. Application tests confirm that page initialization waits for successful authentication.

Browser tests cover:

- Login form visibility on both entry pages.
- Rejection of incorrect credentials.
- Successful login with test credentials.
- Navigation between Search and Manuals during one session.
- Logout returning to the login screen.
- Existing search, PDF-link, accessibility and phone-layout scenarios after authentication.

The production build verifier confirms that both generated HTML entry points load an authenticated application entry bundle. A manual post-deployment check uses the supplied production credential without recording it in test output.

## Deployment

Continue building through GitHub Actions and serving the completed site through GitHub Pages. The custom domain and DNS record do not change.

GitHub Pages was disabled at the user's request before implementation began. It must remain disabled until the completed login gate passes local and GitHub-hosted validation. Push-triggered workflows validate but do not publish; a separate manually approved workflow run performs the production deployment.

Rollout steps:

1. Generate the production verifier locally without printing the plaintext password.
2. Run all unit, content, build and browser checks with separate test credentials.
3. Build the final site with the production verifier.
4. Push for GitHub-hosted validation while Pages remains disabled.
5. Re-enable GitHub Pages, restore the custom-domain setting and run the manually approved production deployment.
6. Confirm unauthenticated visitors see the login form, the supplied credential unlocks both pages, logout works, and representative PDF links still open.

Rollback is a revert to the last known-good Git commit followed by the normal Pages deployment.

## Accepted Limitation

This gate protects the normal user journey only. Because GitHub Pages and the repository are public static hosting, someone can bypass it by using a known PDF URL, reading the repository or modifying browser state. Strong protection would require paid hosting with server-side authentication or another authenticated hosting platform.

## Acceptance Criteria

- Search and Manuals display only the login screen before authentication.
- The supplied shared credential unlocks both pages.
- Incorrect credentials remain locked and display a generic error.
- The password is absent from tracked source, built files and test output.
- Authentication lasts for the browser session and can be cleared with logout.
- Existing search and all 20 resource view/download links continue to work after login.
- The full automated validation suite passes before deployment.
