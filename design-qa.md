# Design and interaction QA — 3 October 2026

Result: blocked

The desktop and 390 × 844 mobile interfaces render and are usable in local visual review. Full acceptance remains blocked by missing live services and reference-fidelity differences below; this is not a production-ready declaration.

## Evidence

- `docs/qa/desktop.jpg`: current desktop homepage, captured after a clean page load.
- `docs/qa/mobile.jpg`: 390px mobile review; heading stays within the light hero panel and fixed bottom navigation is visible.
- `docs/qa/comparison.jpg`: approved design board beside implementation, each proportionally fitted without stretching. This is a visual comparison, not a pixel-diff test.

## Confirmed

Forest-green category bar, saffron actions, serif headings, local handloom hero, four-column desktop products and two-column mobile products preserve the chosen visual direction. The hamburger precedes the logo. Mobile drawer exposes categories and seller links. Desktop has no compact bottom navigation. Pinch zoom is not disabled.

Browser checks cover keyword search, product enquiry, seller category-specific fields, social inputs, admin preview navigation and editing dialog. The admin removal action is now inside the modal and reachable. The real `/admin` route displays the sign-in gate, with sign-in disabled while account services are unconfigured. Development previews do not grant a real session.

A clean desktop page load reported no application errors; one browser-extension metadata error was unrelated to the app. Previous hot-reload context error did not reproduce after reload.

## Differences still requiring design acceptance

The implemented desktop uses more generous header, hero and section spacing than the approved board. Product photography is substituted with available/generated assets; the illustrative logo is replaced by a consistent storefront icon. Homepage microcopy is expanded. The mobile hero is taller and places category shortcuts after the hero. These are not exact reference matches. No exact visual-parity claim is made.

## External acceptance

Real signup, uploads, subscription payments, social embeds on physical phones, installed PWA behaviour and deployed response headers require configured services/device testing. See BUILD-STATUS.md for scope and launch requirements.

## v0.4.0 showcase continuation

The user requested public production samples and distinct category templates. The existing homepage visual direction is retained. /templates now provides five category choices; sample shop pages have ten working collections in total. Browser review confirms motorcycle selection, navigation to Leikai Rides, and Touring filtering from three products down to one. A low-contrast paragraph on dark template panels was corrected. Template screenshot: docs/qa/templates-v040.jpg. Automated showcase integrity tests pass and the production build emits the sample catalogue chunk. A separate browser production-preview port was blocked by the browser client, so interactive review used the managed development preview. Remote deployment of this update remains blocked by GitHub integration write permissions.

## v0.5.0 categories

Reviewed the category directory in the managed browser, including warehouse keyword search, Pallet racks navigation and Build & industry grouping. Screenshot: docs/qa/categories-v050.jpg. Department icons use the existing Phosphor visual style. Responsive CSS provides three/two/one columns; physical mobile verification is still pending. Production build passes.

## v0.6.0 product tools

Browser checked at desktop and 390px width. Clothing mouse hover switches to back view; a pointer event implementation supports mouse/pen without triggering sticky hover on touch. Mobile thumbnails change the main photo without horizontal overflow. Selecting M and quantity 2 produces ₹1,300 for the sample T-shirt; sample enquiries expose no WhatsApp link. Sold-out toys disable purchase requests. Mixed-store electrical filtering returns the batteries only. Seller preview verified photo reordering, category-dependent vehicle fields, and video URL entry. Browser error report was empty. Screenshot files: product-v060.png, product-mobile-v060.png, seller-editor-v060.png in docs/qa. Full-page screenshots include the fixed compact navigation at the capture viewport boundary. Real device and connected-service checks remain pending.
