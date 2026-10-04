# Onlinekeithel v0.7.0

The selected roof-and-arch logo is included as SVG for the website and rendered PNG icons for the PWA. The previous public samples and independent shop names remain.

## Install on Windows

Stop the local dev server, download the complete v0.7.0 ZIP, then run these commands in PowerShell one by one:

```powershell
cd D:\eManipur\emarket
git switch main
git pull --ff-only origin main
Expand-Archive "$env:USERPROFILE\Downloads\emarket-v0.7.0-full-source.zip" -DestinationPath . -Force
npm ci
npm test
npm run build
git add .
git status --short
git commit -m "Brand marketplace Onlinekeithel and group construction"
git push origin main
```

GitHub main is connected to Vercel. Check the deployment status and the live header, Construction dropdown, `/categories`, and `/search?department=construction` after the push.

If a dedicated marketplace Supabase project is already configured, apply any outstanding earlier migrations followed by `database/migrations/006_onlinekeithel_construction.sql` to that project before enabling the new seller options. Do not run the full schema over an existing database. With no backend configured, public labelled samples work without SQL setup; real seller accounts and uploads do not.
