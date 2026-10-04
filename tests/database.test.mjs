import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const A = "00000000-0000-4000-8000-000000000001",
  B = "00000000-0000-4000-8000-000000000002",
  ADMIN = "00000000-0000-4000-8000-000000000003";
test("database permissions, quotas, campaign approval and payment idempotency", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role; insert into auth.users values('${A}'),('${B}'),('${ADMIN}');`,
    );
    await db.exec(
      await readFile(
        new URL("../database/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const storefrontMigration = await readFile(
      new URL(
        "../database/migrations/007_storefront_pages.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(storefrontMigration);
    await db.exec(storefrontMigration);
    await db.exec(`insert into public.admins values('${ADMIN}');`);
    const role = async (id, r = "authenticated") =>
      db.exec(
        `reset role;set role ${r};select set_config('request.jwt.claim.sub','${id}',false);`,
      );
    await role(A);
    const sa = (
      await db.query(
        `insert into sellers(user_id,name,slug,whatsapp) values($1,'Shop A','shop-a','919876543210') returning id`,
        [A],
      )
    ).rows[0].id;
    await db.query("update sellers set storefront=$1 where id=$2", [
      JSON.stringify({ headline: "Made in Imphal", color: "plum" }),
      sa,
    ]);
    assert.equal(
      (await db.query("select storefront from sellers where id=$1", [sa]))
        .rows[0].storefront.headline,
      "Made in Imphal",
    );
    await role(B);
    const sb = (
      await db.query(
        `insert into sellers(user_id,name,slug,whatsapp) values($1,'Shop B','shop-b','919876543211') returning id`,
        [B],
      )
    ).rows[0].id;
    assert.equal(
      (await db.query("select storefront from sellers where id=$1", [sb]))
        .rows[0].storefront.headline,
      undefined,
    );
    assert.equal(
      (await db.query("select * from sellers where id=$1", [sa])).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update sellers set storefront='{}' where id=$1 returning id",
          [sa],
        )
      ).rows.length,
      0,
    );
    const add = async (s, title = "Product") =>
      (
        await db.query(
          `insert into listings(seller_id,category_id,title,price,images,status) values($1,'fashion',$2,100,'["https://example.com/a.jpg","https://example.com/b.jpg","https://example.com/c.jpg","https://example.com/d.jpg"]','published') returning id`,
          [s, title],
        )
      ).rows[0].id;
    await assert.rejects(() => add(sa), /access denied|row-level security/);
    await role(A);
    const la = await add(sa);
    await add(sa);
    await add(sa);
    await assert.rejects(() => add(sa), /limit reached/);
    await assert.rejects(
      () => db.query(`update sellers set suspended=true where id=$1`, [sa]),
      /Only admin/,
    );
    await role(B);
    assert.equal(
      (
        await db.query(
          `update listings set title='Hijacked' where id=$1 returning id`,
          [la],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      () =>
        db.query(
          `insert into entitlements values($1,'catalogue',15000,now()+interval '30 days',now())`,
          [sb],
        ),
      /row-level security/,
    );
    await role(A);
    await assert.rejects(
      () =>
        db.query(
          `insert into campaigns(seller_id,title,destination,starts_at,ends_at,status,paid) values($1,'My ad','/seller/shop-a',now(),now()+interval '1 day','approved',true)`,
          [sa],
        ),
      /approval/,
    );
    const campaign = (
      await db.query(
        `insert into campaigns(seller_id,title,destination,starts_at,ends_at) values($1,'My ad','/seller/shop-a',now()-interval '1 day',now()+interval '1 day') returning id`,
        [sa],
      )
    ).rows[0].id;
    await role("", "anon");
    assert.equal((await db.query("select * from campaigns")).rows.length, 0);
    assert.equal((await db.query("select * from listings")).rows.length, 3);
    await role(ADMIN);
    await db.query(
      `update campaigns set status='approved',paid=true where id=$1`,
      [campaign],
    );
    await role("", "anon");
    assert.equal((await db.query("select * from campaigns")).rows.length, 1);
    await role(A);
    await db.query(
      `update campaigns set title='Changed creative' where id=$1`,
      [campaign],
    );
    assert.equal(
      (await db.query("select status from campaigns")).rows[0].status,
      "pending",
    );
    await role("", "service_role");
    await db.query(
      `insert into billing_orders(seller_id,plan_id,listing_limit,amount,gateway_order_id) values($1,'starter',50,50000,'order_1')`,
      [sa],
    );
    await db.query(`select fulfill_order('order_1','payment_1')`);
    const expiry = (
      await db.query(`select expires_at from entitlements where seller_id=$1`, [
        sa,
      ])
    ).rows[0].expires_at;
    await db.query(`select fulfill_order('order_1','payment_1')`);
    assert.equal(
      String(
        (
          await db.query(
            `select expires_at from entitlements where seller_id=$1`,
            [sa],
          )
        ).rows[0].expires_at,
      ),
      String(expiry),
    );
    await role(A);
    await add(sa);
    await assert.rejects(
      () => db.query(`select fulfill_order('order_1','payment_1')`),
      /permission denied/,
    );
    await role(ADMIN);
    await db.query(
      `update entitlements set expires_at=now()-interval '1 day' where seller_id=$1`,
      [sa],
    );
    await role("", "anon");
    assert.equal((await db.query("select * from listings")).rows.length, 3);
    await role(A);
    assert.equal((await db.query("select * from listings")).rows.length, 4);
    await role(ADMIN);
    await db.query(`update sellers set suspended=true where id=$1`, [sa]);
    await role("", "anon");
    assert.equal((await db.query("select * from listings")).rows.length, 0);
  } finally {
    await db.close();
  }
});
