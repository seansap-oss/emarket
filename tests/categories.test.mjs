import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {categoryCatalog,categoryMatches,subcategoriesFor,constructionCategories} from '../src/lib/categories.js';
import {listings} from '../src/lib/preview-data.js';
import {PGlite} from '@electric-sql/pglite';
test('taxonomy has unique IDs, valid icons, key construction disciplines and valid sample mappings',()=>{
 assert.equal(categoryCatalog.length,31);
 assert.equal(new Set(categoryCatalog.map(c=>c.id)).size,31);
 for(const c of categoryCatalog){
  assert.ok(existsSync('node_modules/@phosphor-icons/react/dist/csr/'+c.icon+'.es.js'));
  assert.equal(new Set(c.subcategories.map(s=>s.id)).size,c.subcategories.length);
  assert.ok(c.subcategories.every(s=>s.name&&/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)));
 }
 assert.ok(categoryMatches(categoryCatalog.find(c=>c.id==='warehouse'),'pallet racks'));
 assert.ok(categoryMatches(categoryCatalog.find(c=>c.id==='architecture'),'structural'));
 const construction=constructionCategories(categoryCatalog);
 assert.ok(['construction','architecture','contractors','warehouse'].every(id=>construction.some(c=>c.id===id)));
 assert.ok(['bricklayers-masons','handyman-repairs','construction-labourers','site-supervisors'].every(id=>subcategoriesFor(categoryCatalog,'contractors').some(s=>s.id===id)));
 for(const p of listings)assert.ok(subcategoriesFor(categoryCatalog,p.category_id).some(s=>s.id===p.subcategory_id),p.id);
});
test('database enforces parent-child category integrity and protects categories in use',async()=>{
 const db=new PGlite();
 await db.exec("create schema private;create table public.categories(id text primary key,name text,theme text,fields jsonb,position int,active boolean);create table public.settings(id text primary key,value jsonb);create table public.sellers(id text primary key,name text,suspended boolean);create table public.listings(id text primary key,category_id text references public.categories(id),seller_id text,title text,description text,tags text,socials jsonb,attributes jsonb,status text);");
 await db.exec(readFileSync('database/migrations/005_categories.sql','utf8'));
 await db.exec("insert into public.listings(id,category_id,subcategory_id) values('valid','construction','cement-binders')");
 await assert.rejects(db.exec("insert into public.listings(id,category_id,subcategory_id) values('bad','construction','residential-architects')"),/Subcategory/);
 await assert.rejects(db.exec("update public.listings set category_id='architecture' where id='valid'"),/Subcategory/);
 await assert.rejects(db.exec("update public.categories set subcategories='[]' where id='construction'"),/Cannot remove/);
 await db.exec("insert into public.listings(id,category_id) values('legacy','construction')");
 await db.exec("insert into public.settings(id,value) values('marketplace','{\"name\":\"Leikai Market\",\"tagline\":\"Local\"}')");
 const update=readFileSync('database/migrations/006_onlinekeithel_construction.sql','utf8');
 await db.exec(update);
 await db.exec(update);
 const {rows:[{name,count}]}=await db.query("select (select value->>'name' from public.settings where id='marketplace') name,(select count(*) from jsonb_array_elements(subcategories) where value->>'id'='bricklayers-masons') count from public.categories where id='contractors'");
 assert.equal(name,'Onlinekeithel');
 assert.equal(Number(count),1);
 const {rows:[listing]}=await db.query("select category_id,subcategory_id from public.listings where id='valid'");
 assert.deepEqual(listing,{category_id:'construction',subcategory_id:'cement-binders'});
 await db.close();
});
