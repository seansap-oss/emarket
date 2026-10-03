import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  sellers,
  listings,
  collections,
  categories,
} from "../src/lib/preview-data.js";
import { templates, templateForCategory } from "../src/lib/templates.js";
test("sample catalogue has complete shops, categories, collections and local assets without contacts", () => {
  assert.equal(sellers.length, 5);
  for (const [theme, t] of Object.entries(templates)) {
    const seller = sellers.find((s) => s.slug === t.sample);
    assert.equal(seller.theme, theme);
    assert.equal(seller.whatsapp, "");
    assert.equal(seller.sample, true);
    assert.ok(listings.filter((p) => p.seller_id === seller.id).length >= 3);
  }
  for (const listing of listings) {
    assert.equal(listing.sample, true);
    assert.ok(categories.some((c) => c.id === listing.category_id));
    assert.ok(
      collections.some(
        (c) =>
          c.id === listing.collection_id && c.seller_id === listing.seller_id,
      ),
    );
    assert.ok(listing.images.every((src) => existsSync("public" + src)));
  }
  assert.equal(templateForCategory("fashion"), "fashion");
  assert.equal(templateForCategory("mobiles"), "electronics");
  assert.equal(templateForCategory("motorcycles"), "motorcycles");
  assert.equal(templateForCategory("retail"), "general");
});
