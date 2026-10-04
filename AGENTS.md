# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Marketplace decisions — 3 October 2026

- GitHub destination: seansap-oss/emarket. Hosting target: Vercel.
- Use the first approved design: forest green, warm saffron, white/cream, local handloom imagery.
- Messages are WhatsApp handoffs only. Never create chat history or imply that clicking the website sent a message.
- Marketplace layout stays consistent; sellers choose general/fashion/electronics/vehicles storefront themes.
- Header hamburger precedes logo. Compact bottom navigation is based on viewport width. Preserve pinch zoom.
- Never simulate a logged-in user or paid entitlement in production. Visual fixtures are dev-only.
- Use a separate Supabase project, never the existing IAS database. Provisioning awaits organisation selection.
- Admin is a verified auth account listed in the private admin membership table; no shared password.
- Update BUILD-STATUS.md honestly after verification and deployment. Do not call provider-dependent flows verified until exercised against configured services.

## Public showcase decision — v0.4.0

User explicitly requests placeholder shops/products on the live Vercel site, matching localhost. Public samples are now allowed and clearly labelled; sample records have no contact numbers and no purchase functionality. VITE_SHOW_SAMPLES=false removes samples on rebuild. A configured Supabase backend takes precedence. Admin/seller visual review routes remain development-only. Add a motorcycle storefront and automatic template selection by shop category.

## Category expansion — v0.5.0

Maintain one shared catalogue for navigation, seller forms, search and imports. Include construction materials, architects/designers, contractors, warehouse supplies, tools, electrical, plumbing, finishes, machinery and safety. Preserve stable existing category IDs. Subcategories belong to one parent. Use labelled Phosphor icons.

## Product tools — v0.6.0

Support independent listing categories within a mixed store. All plans include media, options, stock and direct-payment details; price tiers control active listing allowance (Business ₹2,000 / 1,000 items). Clothing requires front, back and two side photos when newly published; desktop mouse/pen hover switches cover to back and mobile uses thumbnails. Vehicle specifications include condition, kilometres, ownership, transmission and history. Buyers choose variants and quantities, then request purchases through WhatsApp. This is not a confirmed order or stock reservation. Direct UPI details/QR are seller-provided and transfers remain unverified. Product Razorpay checkout and automatic inventory settlement are a later phase distinct from the existing seller-package payment handlers.
