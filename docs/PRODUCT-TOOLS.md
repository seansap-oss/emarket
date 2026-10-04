# Product tools — v0.6.0

## Sellers

A shop may list across all categories regardless of its theme. Use collections as your own departments; each product keeps its global category and subcategory. All current packages include these tools, including the ₹2,000 Business plan (1,000 active listings). Package payments and featured campaigns remain separate.

- Upload or link up to 12 JPG/PNG/WebP photos (5 MB each). Remove a photo to replace it, or move it earlier with the arrow. The first photo is the cover.
- For clothing, put front/back/left/right in the first four positions. New publication requires all four. Hover with a mouse or pen to reveal the back. Touch users and keyboard users can select gallery thumbnails. Existing one-photo catalogue records remain readable; update their gallery before republishing.
- Add up to six public YouTube/Instagram/Facebook links or direct HTTPS MP4/WebM URLs. Short videos can be uploaded (6 MB); use hosted links for longer clips. Embedded platform playback depends on public availability and provider permission.
- Vehicle details include make/model/year, kilometres, fuel, transmission, owners, body type, engine capacity, insurance and service/accident history. Condition remains New/Used/Refurbished. Details are seller declarations.
- Choose Retail for quantities/options, or Enquiry for vehicles, property, services or quotations. Clothing has an XS–XXL shortcut. Add custom size/colour/pack combinations as separate options. Each option has its own stock count and optional price override. Blank price uses the base product price.
- Zero stock makes an item/option unavailable. Blank overall stock means availability must be confirmed. With options, individual option counts determine availability. Change stock yourself after confirming sales; enquiries do not reserve or deduct stock.
- Your shop profile contains public UPI ID, recipient name, QR image, cash-on-collection/delivery preferences and instructions. Do not upload private banking documents. Buyers must agree availability and final price with you first.

## Buyers

Select an available option and quantity to see the item subtotal. Delivery/fees are agreed separately. Request to buy opens a summary that is handed to WhatsApp, where the buyer presses Send. No conversation is saved by this app. Sample listings cannot send messages or payments. UPI ID copying and seller QR viewing do not confirm a transaction. The marketplace does not mark products paid or issue payment receipts.

## Bulk import

The existing CSV fields remain supported. Optional columns: `selling_mode` (retail/enquiry), `stock` (whole number, blank = ask seller), `unit`, `delivery`, `video_urls` (pipe-separated), `variants_json`, `attributes_json`. Omit a new optional column entirely to retain its existing value during an SKU update. Including blank option/video columns clears those values. Imports remain drafts for review.

Example variants JSON (quote/escape normally when placed in CSV):

```json
[{"id":"size-s-blue","label":"S · Blue","stock":4,"price":499},{"id":"size-m-blue","label":"M · Blue","stock":0,"price":null}]
```

Example attributes JSON:

```json
{"Make":"Maruti Suzuki","Model":"Swift","Year":"2022","Kilometres":"28000","Fuel":"Petrol","Transmission":"Manual"}
```

## Database upgrade

For an existing dedicated marketplace Supabase database, apply outstanding prior migrations, including `database/migrations/004_store_templates.sql` and `005_categories.sql`, then run `supabase/migrations/20261003170727_product_options.sql`. This adds JSON fields with database validation, preserves legacy listings, upgrades keyword search and increases the existing media bucket limit to 6 MB with MP4/WebM support. It does not alter ownership/RLS permissions. Migration reruns are safe.

For a new database, run `database/schema.sql` then `database/storage.sql`; schema already includes these changes. Do not rerun the full schema on an existing database. No database setup is needed for public sample viewing. No remote database has been migrated by this release.

## Payment boundary and next integration

UPI is direct seller-provided payment information. There is no automatic transaction verification. Product Razorpay checkout is intentionally deferred as requested, distinct from seller-package billing already in source. Before enabling automated marketplace checkout: implement server-created product orders, authoritative prices/stock reservation, seller merchant onboarding and settlement routing, idempotent verified payment webhooks, refunds, fulfilment tracking and real test-mode acceptance. A single platform API key must not silently treat product proceeds as seller settlements.

## Documentation reviewed

- Supabase standard uploads: https://supabase.com/docs/guides/storage/uploads/standard-uploads (standard uploads suitable for small files up to 6 MB; larger files should use resumable uploads).
- Supabase changelog: https://supabase.com/changelog.md
- NPCI UPI FAQs: https://www.npci.org.in/what-we-do/upi/faqs
- Razorpay Standard Checkout: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

## Verification limits

Automated tests exercise inventory/variant validation, bulk import, SQL triggers, existing RLS, quotas and billing logic. Browser review covers product selection, gallery interactions and shop filtering. Supabase signup, live upload/persistence, UPI transfers, physical phones and live Razorpay payments require a configured marketplace deployment; these are not claimed verified.
