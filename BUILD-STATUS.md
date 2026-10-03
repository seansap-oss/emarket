# Build status — v0.3.0

## Implemented

Marketplace UI, product/shop discovery, product detail and WhatsApp composer; seller identity/themes and listing forms; collections; package comparison and Vercel payment handlers; scheduled advertising with admin approval; admin content/catalogue controls; reports and audit log; CSV import; PWA offline fallback; Supabase schema, RLS and storage policies.

## Verified locally

- Production Vite build succeeds; development catalogue is excluded from production JavaScript.
- PGlite executes the actual schema and tests: cross-seller write denial; free-plan limit; seller suspension protection; entitlement self-upgrade rejection; campaign approval/payment protection; anonymous visibility; changed creative returns to pending; duplicate payment fulfilment is idempotent; package expiry reduces public visibility while owner retains records; suspended seller products disappear.
- Domain tests: WhatsApp number validation/URL encoding; dangerous/social lookalike URL rejection; video URL parsing; search text includes entered social URLs/attributes; CSV invalid categories/prices/SKUs/images; payment signature tampering rejection.
- Browser desktop: home, keyword search, product detail, enquiry composer, seller editor, category field switching and social-link inputs.
- Additional visual/responsive evidence and final browser results are recorded in `design-qa.md`.

## External services still required

- A new dedicated Supabase project. The only connected project is an unrelated IAS application and was not changed.
- Email sender and redirect URL configuration; real signup/confirmation/login/recovery/upload acceptance.
- Administrator account UUID, selected by the owner. No password is hardcoded and no admin account has been secretly created.
- Razorpay account keys and webhook configuration. No live or test-mode payment was made; payment-provider end-to-end acceptance remains blocked.
- Vercel project linked to this repository with environment variables. The available Vercel deployment action returned tool-not-found; no direct Vercel deployment has been claimed.

## Scope still open / not implemented

- Phone OTP: email/password implemented instead; SMS provider not selected.
- Native Android/iOS binaries; native distribution remains a later phase as requested.
- Live Instagram/Facebook embed acceptance with seller-provided public URLs.
- Server-rendered listing SEO and rich per-product social previews.
- Durable background imports, remote image ingestion, automatic social caption/feed import, and complete 15,000-row load verification.
- Seller product variants, multiple collection memberships, collection reordering, catalogue export/rollback, and shop staff accounts.
- Advertisement impression/click analytics, automated advertising checkout and inventory booking.
- Admin MFA, total-storage quotas, upload cleanup, account deletion UI, automated reconciliation, operational monitoring and backup restore drill.
- Final public business identity, contact details, prices, refund policy and legal copy. Current terms/privacy copy is a launch checklist, not completed legal advice.

## Production acceptance before public launch

1. Sign up two real test users; verify email, login, reset, session persistence and sign-out.
2. Create individual/shop profiles, upload images, publish/edit/sell products, and verify global search/social URL search from a separate browser.
3. Attempt cross-account API reads/writes and uploads against the live service; run Supabase security advisors.
4. Purchase a package in payment test mode; replay webhook; test failed/cancelled/captured payment and expiry.
5. Submit a campaign; approve and record payment; verify schedule, rejection and later creative edits.
6. Verify WhatsApp deep links on Android, iPhone and desktop without sending test messages to unrelated people.
7. Test PWA installation/offline behaviour, mobile keyboard, pinch zoom and actual iOS/Android social players.
8. Configure support/privacy/refund information, monitoring, backups and media budgets before opening paid registration.

## Latest continuation

- Fixed admin moderation action placement inside the editing dialog.
- Converted payment webhook to a Web Request handler, preserving signed bytes and returning retryable errors for temporary fulfilment failures. Added checks for missing configuration, byte-level signature tampering and oversize requests.
- Excluded offline HTML and both install icons from the SPA rewrite.
- All four test files pass; production build succeeds. The main JavaScript chunk still exceeds Vite's advisory size threshold.
- GitHub upload attempted: connector returned HTTP 403 `Resource not accessible by integration`. Git CLI has no authenticated credential. Source is committed locally, but NOT uploaded to GitHub.
- Vercel project listing still contains only the unrelated IAS projects. No marketplace deployment exists in the connected team.
- A downloadable source archive is provided pending GitHub write access. No secrets or node_modules are included.

## v0.4.0 — supersedes earlier development-only catalogue statements

Public placeholders now ship in production by explicit user request. Five sample stores, ten collections and seventeen products are included. /templates offers category previews. Seller category selection applies a template, including the new motorcycle theme. Samples stop when VITE_SHOW_SAMPLES=false or a real Supabase backend is configured. Protected preview routes remain development-only.

The user's v0.3.0 repository commit has three successful Vercel deployments (emarket, emarket-adx4, emarket-dou6). Connector project listing is incomplete/stale; GitHub commit status confirms deployment. The v0.4.0 update cannot be pushed by this connection: GitHub still returns 403 for write operations. See SHOWCASE-UPDATE.md for applying the archive to the existing Windows folder and pushing to trigger redeployment.

## v0.5.0 — comprehensive categories

Implemented 31 parent categories and 331 subcategories with icons, searchable /categories directory, dependent seller/search selectors, CSV import mapping/reference, admin editing and database migration 005. Existing IDs and legacy listings without children are retained. Research and full catalogue: docs/CATEGORY-GUIDE.md. All six test files passed; production build passed (existing large-chunk advisory remains). Browser review verified directory rendering and Pallet racks navigation. Remote push remains blocked by GitHub integration HTTP 403, so this release is packaged as a cumulative update from v0.3.0. This version has not been deployed live.
