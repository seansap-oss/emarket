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
