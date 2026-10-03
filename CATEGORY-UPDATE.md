# Category update v0.5.0

This cumulative update includes the v0.4 public sample shops and the v0.5 catalogue: 31 categories and 331 subcategories.

## Windows installation

Stop your local dev server before extracting. In PowerShell, run each command in order, stopping if one fails:

```powershell
cd D:\eManipur\emarket
Expand-Archive "$env:USERPROFILE\Downloads\emarket-v0.5.0-update.zip" -DestinationPath . -Force
npm ci
npm run build
git add .
git commit -m "Add comprehensive categories and subcategories"
git push origin main
```

The connected Vercel project should automatically deploy the pushed commit. Check its deployment status before refreshing the live /categories page.

If you have connected a real Supabase database, apply the outstanding migrations in order, including database/migrations/004_store_templates.sql then 005_categories.sql, using that marketplace database only. No database setup is required for public sample viewing. Do not rerun the full schema over an existing installation.

See docs/CATEGORY-GUIDE.md for the complete researched taxonomy and public/category-reference.csv for import identifiers. This archive contains changed files, not a complete standalone project.
