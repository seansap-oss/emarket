import test from "node:test";
import assert from "node:assert/strict";
import { storefrontSettings, shopPath } from "../src/lib/storefront.js";

test("storefront settings preserve template defaults and constrain design choices", () => {
  assert.equal(shopPath("leikai-handlooms"), "/shop/leikai-handlooms");
  const old = storefrontSettings({
    name: "Old shop",
    theme: "fashion",
    description: "Hello",
  });
  assert.equal(old.color, "theme");
  assert.equal(old.introduction, "Hello");
  assert.match(old.headline, /story/);
  const custom = storefrontSettings({
    theme: "general",
    storefront: {
      headline: "Our shop",
      color: "plum",
      font: "editorial",
      showVideo: false,
    },
  });
  assert.equal(custom.headline, "Our shop");
  assert.equal(custom.color, "plum");
  assert.equal(custom.showVideo, false);
  assert.deepEqual(
    storefrontSettings({
      storefront: {
        sections: ["gallery", "about", "video", "unknown", "gallery"],
      },
    }).sections,
    ["gallery", "about", "video"],
  );
  assert.equal(
    storefrontSettings({
      storefront: { gallery: Array(9).fill("/images/photo.jpg") },
    }).gallery.length,
    6,
  );
  assert.equal(
    storefrontSettings({
      storefront: { color: "red;background:url(x)", font: "malicious" },
    }).color,
    "theme",
  );
  assert.equal(
    storefrontSettings({ storefront: { font: "malicious" } }).font,
    "classic",
  );
});
