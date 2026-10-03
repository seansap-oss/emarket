# Leikai Market / emarket

A Manipur marketplace with individual and business storefronts, global product search, WhatsApp enquiries, seller packages and a restricted admin dashboard.

**Release:** 0.3.0. **Status:** application implemented and locally verified; production service configuration still required. See [BUILD-STATUS.md](BUILD-STATUS.md) for exact verification and remaining scope.

## Run locally

Node 22 or later:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Add the URL and publishable key of a **dedicated** Supabase project to `.env.local`. For a visual review without accounts, set `VITE_PREVIEW_MODE=true`. Fixtures and `/preview/seller` / `/preview/admin` are available only in Vite development mode. They do not simulate authentication and cannot publish changes. Production builds omit sample catalogue code.

```bash
npm test
npm run build
```

## Features

- Responsive marketplace and compact-screen bottom navigation, without disabling pinch zoom.
- Global keyword/URL search, category/location/price/condition/seller filters and pagination.
- Individual/shop profiles, three specialist storefront themes, logos/covers and collections.
- Category-dependent product fields; photos, social URLs, listing status, seller dashboard.
- WhatsApp enquiry composer; no messaging database or automatic sending.
- Supabase email/password signup, confirmation, login, recovery and protected seller/admin routes.
- Database row-level security, published-listing quotas, seller suspension and ad approval enforcement.
- Free, ₹500, ₹1,000, ₹2,000 and ₹5,000 packages with snapshot quotas.
- Razorpay manual 30-day package checkout, signature validation, captured-payment verification and idempotent webhook fulfilment.
- Scheduled sponsored hero carousel, video drawer, and manual admin payment/approval workflow.
- CSV template, validation, resumable-by-SKU draft import and result export.
- Admin homepage content, categories, plans, seller/listing edits, campaign review, reports and audit log.
- PWA manifest, icons, safe offline fallback; Android/iOS binaries are not part of this release.

## Deploy to Vercel

1. Import **seansap-oss/emarket** into Vercel. Framework: **Vite**. Root directory: repository root.
2. Build command: `npm run build`. Output: `dist/client`. `vercel.json` includes deep-link rewrites and security headers.
3. Create a dedicated Supabase project and run `database/schema.sql`, followed by `database/storage.sql`, once in its SQL editor.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel. These are intentionally public. Enable email confirmation and configure production Site URL, redirect URLs and a production SMTP sender in Supabase Auth.
5. Add server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (a Supabase server secret or legacy service-role key). Never prefix a server secret with `VITE_`.
6. Create your own account through the site and confirm your email. Use the account's actual UUID to grant administrator access through the trusted SQL editor:

```sql
insert into public.admins(user_id) values ('REPLACE_WITH_YOUR_ACTUAL_AUTH_USER_UUID');
```

7. Sign out/in, then visit `/admin`. Set marketplace branding, public support contacts, policies and final package/advertising prices before launch.
8. For packages, set server-only `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Configure automatic capture and a `payment.captured` webhook pointing to `/api/payment-webhook` on the deployed domain. First verify with Razorpay test mode. Do not accept live payments before final terms/refund policy are published.
9. Redeploy after changing `VITE_` variables; these are compiled into the browser bundle.
10. Run the live acceptance checklist in BUILD-STATUS.md. Do not switch to public launch simply because Vercel's build is green.

## Package behaviour

Free: 3 active products. Starter ₹500: 50. Growth ₹1,000: 250. Business ₹2,000: 1,000. Large catalogue ₹5,000: 15,000. Prices/limits can be edited by an administrator. Paid orders snapshot price and listing limit. Packages last **30 days**, renew manually and do not automatically debit the seller. Repurchase extends the remaining validity by 30 days and applies the purchased quota immediately; no proration is implemented. Plan versioning is limited to order snapshots.

On expiry, records remain in the database and only the newest free allowance is public. Seller dashboards retain access to the rest. Sellers can pause products to change the visible set. At most 8 images are offered in the editor; a database hard ceiling is 12. Images are up to 5 MB each. Total-storage metering and lifecycle cleanup require additional implementation before an unrestricted large-catalogue launch.

## Catalogue imports

CSV columns: `sku,title,category,price,condition,location,images,social_url,tags,description`. Use `|` between image URLs. Import requires an SKU and an existing category. Importing the same SKU updates the existing record and sets it to draft. It can overwrite that product's previous data: export/backup first. Images are linked; they are not scraped or downloaded from arbitrary URLs. Keep the import page open. A durable background import queue and XLSX support are not yet included.

## Security and privacy

RLS governs access even when frontend routes are bypassed. Privileged server secrets remain in Vercel environment variables. Public seller contact information is intentionally public. Message text is never sent to our backend. External video providers may collect data only after the visitor loads their player. Unknown URLs are not embedded as arbitrary HTML.

Schema tests use PGlite and simulated Supabase roles; they do not replace live Supabase Auth/Storage testing. Admin MFA, abuse-rate tuning, server-enforced aggregate upload budgets, backup/restore exercises and automated payment reconciliation remain release gates for larger production use.

## Architecture

React/Vite client; Supabase Auth/Postgres/Storage; Vercel Node functions for package payments; external WhatsApp for conversations. Modules live in `src/pages`, shared UI in `src/components`, domain helpers in `src/lib`, SQL in `database`, billing handlers in `api`. The original Product Design worker remains available for static preview, but production payments target Vercel.

The current site is a client-rendered SPA. Per-listing server-rendered SEO/social metadata, native app packaging and automatic social-feed imports are future work; do not claim these exist.
