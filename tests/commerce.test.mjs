import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  normalizeCommerce,
  normalizeVideos,
  normalizePayments,
  validateSelection,
  selectedPrice,
  outOfStock,
  normalizeProductImport,
} from "../src/lib/commerce.js";
const item = {
  price: 199,
  status: "published",
  commerce: {
    mode: "retail",
    stock: null,
    variants: [
      { id: "s", label: "S", stock: 2, price: 149.5 },
      { id: "m", label: "M", stock: 0, price: null },
    ],
  },
};
test("sizes, stock and quantities prevent unavailable or excess purchase enquiries", () => {
  assert.throws(() => validateSelection(item, "", 1), /Choose/);
  assert.throws(() => validateSelection(item, "m", 1), /exceeds/);
  assert.throws(() => validateSelection(item, "s", 3), /exceeds/);
  for (const q of [0, -1, 1.5, NaN, 1000])
    assert.throws(() => validateSelection(item, "s", q));
  assert.equal(validateSelection(item, "s", 2), true);
  assert.equal(selectedPrice(item, "s"), 149.5);
  assert.equal(selectedPrice(item, "m"), 199);
  assert.equal(outOfStock(item), false);
  assert.equal(outOfStock({ ...item, status: "sold" }), true);
  assert.throws(
    () => validateSelection({ ...item, commerce: { mode: "enquiry" } }, "", 2),
    /enquiry only/,
  );
  assert.equal(validateSelection({ price: 0, commerce: {} }, "", 1), true);
  assert.throws(() => normalizeCommerce({ stock: -1 }));
  assert.throws(() =>
    normalizeCommerce({
      variants: [
        { id: "x", label: "S", stock: 1 },
        { id: "y", label: "s", stock: 1 },
      ],
    }),
  );
});
test("video and payment fields accept supported data and reject executable or deceptive URLs", () => {
  assert.equal(
    normalizeVideos([
      { url: "https://youtu.be/abcdefghijk", title: "Walkaround" },
    ]).length,
    1,
  );
  assert.equal(
    normalizeVideos([{ url: "https://media.example/a.mp4?token=123" }]).length,
    1,
  );
  for (const url of [
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=1",
    "http://media.example/a.mp4",
  ])
    assert.throws(() => normalizeVideos([{ url }]));
  assert.throws(() => normalizePayments({ upi_id: "bad&x=1" }));
  assert.throws(() => normalizePayments({ upi_qr: "javascript:alert(1)" }));
  assert.equal(normalizePayments({ upi_id: "shop@bank" }).upi_id, "shop@bank");
});
test("database enforces inventory, variants, clothing galleries, video and UPI validation", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create schema private;create table listings(id int primary key,category_id text,status text,images jsonb,seller_id int,title text,description text,tags text,socials jsonb,attributes jsonb,subcategory_id text);create table sellers(id int primary key,suspended boolean,name text);create table categories(id text,fields jsonb,name text,subcategories jsonb);",
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261003170727_product_options.sql",
        "utf8",
      ),
    );
    const add = (id, commerce) =>
      db.query(
        "insert into listings(id,category_id,status,images,commerce) values($1,'electronics','published','[]',$2)",
        [id, JSON.stringify(commerce)],
      );
    await add(1, normalizeCommerce(item.commerce));
    await assert.rejects(() => add(2, { stock: -1 }), /stock/);
    await assert.rejects(
      () => add(2, { variants: [{ id: "s", label: "S", stock: 1.2 }] }),
      /stock/,
    );
    await assert.rejects(
      () =>
        add(2, {
          variants: [
            { id: "s", label: "S", stock: 1 },
            { id: "s", label: "M", stock: 1 },
          ],
        }),
      /unique/,
    );
    await assert.rejects(
      () =>
        add(2, {
          variants: [
            { id: "s", label: "S", stock: 1 },
            { id: "m", label: "s", stock: 1 },
          ],
        }),
      /unique/,
    );
    await assert.rejects(
      () =>
        add(2, { variants: [{ id: "s", label: "S", stock: 1, price: -1 }] }),
      /price/,
    );
    await assert.rejects(
      db.exec(
        "insert into listings(id,category_id,status,images) values(2,'fashion','published','[\"a\"]')",
      ),
      /front, back/,
    );
    await db.exec(
      "insert into listings(id,category_id,status,images) values(2,'fashion','draft','[\"a\"]')",
    );
    await assert.rejects(
      db.exec("update listings set status='published' where id=2"),
      /front, back/,
    );
    await db.exec(
      'update listings set images=\'["a","b","c","d"]\',status=\'published\' where id=2',
    );
    await assert.rejects(
      db.exec(
        'update listings set videos=\'[{"url":"javascript:alert(1)"}]\' where id=1',
      ),
      /video/,
    );
    await db.exec(
      'update listings set videos=\'[{"url":"https://cdn.test/file.mp4"}]\' where id=1',
    );
    await db.exec("insert into sellers(id) values(1)");
    await assert.rejects(
      db.exec(
        'update sellers set payment_options=\'{"upi_id":"wrong"}\' where id=1',
      ),
      /UPI/,
    );
    await db.exec(
      'update sellers set payment_options=\'{"upi_id":"shop@bank","cash_on_collection":true}\' where id=1',
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261003170727_product_options.sql",
        "utf8",
      ),
    );
  } finally {
    await db.close();
  }
});

test("bulk import supports options, stock and videos while retaining legacy CSV support", () => {
  const seller = { id: "test", location: "Imphal" },
    categories = [{ id: "electronics", name: "Electronics" }];
  const row = {
    sku: "AA",
    title: "Battery pack",
    price: "99.50",
    category: "electronics",
    images: "https://example.com/a.jpg",
  };
  assert.equal(
    normalizeProductImport(row, seller, categories).commerce,
    undefined,
  );
  const full = normalizeProductImport(
    {
      ...row,
      selling_mode: "retail",
      stock: "10",
      video_urls: "https://cdn.test/video.mp4",
      attributes_json: '{"Brand":"Sample"}',
    },
    seller,
    categories,
  );
  assert.equal(full.commerce.stock, 10);
  assert.equal(full.attributes.Brand, "Sample");
  assert.equal(full.videos.length, 1);
  assert.throws(() =>
    normalizeProductImport(
      { ...row, variants_json: "invalid" },
      seller,
      categories,
    ),
  );
  assert.throws(() =>
    normalizeProductImport({ ...row, stock: "1.2" }, seller, categories),
  );
});
