# Public showcase — v0.4.0

This update keeps sample shops and products visible on Vercel as requested. It provides five category templates, five fictional shops, ten shop collections and seventeen sample products. All sample prices, specifications and photographs are illustrative. No sample has a contact number or can accept a real purchase.

## Apply on your Windows laptop

From the existing D:\eManipur\emarket folder, stop the dev server with Ctrl+C. Extract the CONTENTS of this update archive into that same folder and replace the included files. Keep your existing .git and .env.local. No dependency versions have changed.

Run `npm run build`. If successful, run `git add .`, `git commit -m "Add public sample shops and storefront templates"`, then `git push origin main`. Existing GitHub-linked Vercel projects redeploy the commit automatically. Do not create another Vercel project.

## Samples on / off

Public samples appear by default when Supabase is not configured, locally and in production. There is no need to set VITE_PREVIEW_MODE on Vercel.

To remove ALL samples: set VITE_SHOW_SAMPLES=false in Vercel Environment Variables and redeploy. For local development set the same variable in .env.local and restart Vite. Real Supabase configuration also takes precedence over the entire sample catalogue. This update does not mix demo records with live records and does not delete any real database data.

To remove individual samples before connecting a database, edit src/lib/preview-data.js, commit and push. Samples are code-based placeholders, so the database admin editor does not edit them. Adding a real backend replaces this sample catalogue with actual shops/products.

## Templates

/templates lets visitors select a category and inspect the matching sample shop. Seller onboarding offers category-based template selection plus manual template selection. A template choice made before login is carried through to seller onboarding. Shops can change their presentation later.

Fresh database installs use the updated database/schema.sql. Existing dedicated marketplace databases must run database/migrations/004_store_templates.sql before saving the new motorcycle template. No database was changed by this update.

## Verification and deployment

Automated tests cover sample categories, all five themes, collection ownership, product photo files and absence of contact numbers, alongside existing RLS/payment/domain tests. Production build contains the showcase data chunk.

Browser review: template selection, motorcycle sample shop, collection filtering and sample product labels. Existing auth and account restrictions remain intact. Real account services, uploads and payments still require service setup.

GitHub integration write access remains blocked (HTTP 403). This update has NOT been installed on your live site until you push these files from your laptop or reconnect the integration with write access.
