# Install v0.6.1 on Windows

This complete source archive includes the marketplace, public samples, category catalogue and seller product tools reviewed in the mockup. Extract into your existing repository after stopping its dev server. It excludes generated build files, dependencies, secrets and Git history.

Run individually in PowerShell, stopping if a command fails:

```powershell
cd D:\eManipur\emarket
git switch main
git pull --ff-only origin main
Expand-Archive "$env:USERPROFILE\Downloads\emarket-v0.6.1-full-source.zip" -DestinationPath . -Force
npm ci
npm test
npm run build
git add .
git status --short
git commit -m "Release seller upload and product experience v0.6.1"
git push origin main
```

If a real marketplace Supabase backend is configured, apply any outstanding migrations in order as described in docs/PRODUCT-TOOLS.md before using new product fields. Do not run the full schema over existing data. Your connected Vercel project should deploy the GitHub update automatically. Confirm the deployment succeeds. Open /listing/sample-extra-0 to preview the clothing gallery/options when samples are enabled, or create a real product after configuring accounts. The visual seller mockup at /preview/seller is local development only; real production seller uploads require a configured Supabase project and a signed-in user.

The assistant's GitHub integration currently returns HTTP 403 for writes. This archive is the release handoff; GitHub and Vercel update only after the push above succeeds.
