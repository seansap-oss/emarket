import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  whatsappUrl,
  socialUrl,
  embedUrl,
  normalizeImport,
  searchable,
} from "../src/lib/utils.js";
import { verifySignature } from "../api/_lib/server.js";
test("WhatsApp handoff includes country code and safely encoded enquiry", () => {
  const u = new URL(
    whatsappUrl(
      "+91 98765 43210",
      "Hi & thanks!\nhttps://market.test/listing/1",
    ),
  );
  assert.equal(u.hostname, "wa.me");
  assert.equal(u.pathname, "/919876543210");
  assert.equal(
    u.searchParams.get("text"),
    "Hi & thanks!\nhttps://market.test/listing/1",
  );
  assert.equal(whatsappUrl("javascript:alert(1)", "x"), "");
});
test("social URLs reject executable URLs and deceptive hosts", () => {
  for (const u of [
    "javascript:alert(1)",
    "http://instagram.com/p/a",
    "https://instagram.com.evil.test/p/a",
    "https://evil.test",
  ])
    assert.equal(socialUrl(u), "");
  assert.ok(socialUrl("https://www.instagram.com/p/ABC/"));
  assert.equal(
    embedUrl("https://youtu.be/abcdefghijk"),
    "https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1",
  );
});
test("search includes user-entered keywords and exact social URLs", () => {
  assert.ok(
    searchable({
      title: "T-shirt",
      socials: { instagram: "https://instagram.com/p/test" },
      attributes: { Colour: "Green" },
      seller: { name: "Local Store" },
    }).includes("instagram.com/p/test"),
  );
  assert.ok(searchable({ attributes: { Colour: "Green" } }).includes("green"));
});
test("CSV validates categories, prices and media before importing", () => {
  const c = [{ id: "fashion", name: "Fashion" }],
    s = { id: "seller", location: "Imphal" },
    r = {
      sku: "A1",
      title: "T-shirt",
      price: "499",
      category: "fashion",
      images: "https://example.com/a.jpg",
    };
  assert.equal(normalizeImport(r, s, c).status, "draft");
  assert.throws(() => normalizeImport({ ...r, price: "-1" }, s, c));
  assert.throws(() => normalizeImport({ ...r, category: "invalid" }, s, c));
  assert.throws(() => normalizeImport({ ...r, images: "javascript:x" }, s, c));
  assert.throws(() => normalizeImport({ ...r, sku: "" }, s, c));
});
test("payment authentication rejects tampering, malformed and missing signatures", () => {
  const sig = createHmac("sha256", "test-secret")
    .update("order|payment")
    .digest("hex");
  assert.equal(verifySignature("order|payment", sig, "test-secret"), true);
  assert.equal(verifySignature("order|attacker", sig, "test-secret"), false);
  assert.equal(verifySignature("order|payment", "x", "test-secret"), false);
  assert.equal(verifySignature("order|payment", sig, ""), false);
});
