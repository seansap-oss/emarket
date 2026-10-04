# Onlinekeithel v0.8.0 — storefront update

The full-source archive includes the v0.7 brand/construction work and the v0.8 seller storefront update. See `docs/STOREFRONTS.md` for the new controls. No domain has been purchased or connected by this update.

## Update the Windows checkout

Download `emarket-v0.8.0-full-source.zip` to Downloads. In PowerShell, make sure your repository has no unrelated uncommitted changes before replacing files:

```powershell
cd D:\eManipur\emarket
git switch main
git pull --ff-only origin main
Expand-Archive "$env:USERPROFILE\Downloads\emarket-v0.8.0-full-source.zip" -DestinationPath . -Force
npm ci
npm test
npm run build
git add .
git status --short
git commit -m "Add shareable seller storefronts"
git push origin main
```

Your linked Vercel project should build from the pushed GitHub commit. Browse `/shop/leikai-handlooms` on the deployment to see a labelled sample. The seller editor lives in **Dashboard → Shop identity** after a real account is connected.

If the dedicated marketplace Supabase database already exists, apply any outstanding earlier migrations followed by `database/migrations/007_storefront_pages.sql` before using the editor. For a completely new marketplace database, follow the README's fresh schema and storage setup; do not rerun `database/schema.sql` against existing data. Without backend settings, the public samples work but sign-up, uploads and saved edits do not.
