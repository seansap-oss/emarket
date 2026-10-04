-- Onlinekeithel v0.3: apply to a NEW dedicated Supabase project.
-- No messaging tables: enquiries leave the application via WhatsApp.
begin;
create schema if not exists private;
revoke all on schema private from public;
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.admins where user_id=auth.uid()) $$;
revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated, anon;
grant execute on function private.is_admin() to authenticated, anon;
create function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin() $$;
create table public.categories(id text primary key, name text not null, theme text not null default 'general', fields jsonb not null default '[]', position int not null default 0, active boolean not null default true);
create table public.plans(id text primary key, name text not null, price integer not null check(price>=0), listing_limit integer not null check(listing_limit>0), image_limit integer not null default 8 check(image_limit between 1 and 12), active boolean not null default true);
create table public.settings(id text primary key, value jsonb not null);
create table public.sellers(id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade, name text not null check(length(name) between 2 and 80), slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'), type text not null default 'individual' check(type in ('individual','shop')), theme text not null default 'general' check(theme in ('general','fashion','electronics','vehicles','motorcycles')), description text not null default '', location text not null default 'Imphal', whatsapp text not null check(whatsapp ~ '^[1-9][0-9]{7,14}$'), logo text not null default '', cover text not null default '', socials jsonb not null default '{}', storefront jsonb not null default '{}' check(jsonb_typeof(storefront)='object' and pg_column_size(storefront)<=8192), suspended boolean not null default false, created_at timestamptz not null default now());
create table public.entitlements(seller_id uuid primary key references public.sellers(id) on delete cascade, plan_id text not null references public.plans(id), listing_limit integer not null check(listing_limit>0), expires_at timestamptz not null, updated_at timestamptz not null default now());
create table public.collections(id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.sellers(id) on delete cascade, name text not null check(length(name) between 1 and 60), position int not null default 0, unique(seller_id,name), unique(id,seller_id));
create table public.listings(id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.sellers(id) on delete cascade, category_id text not null references public.categories(id), collection_id uuid, title text not null check(length(title) between 3 and 160), description text not null default '', price numeric(12,2) not null check(price>=0), condition text not null default 'New' check(condition in ('New','Used','Refurbished')), location text not null default 'Imphal', images jsonb not null default '[]' check(jsonb_typeof(images)='array' and jsonb_array_length(images)<=12), socials jsonb not null default '{}', attributes jsonb not null default '{}', tags text not null default '', sku text, status text not null default 'draft' check(status in ('draft','published','paused','sold','archived','rejected')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(seller_id,sku), foreign key(collection_id,seller_id) references public.collections(id,seller_id));
create index listing_category on public.listings(category_id,status,created_at desc);
create index listing_seller on public.listings(seller_id,status,created_at desc);
create index listing_collection on public.listings(collection_id);
create index listing_search on public.listings using gin(to_tsvector('simple',title||' '||description||' '||tags||' '||socials::text));
create table public.campaigns(id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.sellers(id) on delete cascade, title text not null check(length(title) between 3 and 100), description text not null default '', image text not null default '', video_url text not null default '', destination text not null, starts_at timestamptz not null, ends_at timestamptz not null, status text not null default 'pending' check(status in ('pending','approved','rejected','paused')), paid boolean not null default false, created_at timestamptz not null default now(), check(ends_at>starts_at));
create table public.billing_orders(id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.sellers(id), plan_id text not null references public.plans(id), listing_limit integer not null, amount integer not null check(amount>0), gateway_order_id text unique, gateway_payment_id text unique, status text not null default 'created' check(status in ('created','paid','failed')), created_at timestamptz not null default now());
create table public.reports(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id), listing_id uuid not null references public.listings(id) on delete cascade, reason text not null check(length(reason) between 5 and 500), resolved boolean not null default false, created_at timestamptz not null default now());
create table public.saved_listings(user_id uuid not null references auth.users(id) on delete cascade, listing_id uuid not null references public.listings(id) on delete cascade, primary key(user_id,listing_id));
create table public.audit_log(id bigint generated always as identity primary key, actor uuid, action text not null, entity text not null, entity_id text, created_at timestamptz not null default now());

create function private.owner(p_seller uuid) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.sellers where id=p_seller and user_id=auth.uid() and not suspended) $$;
revoke all on function private.owner(uuid) from public;
grant execute on function private.owner(uuid) to authenticated,anon;
create function private.listing_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare cap integer; used integer; imgs integer;
begin
 if TG_OP='UPDATE' and new.seller_id<>old.seller_id then raise exception 'A listing cannot change owner'; end if;
 if auth.uid() is not null and not private.is_admin() then
  if not private.owner(new.seller_id) then raise exception 'Seller access denied'; end if;
  if TG_OP='UPDATE' and old.status='rejected' then raise exception 'Contact support to restore a moderated listing'; end if;
  if new.status='rejected' then raise exception 'Only moderators can reject listings'; end if;
 end if;
 -- Serialize all quota changes for a seller, including concurrent API/import requests.
 perform pg_advisory_xact_lock(hashtextextended(new.seller_id::text,0));
 select listing_limit into cap from public.entitlements where seller_id=new.seller_id and expires_at>now();
 if cap is null then select listing_limit into cap from public.plans where id='free'; end if;
 if new.status='published' then
  select count(*) into used from public.listings where seller_id=new.seller_id and status='published' and id<>new.id;
  if used>=coalesce(cap,3) then raise exception 'Active listing limit reached. Pause a listing or upgrade your package.'; end if;
  if jsonb_array_length(new.images)=0 then raise exception 'Add at least one product photo'; end if;
  if not exists(select 1 from public.categories where id=new.category_id and active) then raise exception 'Category is unavailable'; end if;
 end if;
 if jsonb_typeof(new.socials)<>'object' or jsonb_typeof(new.attributes)<>'object' then raise exception 'Invalid listing details'; end if;
 new.updated_at=now(); return new;
end $$;
revoke all on function private.listing_guard() from public;
create trigger listing_guard before insert or update on public.listings for each row execute function private.listing_guard();
create function private.seller_guard() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if TG_OP='INSERT' and new.slug in ('admin','api','dashboard','login','sell','search','settings','support') then raise exception 'This shop address is reserved'; end if;
 if TG_OP='UPDATE' and (new.user_id<>old.user_id or new.id<>old.id) then raise exception 'Seller ownership is immutable'; end if;
 if not private.is_admin() then
  if TG_OP='INSERT' and new.suspended then raise exception 'Invalid seller state'; end if;
  if TG_OP='UPDATE' and new.suspended<>old.suspended then raise exception 'Only admin can change suspension'; end if;
 end if; return new; end $$;
create trigger seller_guard before insert or update on public.sellers for each row execute function private.seller_guard();
create function private.campaign_guard() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if not private.is_admin() then
  if TG_OP='INSERT' and (new.status<>'pending' or new.paid) then raise exception 'Campaign requires admin approval and payment'; end if;
  if TG_OP='UPDATE' then
   if new.seller_id<>old.seller_id or new.paid<>old.paid then raise exception 'Campaign owner/payment cannot change'; end if;
   new.status='pending';
  end if;
 end if; return new; end $$;
create trigger campaign_guard before insert or update on public.campaigns for each row execute function private.campaign_guard();
create function private.audit() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.audit_log(actor,action,entity,entity_id) values(auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id')); return coalesce(NEW,OLD); end $$;
revoke all on function private.audit() from public;
create trigger listing_audit after insert or update or delete on public.listings for each row execute function private.audit();
create trigger campaign_audit after insert or update or delete on public.campaigns for each row execute function private.audit();
create trigger settings_audit after insert or update or delete on public.settings for each row execute function private.audit();

-- Expired entitlements retain the catalogue; only the newest free allowance stays public.
create function private.public_listing(p_id uuid,p_seller uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sellers where id=p_seller and not suspended) and p_id in (
 select id from public.listings where seller_id=p_seller and status='published' order by created_at desc,id limit coalesce((select listing_limit from public.entitlements where seller_id=p_seller and expires_at>now()),(select listing_limit from public.plans where id='free'),3)) $$;
revoke all on function private.public_listing(uuid,uuid) from public;
grant execute on function private.public_listing(uuid,uuid) to anon,authenticated;

do $$ declare t text; begin foreach t in array array['categories','plans','settings','sellers','entitlements','collections','listings','campaigns','billing_orders','reports','saved_listings','audit_log'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy categories_read on public.categories for select using(active or private.is_admin());
create policy categories_admin on public.categories for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy plans_read on public.plans for select using(active or private.is_admin());
create policy plans_admin on public.plans for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy settings_read on public.settings for select using(true);
create policy settings_admin on public.settings for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy sellers_read on public.sellers for select using(not suspended or user_id=auth.uid() or private.is_admin());
create policy sellers_insert on public.sellers for insert to authenticated with check(user_id=auth.uid() and not suspended);
create policy sellers_update on public.sellers for update to authenticated using((user_id=auth.uid() and not suspended) or private.is_admin()) with check(user_id=auth.uid() or private.is_admin());
create policy collections_read on public.collections for select using(exists(select 1 from public.sellers where id=seller_id and not suspended) or private.owner(seller_id) or private.is_admin());
create policy collections_owner on public.collections for all to authenticated using(private.owner(seller_id) or private.is_admin()) with check(private.owner(seller_id) or private.is_admin());
create policy listings_read on public.listings for select using((status='published' and private.public_listing(id,seller_id)) or private.owner(seller_id) or private.is_admin());
create policy listings_owner on public.listings for all to authenticated using(private.owner(seller_id) or private.is_admin()) with check(private.owner(seller_id) or private.is_admin());
create policy entitlement_read on public.entitlements for select to authenticated using(private.owner(seller_id) or private.is_admin());
create policy entitlement_admin on public.entitlements for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy campaign_read on public.campaigns for select using((status='approved' and paid and starts_at<=now() and ends_at>now() and exists(select 1 from public.sellers where id=seller_id and not suspended)) or private.owner(seller_id) or private.is_admin());
create policy campaign_owner on public.campaigns for all to authenticated using(private.owner(seller_id) or private.is_admin()) with check(private.owner(seller_id) or private.is_admin());
create policy billing_read on public.billing_orders for select to authenticated using(private.owner(seller_id) or private.is_admin());
create policy reports_insert on public.reports for insert to authenticated with check(user_id=auth.uid() and not resolved);
create policy reports_read on public.reports for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy reports_admin on public.reports for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy saved_owner on public.saved_listings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy audit_admin on public.audit_log for select to authenticated using(private.is_admin());

grant select on public.categories,public.plans,public.settings,public.sellers,public.collections,public.listings,public.campaigns to anon,authenticated;
grant insert,update,delete on public.categories,public.plans,public.settings,public.collections,public.listings,public.campaigns,public.reports,public.saved_listings,public.entitlements to authenticated;
grant insert,update on public.sellers to authenticated;
grant select on public.entitlements,public.billing_orders,public.reports,public.saved_listings,public.audit_log to authenticated;
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;

-- Only the server payment handler can call this. Idempotency lives in the transaction.
create function public.fulfill_order(p_order text,p_payment text) returns void language plpgsql security invoker set search_path='' as $$
declare o public.billing_orders; until_at timestamptz;
begin
 select * into o from public.billing_orders where gateway_order_id=p_order for update;
 if not found then raise exception 'Unknown order'; end if;
 if o.status='paid' then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(o.seller_id::text,0));
 select greatest(now(),expires_at) into until_at from public.entitlements where seller_id=o.seller_id;
 insert into public.entitlements(seller_id,plan_id,listing_limit,expires_at) values(o.seller_id,o.plan_id,o.listing_limit,coalesce(until_at,now())+interval '30 days') on conflict(seller_id) do update set plan_id=excluded.plan_id,listing_limit=excluded.listing_limit,expires_at=excluded.expires_at,updated_at=now();
 update public.billing_orders set status='paid',gateway_payment_id=p_payment where id=o.id;
end $$;
revoke all on function public.fulfill_order(text,text) from public,anon,authenticated;
grant execute on function public.fulfill_order(text,text) to service_role;

insert into public.categories(id,name,theme,fields,position) values
('motorcycles','Motorcycles','motorcycles','["Make","Engine","Year","Kilometres"]',8),
('retail','General retail','general','["Material","Dimensions"]',9),
('fashion','Fashion','fashion','["Size","Colour","Material"]',1),('mobiles','Mobiles','electronics','["Brand","Model","Storage","Warranty"]',2),('vehicles','Vehicles','vehicles','["Make","Model","Year","Kilometres","Fuel"]',3),('home','Home & furniture','general','["Material","Dimensions"]',4),('electronics','Electronics','electronics','["Brand","Model","Warranty"]',5),('services','Services','general','["Service area","Price unit"]',6),('property','Property','general','["Area","Bedrooms","Property type"]',7),('bicycles','Bicycles','vehicles','["Brand","Frame size","Type"]',8);
insert into public.plans(id,name,price,listing_limit) values('free','Free',0,3),('starter','Starter',500,50),('growth','Growth',1000,250),('business','Business',2000,1000),('catalogue','Large catalogue',5000,15000);
insert into public.settings(id,value) values('marketplace','{"name":"Onlinekeithel","tagline":"Our people. Our neighbourhood.","hero_title":"Your neighbourhood. Every shop.","hero_description":"Discover something wonderful, just around the corner. Shop local across Manipur.","hero_image":"/images/hero-handloom.webp","support_email":"","support_whatsapp":"","announcement":"Made for Manipur. Open to everyone.","ads_price_note":"Contact us for featured placement prices."}');
commit;
create function public.search_listings(p_query text default '') returns setof public.listings language sql stable security invoker set search_path='' as $$
 select l.* from public.listings l join public.sellers s on s.id=l.seller_id
 where l.status='published' and not s.suspended and (p_query='' or (l.title||' '||l.description||' '||l.tags||' '||l.socials::text||' '||l.attributes::text||' '||s.name) ilike '%'||replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_')||'%')
$$;
revoke all on function public.search_listings(text) from public;
grant execute on function public.search_listings(text) to anon,authenticated;

-- v0.5.0: apply ONLY to the dedicated marketplace database.
-- Preserves listing IDs, existing seller data and custom categories.
begin;
alter table public.categories add column if not exists icon text not null default 'Storefront';
alter table public.categories add column if not exists group_name text not null default 'Other';
alter table public.categories add column if not exists subcategories jsonb not null default '[]';
alter table public.listings add column if not exists subcategory_id text;
create index if not exists listings_category_subcategory_idx on public.listings(category_id,subcategory_id) where status='published';
insert into public.categories(id,name,theme,fields,position,active,icon,group_name,subcategories) values
('fashion','Clothing, fashion & handloom','fashion','["Size", "Colour", "Material"]',0,true,'TShirt','Shopping','[{"id": "women-s-clothing", "name": "Women''s clothing", "icon": "TShirt"}, {"id": "men-s-clothing", "name": "Men''s clothing", "icon": "TShirt"}, {"id": "children-s-clothing", "name": "Children''s clothing", "icon": "TShirt"}, {"id": "t-shirts-tops", "name": "T-shirts & tops", "icon": "TShirt"}, {"id": "traditional-phanek-innaphi", "name": "Traditional phanek & innaphi", "icon": "TShirt"}, {"id": "shawls-handloom-textiles", "name": "Shawls & handloom textiles", "icon": "TShirt"}, {"id": "footwear", "name": "Footwear", "icon": "TShirt"}, {"id": "bags-wallets", "name": "Bags & wallets", "icon": "TShirt"}, {"id": "jewellery-accessories", "name": "Jewellery & accessories", "icon": "TShirt"}, {"id": "tailoring-materials", "name": "Tailoring materials", "icon": "TShirt"}, {"id": "school-work-uniforms", "name": "School & work uniforms", "icon": "TShirt"}, {"id": "pre-owned-clothing", "name": "Pre-owned clothing", "icon": "TShirt"}]'),
('mobiles','Mobiles & accessories','electronics','["Brand", "Model", "Storage", "Warranty"]',1,true,'DeviceMobile','Shopping','[{"id": "smartphones", "name": "Smartphones", "icon": "DeviceMobile"}, {"id": "feature-phones", "name": "Feature phones", "icon": "DeviceMobile"}, {"id": "tablets", "name": "Tablets", "icon": "DeviceMobile"}, {"id": "phone-cases-screen-protectors", "name": "Phone cases & screen protectors", "icon": "DeviceMobile"}, {"id": "chargers-cables", "name": "Chargers & cables", "icon": "DeviceMobile"}, {"id": "power-banks", "name": "Power banks", "icon": "DeviceMobile"}, {"id": "smartwatches", "name": "Smartwatches", "icon": "DeviceMobile"}, {"id": "mobile-spare-parts", "name": "Mobile spare parts", "icon": "DeviceMobile"}, {"id": "refurbished-phones", "name": "Refurbished phones", "icon": "DeviceMobile"}]'),
('electronics','Electronics, computers & AV','electronics','["Brand", "Model", "Warranty"]',2,true,'Desktop','Shopping','[{"id": "laptops", "name": "Laptops", "icon": "Desktop"}, {"id": "desktop-computers", "name": "Desktop computers", "icon": "Desktop"}, {"id": "computer-components", "name": "Computer components", "icon": "Desktop"}, {"id": "monitors", "name": "Monitors", "icon": "Desktop"}, {"id": "printers-scanners", "name": "Printers & scanners", "icon": "Desktop"}, {"id": "networking-wi-fi", "name": "Networking & Wi-Fi", "icon": "Desktop"}, {"id": "headphones-speakers", "name": "Headphones & speakers", "icon": "Desktop"}, {"id": "cameras-lenses", "name": "Cameras & lenses", "icon": "Desktop"}, {"id": "televisions-projectors", "name": "Televisions & projectors", "icon": "Desktop"}, {"id": "gaming-consoles", "name": "Gaming consoles", "icon": "Desktop"}, {"id": "av-installation-equipment", "name": "AV installation equipment", "icon": "Desktop"}, {"id": "smart-home-devices", "name": "Smart home devices", "icon": "Desktop"}, {"id": "recording-studio-equipment", "name": "Recording & studio equipment", "icon": "Desktop"}]'),
('vehicles','Cars & commercial vehicles','vehicles','["Make", "Model", "Year", "Kilometres", "Fuel"]',3,true,'Car','Vehicles & transport','[{"id": "hatchbacks", "name": "Hatchbacks", "icon": "Car"}, {"id": "sedans", "name": "Sedans", "icon": "Car"}, {"id": "suvs-crossovers", "name": "SUVs & crossovers", "icon": "Car"}, {"id": "mpvs-vans", "name": "MPVs & vans", "icon": "Car"}, {"id": "electric-cars", "name": "Electric cars", "icon": "Car"}, {"id": "luxury-sports-cars", "name": "Luxury & sports cars", "icon": "Car"}, {"id": "pickup-trucks", "name": "Pickup trucks", "icon": "Car"}, {"id": "trucks-goods-vehicles", "name": "Trucks & goods vehicles", "icon": "Car"}, {"id": "buses-passenger-vehicles", "name": "Buses & passenger vehicles", "icon": "Car"}, {"id": "car-parts-accessories", "name": "Car parts & accessories", "icon": "Car"}, {"id": "tyres-wheels", "name": "Tyres & wheels", "icon": "Car"}, {"id": "vehicle-servicing", "name": "Vehicle servicing", "icon": "Car"}]'),
('motorcycles','Motorcycles & scooters','motorcycles','["Make", "Model", "Engine", "Year", "Kilometres"]',4,true,'Motorcycle','Vehicles & transport','[{"id": "commuter-motorcycles", "name": "Commuter motorcycles", "icon": "Motorcycle"}, {"id": "roadsters", "name": "Roadsters", "icon": "Motorcycle"}, {"id": "sports-motorcycles", "name": "Sports motorcycles", "icon": "Motorcycle"}, {"id": "touring-adventure-bikes", "name": "Touring & adventure bikes", "icon": "Motorcycle"}, {"id": "scooters", "name": "Scooters", "icon": "Motorcycle"}, {"id": "electric-motorcycles-scooters", "name": "Electric motorcycles & scooters", "icon": "Motorcycle"}, {"id": "motorcycle-parts", "name": "Motorcycle parts", "icon": "Motorcycle"}, {"id": "helmets-riding-gear", "name": "Helmets & riding gear", "icon": "Motorcycle"}, {"id": "motorcycle-servicing", "name": "Motorcycle servicing", "icon": "Motorcycle"}]'),
('home','Furniture & home living','general','["Material", "Dimensions"]',5,true,'Armchair','Shopping','[{"id": "sofas-seating", "name": "Sofas & seating", "icon": "Armchair"}, {"id": "beds-mattresses", "name": "Beds & mattresses", "icon": "Armchair"}, {"id": "tables-desks", "name": "Tables & desks", "icon": "Armchair"}, {"id": "wardrobes-storage", "name": "Wardrobes & storage", "icon": "Armchair"}, {"id": "office-furniture", "name": "Office furniture", "icon": "Armchair"}, {"id": "kitchen-dining-furniture", "name": "Kitchen & dining furniture", "icon": "Armchair"}, {"id": "curtains-soft-furnishings", "name": "Curtains & soft furnishings", "icon": "Armchair"}, {"id": "home-decor", "name": "Home decor", "icon": "Armchair"}, {"id": "outdoor-furniture", "name": "Outdoor furniture", "icon": "Armchair"}, {"id": "used-furniture", "name": "Used furniture", "icon": "Armchair"}]'),
('construction','Construction materials','general','["Brand", "Material grade", "Unit", "Minimum order", "Delivery area"]',6,true,'Wall','Build & industry','[{"id": "cement-binders", "name": "Cement & binders", "icon": "Wall"}, {"id": "sand-aggregates", "name": "Sand & aggregates", "icon": "Wall"}, {"id": "bricks-concrete-blocks", "name": "Bricks & concrete blocks", "icon": "Wall"}, {"id": "ready-mix-concrete", "name": "Ready-mix concrete", "icon": "Wall"}, {"id": "tmt-bars-reinforcement", "name": "TMT bars & reinforcement", "icon": "Wall"}, {"id": "structural-steel-sections", "name": "Structural steel sections", "icon": "Wall"}, {"id": "timber-plywood", "name": "Timber & plywood", "icon": "Wall"}, {"id": "roofing-sheets-systems", "name": "Roofing sheets & systems", "icon": "Wall"}, {"id": "doors-windows-frames", "name": "Doors, windows & frames", "icon": "Wall"}, {"id": "glass-glazing", "name": "Glass & glazing", "icon": "Wall"}, {"id": "insulation-acoustic-materials", "name": "Insulation & acoustic materials", "icon": "Wall"}, {"id": "waterproofing-construction-chemicals", "name": "Waterproofing & construction chemicals", "icon": "Wall"}, {"id": "precast-concrete-products", "name": "Precast concrete products", "icon": "Wall"}, {"id": "geotextiles-drainage-materials", "name": "Geotextiles & drainage materials", "icon": "Wall"}, {"id": "reclaimed-building-materials", "name": "Reclaimed building materials", "icon": "Wall"}]'),
('architecture','Architects, design & engineering','general','["Specialisation", "Service area", "Project type", "Pricing basis"]',7,true,'Blueprint','Build & industry','[{"id": "residential-architects", "name": "Residential architects", "icon": "Blueprint"}, {"id": "commercial-architects", "name": "Commercial architects", "icon": "Blueprint"}, {"id": "interior-designers", "name": "Interior designers", "icon": "Blueprint"}, {"id": "landscape-designers", "name": "Landscape designers", "icon": "Blueprint"}, {"id": "structural-engineers", "name": "Structural engineers", "icon": "Blueprint"}, {"id": "civil-engineering-consultants", "name": "Civil engineering consultants", "icon": "Blueprint"}, {"id": "mep-design-consultants", "name": "MEP design consultants", "icon": "Blueprint"}, {"id": "building-plans-drafting", "name": "Building plans & drafting", "icon": "Blueprint"}, {"id": "3d-visualisation-rendering", "name": "3D visualisation & rendering", "icon": "Blueprint"}, {"id": "land-surveying", "name": "Land surveying", "icon": "Blueprint"}, {"id": "quantity-surveying-estimation", "name": "Quantity surveying & estimation", "icon": "Blueprint"}, {"id": "project-management-consultants", "name": "Project management consultants", "icon": "Blueprint"}, {"id": "town-planning-consultants", "name": "Town planning consultants", "icon": "Blueprint"}]'),
('contractors','Construction & trade contractors','general','["Trade", "Service area", "Project type", "Pricing basis"]',8,true,'HardHat','Build & industry','[{"id": "general-building-contractors", "name": "General building contractors", "icon": "HardHat"}, {"id": "civil-works-contractors", "name": "Civil works contractors", "icon": "HardHat"}, {"id": "home-renovation", "name": "Home renovation", "icon": "HardHat"}, {"id": "masonry-plastering", "name": "Masonry & plastering", "icon": "HardHat"}, {"id": "roofing-contractors", "name": "Roofing contractors", "icon": "HardHat"}, {"id": "steel-fabrication-welding", "name": "Steel fabrication & welding", "icon": "HardHat"}, {"id": "carpentry-joinery", "name": "Carpentry & joinery", "icon": "HardHat"}, {"id": "painting-contractors", "name": "Painting contractors", "icon": "HardHat"}, {"id": "flooring-tiling-installers", "name": "Flooring & tiling installers", "icon": "HardHat"}, {"id": "waterproofing-contractors", "name": "Waterproofing contractors", "icon": "HardHat"}, {"id": "electrical-contractors", "name": "Electrical contractors", "icon": "HardHat"}, {"id": "plumbing-contractors", "name": "Plumbing contractors", "icon": "HardHat"}, {"id": "hvac-installers", "name": "HVAC installers", "icon": "HardHat"}, {"id": "demolition-site-clearing", "name": "Demolition & site clearing", "icon": "HardHat"}, {"id": "landscaping-contractors", "name": "Landscaping contractors", "icon": "HardHat"}]'),
('warehouse','Warehouse & site supplies','general','["Load capacity", "Dimensions", "Unit", "Minimum order", "Delivery area"]',9,true,'Warehouse','Build & industry','[{"id": "pallet-racks", "name": "Pallet racks", "icon": "Warehouse"}, {"id": "shelving-storage-systems", "name": "Shelving & storage systems", "icon": "Warehouse"}, {"id": "pallets-crates-bins", "name": "Pallets, crates & bins", "icon": "Warehouse"}, {"id": "pallet-trucks-trolleys", "name": "Pallet trucks & trolleys", "icon": "Warehouse"}, {"id": "forklifts-stackers", "name": "Forklifts & stackers", "icon": "Warehouse"}, {"id": "lifting-hoists-slings", "name": "Lifting hoists & slings", "icon": "Warehouse"}, {"id": "conveyors-loading-equipment", "name": "Conveyors & loading equipment", "icon": "Warehouse"}, {"id": "packaging-boxes-cartons", "name": "Packaging boxes & cartons", "icon": "Warehouse"}, {"id": "wrapping-strapping-tapes", "name": "Wrapping, strapping & tapes", "icon": "Warehouse"}, {"id": "weighing-scales", "name": "Weighing scales", "icon": "Warehouse"}, {"id": "warehouse-labels-signage", "name": "Warehouse labels & signage", "icon": "Warehouse"}, {"id": "tarpaulins-protective-covers", "name": "Tarpaulins & protective covers", "icon": "Warehouse"}, {"id": "site-cabins-portable-toilets", "name": "Site cabins & portable toilets", "icon": "Warehouse"}, {"id": "bulk-material-supply-distribution", "name": "Bulk material supply & distribution", "icon": "Warehouse"}]'),
('tools','Tools, hardware & fasteners','general','["Brand", "Model", "Size", "Unit", "Warranty"]',10,true,'Hammer','Build & industry','[{"id": "hand-tools", "name": "Hand tools", "icon": "Hammer"}, {"id": "power-tools", "name": "Power tools", "icon": "Hammer"}, {"id": "drill-bits-cutting-discs", "name": "Drill bits & cutting discs", "icon": "Hammer"}, {"id": "nuts-bolts-screws", "name": "Nuts, bolts & screws", "icon": "Hammer"}, {"id": "locks-hinges-handles", "name": "Locks, hinges & handles", "icon": "Hammer"}, {"id": "welding-equipment-supplies", "name": "Welding equipment & supplies", "icon": "Hammer"}, {"id": "measuring-testing-tools", "name": "Measuring & testing tools", "icon": "Hammer"}, {"id": "ladders-work-platforms", "name": "Ladders & work platforms", "icon": "Hammer"}, {"id": "workshop-storage", "name": "Workshop storage", "icon": "Hammer"}, {"id": "abrasives-polishing", "name": "Abrasives & polishing", "icon": "Hammer"}, {"id": "adhesives-sealants", "name": "Adhesives & sealants", "icon": "Hammer"}]'),
('electrical','Electrical, lighting & solar','general','["Brand", "Voltage", "Power rating", "Warranty"]',11,true,'Lightning','Build & industry','[{"id": "wires-cables", "name": "Wires & cables", "icon": "Lightning"}, {"id": "switches-sockets", "name": "Switches & sockets", "icon": "Lightning"}, {"id": "distribution-boards-breakers", "name": "Distribution boards & breakers", "icon": "Lightning"}, {"id": "indoor-lighting", "name": "Indoor lighting", "icon": "Lightning"}, {"id": "outdoor-street-lighting", "name": "Outdoor & street lighting", "icon": "Lightning"}, {"id": "led-strips-decorative-lighting", "name": "LED strips & decorative lighting", "icon": "Lightning"}, {"id": "inverters-ups", "name": "Inverters & UPS", "icon": "Lightning"}, {"id": "batteries-energy-storage", "name": "Batteries & energy storage", "icon": "Lightning"}, {"id": "solar-panels", "name": "Solar panels", "icon": "Lightning"}, {"id": "solar-inverters-accessories", "name": "Solar inverters & accessories", "icon": "Lightning"}, {"id": "earthing-lightning-protection", "name": "Earthing & lightning protection", "icon": "Lightning"}, {"id": "ev-charging-equipment", "name": "EV charging equipment", "icon": "Lightning"}]'),
('plumbing','Plumbing, bathroom & water','general','["Material", "Diameter", "Capacity", "Unit", "Warranty"]',12,true,'Pipe','Build & industry','[{"id": "pipes-fittings", "name": "Pipes & fittings", "icon": "Pipe"}, {"id": "taps-mixers", "name": "Taps & mixers", "icon": "Pipe"}, {"id": "toilets-sanitaryware", "name": "Toilets & sanitaryware", "icon": "Pipe"}, {"id": "wash-basins-sinks", "name": "Wash basins & sinks", "icon": "Pipe"}, {"id": "showers-bathroom-accessories", "name": "Showers & bathroom accessories", "icon": "Pipe"}, {"id": "water-storage-tanks", "name": "Water storage tanks", "icon": "Pipe"}, {"id": "pumps-motors", "name": "Pumps & motors", "icon": "Pipe"}, {"id": "water-heaters", "name": "Water heaters", "icon": "Pipe"}, {"id": "water-filtration-treatment", "name": "Water filtration & treatment", "icon": "Pipe"}, {"id": "drainage-sewage-systems", "name": "Drainage & sewage systems", "icon": "Pipe"}, {"id": "valves-meters", "name": "Valves & meters", "icon": "Pipe"}]'),
('finishes','Paint, flooring & interiors','general','["Brand", "Finish", "Colour", "Coverage", "Unit"]',13,true,'PaintRoller','Build & industry','[{"id": "interior-exterior-paint", "name": "Interior & exterior paint", "icon": "PaintRoller"}, {"id": "primers-wall-putty", "name": "Primers & wall putty", "icon": "PaintRoller"}, {"id": "tiles-mosaics", "name": "Tiles & mosaics", "icon": "PaintRoller"}, {"id": "marble-granite-stone", "name": "Marble, granite & stone", "icon": "PaintRoller"}, {"id": "wood-laminate-flooring", "name": "Wood & laminate flooring", "icon": "PaintRoller"}, {"id": "vinyl-resilient-flooring", "name": "Vinyl & resilient flooring", "icon": "PaintRoller"}, {"id": "wall-panels-cladding", "name": "Wall panels & cladding", "icon": "PaintRoller"}, {"id": "wallpaper", "name": "Wallpaper", "icon": "PaintRoller"}, {"id": "false-ceilings-gypsum", "name": "False ceilings & gypsum", "icon": "PaintRoller"}, {"id": "modular-kitchens", "name": "Modular kitchens", "icon": "PaintRoller"}, {"id": "laminates-veneers", "name": "Laminates & veneers", "icon": "PaintRoller"}, {"id": "interior-partitions", "name": "Interior partitions", "icon": "PaintRoller"}]'),
('machinery','Machinery & equipment rental','general','["Make", "Model", "Capacity", "Hire or sale", "Pricing unit"]',14,true,'Factory','Build & industry','[{"id": "excavators-earthmovers", "name": "Excavators & earthmovers", "icon": "Factory"}, {"id": "concrete-mixers-vibrators", "name": "Concrete mixers & vibrators", "icon": "Factory"}, {"id": "compactors-road-equipment", "name": "Compactors & road equipment", "icon": "Factory"}, {"id": "cranes-lifting-equipment", "name": "Cranes & lifting equipment", "icon": "Factory"}, {"id": "generators", "name": "Generators", "icon": "Factory"}, {"id": "air-compressors", "name": "Air compressors", "icon": "Factory"}, {"id": "scaffolding-shuttering", "name": "Scaffolding & shuttering", "icon": "Factory"}, {"id": "agricultural-machinery", "name": "Agricultural machinery", "icon": "Factory"}, {"id": "workshop-machines", "name": "Workshop machines", "icon": "Factory"}, {"id": "construction-equipment-hire", "name": "Construction equipment hire", "icon": "Factory"}, {"id": "industrial-machine-spares", "name": "Industrial machine spares", "icon": "Factory"}]'),
('safety','Safety, security & fire equipment','general','["Brand", "Model", "Size", "Standard claimed by seller"]',15,true,'ShieldCheck','Build & industry','[{"id": "helmets-site-ppe", "name": "Helmets & site PPE", "icon": "ShieldCheck"}, {"id": "safety-footwear-gloves", "name": "Safety footwear & gloves", "icon": "ShieldCheck"}, {"id": "harnesses-fall-protection", "name": "Harnesses & fall protection", "icon": "ShieldCheck"}, {"id": "barriers-safety-signage", "name": "Barriers & safety signage", "icon": "ShieldCheck"}, {"id": "fire-extinguishers", "name": "Fire extinguishers", "icon": "ShieldCheck"}, {"id": "fire-alarms-detection", "name": "Fire alarms & detection", "icon": "ShieldCheck"}, {"id": "cctv-surveillance", "name": "CCTV & surveillance", "icon": "ShieldCheck"}, {"id": "access-control-locks", "name": "Access control & locks", "icon": "ShieldCheck"}, {"id": "security-alarms", "name": "Security alarms", "icon": "ShieldCheck"}, {"id": "first-aid-kits", "name": "First-aid kits", "icon": "ShieldCheck"}, {"id": "emergency-lighting", "name": "Emergency lighting", "icon": "ShieldCheck"}]'),
('property','Property & spaces','general','["Area", "Area unit", "Bedrooms", "Listing type"]',16,true,'Buildings','Property & services','[{"id": "homes-for-sale", "name": "Homes for sale", "icon": "Buildings"}, {"id": "apartments-for-sale", "name": "Apartments for sale", "icon": "Buildings"}, {"id": "residential-land", "name": "Residential land", "icon": "Buildings"}, {"id": "agricultural-land", "name": "Agricultural land", "icon": "Buildings"}, {"id": "homes-flats-for-rent", "name": "Homes & flats for rent", "icon": "Buildings"}, {"id": "rooms-shared-accommodation", "name": "Rooms & shared accommodation", "icon": "Buildings"}, {"id": "shops-showrooms", "name": "Shops & showrooms", "icon": "Buildings"}, {"id": "offices-coworking", "name": "Offices & coworking", "icon": "Buildings"}, {"id": "warehouses-godowns", "name": "Warehouses & godowns", "icon": "Buildings"}, {"id": "industrial-sheds-plots", "name": "Industrial sheds & plots", "icon": "Buildings"}, {"id": "property-agents", "name": "Property agents", "icon": "Buildings"}]'),
('logistics','Transport & logistics','general','["Service area", "Vehicle type", "Capacity", "Pricing basis"]',17,true,'Truck','Vehicles & transport','[{"id": "local-delivery", "name": "Local delivery", "icon": "Truck"}, {"id": "goods-vehicle-hire", "name": "Goods vehicle hire", "icon": "Truck"}, {"id": "packers-movers", "name": "Packers & movers", "icon": "Truck"}, {"id": "building-material-transport", "name": "Building material transport", "icon": "Truck"}, {"id": "courier-services", "name": "Courier services", "icon": "Truck"}, {"id": "freight-forwarding", "name": "Freight forwarding", "icon": "Truck"}, {"id": "warehousing-services", "name": "Warehousing services", "icon": "Truck"}, {"id": "cold-storage-services", "name": "Cold storage services", "icon": "Truck"}, {"id": "passenger-vehicle-rental", "name": "Passenger vehicle rental", "icon": "Truck"}]'),
('bicycles','Bicycles & cycling','vehicles','["Brand", "Frame size", "Type"]',18,true,'Bicycle','Vehicles & transport','[{"id": "city-commuter-bicycles", "name": "City & commuter bicycles", "icon": "Bicycle"}, {"id": "mountain-bikes", "name": "Mountain bikes", "icon": "Bicycle"}, {"id": "road-bicycles", "name": "Road bicycles", "icon": "Bicycle"}, {"id": "kids-bicycles", "name": "Kids bicycles", "icon": "Bicycle"}, {"id": "electric-bicycles", "name": "Electric bicycles", "icon": "Bicycle"}, {"id": "cycling-accessories", "name": "Cycling accessories", "icon": "Bicycle"}, {"id": "bicycle-spare-parts", "name": "Bicycle spare parts", "icon": "Bicycle"}, {"id": "bicycle-repair", "name": "Bicycle repair", "icon": "Bicycle"}]'),
('appliances','Home & kitchen appliances','electronics','["Brand", "Model", "Capacity", "Warranty"]',19,true,'WashingMachine','Shopping','[{"id": "refrigerators", "name": "Refrigerators", "icon": "WashingMachine"}, {"id": "washing-machines", "name": "Washing machines", "icon": "WashingMachine"}, {"id": "air-conditioners", "name": "Air conditioners", "icon": "WashingMachine"}, {"id": "fans-air-coolers", "name": "Fans & air coolers", "icon": "WashingMachine"}, {"id": "cooktops-stoves", "name": "Cooktops & stoves", "icon": "WashingMachine"}, {"id": "microwaves-ovens", "name": "Microwaves & ovens", "icon": "WashingMachine"}, {"id": "mixers-small-appliances", "name": "Mixers & small appliances", "icon": "WashingMachine"}, {"id": "vacuum-cleaners", "name": "Vacuum cleaners", "icon": "WashingMachine"}, {"id": "water-purifiers", "name": "Water purifiers", "icon": "WashingMachine"}, {"id": "appliance-spare-parts", "name": "Appliance spare parts", "icon": "WashingMachine"}]'),
('food','Food, groceries & local produce','general','["Pack size", "Unit", "Storage instructions", "Delivery area"]',20,true,'BowlFood','Shopping','[{"id": "rice-grains", "name": "Rice & grains", "icon": "BowlFood"}, {"id": "fresh-vegetables", "name": "Fresh vegetables", "icon": "BowlFood"}, {"id": "fresh-fruit", "name": "Fresh fruit", "icon": "BowlFood"}, {"id": "pulses-spices", "name": "Pulses & spices", "icon": "BowlFood"}, {"id": "packaged-local-foods", "name": "Packaged local foods", "icon": "BowlFood"}, {"id": "baked-goods-sweets", "name": "Baked goods & sweets", "icon": "BowlFood"}, {"id": "dairy-eggs", "name": "Dairy & eggs", "icon": "BowlFood"}, {"id": "meat-fish", "name": "Meat & fish", "icon": "BowlFood"}, {"id": "tea-coffee-beverages", "name": "Tea, coffee & beverages", "icon": "BowlFood"}, {"id": "ready-to-eat-meals", "name": "Ready-to-eat meals", "icon": "BowlFood"}, {"id": "wholesale-groceries", "name": "Wholesale groceries", "icon": "BowlFood"}]'),
('agriculture','Farming, gardening & plants','general','["Variety", "Pack size", "Unit", "Delivery area"]',21,true,'Plant','Shopping','[{"id": "seeds-seedlings", "name": "Seeds & seedlings", "icon": "Plant"}, {"id": "indoor-plants", "name": "Indoor plants", "icon": "Plant"}, {"id": "garden-plants-saplings", "name": "Garden plants & saplings", "icon": "Plant"}, {"id": "pots-planters", "name": "Pots & planters", "icon": "Plant"}, {"id": "soil-compost", "name": "Soil & compost", "icon": "Plant"}, {"id": "fertilisers", "name": "Fertilisers", "icon": "Plant"}, {"id": "garden-tools", "name": "Garden tools", "icon": "Plant"}, {"id": "irrigation-equipment", "name": "Irrigation equipment", "icon": "Plant"}, {"id": "farm-tools", "name": "Farm tools", "icon": "Plant"}, {"id": "animal-feed", "name": "Animal feed", "icon": "Plant"}, {"id": "greenhouse-supplies", "name": "Greenhouse supplies", "icon": "Plant"}]'),
('beauty','Beauty & personal care','general','["Brand", "Pack size", "Service area"]',22,true,'Scissors','Shopping','[{"id": "skincare", "name": "Skincare", "icon": "Scissors"}, {"id": "haircare", "name": "Haircare", "icon": "Scissors"}, {"id": "makeup", "name": "Makeup", "icon": "Scissors"}, {"id": "fragrances", "name": "Fragrances", "icon": "Scissors"}, {"id": "grooming-tools", "name": "Grooming tools", "icon": "Scissors"}, {"id": "salon-equipment", "name": "Salon equipment", "icon": "Scissors"}, {"id": "salon-barber-services", "name": "Salon & barber services", "icon": "Scissors"}, {"id": "makeup-artists", "name": "Makeup artists", "icon": "Scissors"}, {"id": "spa-wellness-services", "name": "Spa & wellness services", "icon": "Scissors"}]'),
('sports','Sports, fitness & outdoors','general','["Brand", "Size", "Material"]',23,true,'Barbell','Shopping','[{"id": "fitness-equipment", "name": "Fitness equipment", "icon": "Barbell"}, {"id": "football-team-sports", "name": "Football & team sports", "icon": "Barbell"}, {"id": "badminton-racquet-sports", "name": "Badminton & racquet sports", "icon": "Barbell"}, {"id": "martial-arts-equipment", "name": "Martial arts equipment", "icon": "Barbell"}, {"id": "outdoor-camping-gear", "name": "Outdoor & camping gear", "icon": "Barbell"}, {"id": "sports-clothing", "name": "Sports clothing", "icon": "Barbell"}, {"id": "yoga-accessories", "name": "Yoga accessories", "icon": "Barbell"}, {"id": "fishing-equipment", "name": "Fishing equipment", "icon": "Barbell"}, {"id": "sports-coaching", "name": "Sports coaching", "icon": "Barbell"}]'),
('kids','Baby, kids & toys','general','["Age range", "Size", "Material"]',24,true,'Baby','Shopping','[{"id": "toys-games", "name": "Toys & games", "icon": "Baby"}, {"id": "baby-clothing", "name": "Baby clothing", "icon": "Baby"}, {"id": "strollers-carriers", "name": "Strollers & carriers", "icon": "Baby"}, {"id": "cots-nursery-furniture", "name": "Cots & nursery furniture", "icon": "Baby"}, {"id": "feeding-accessories", "name": "Feeding accessories", "icon": "Baby"}, {"id": "kids-learning-materials", "name": "Kids learning materials", "icon": "Baby"}, {"id": "kids-outdoor-play", "name": "Kids outdoor play", "icon": "Baby"}, {"id": "maternity-accessories", "name": "Maternity accessories", "icon": "Baby"}]'),
('pets','Pet supplies & care','general','["Pet type", "Size", "Pack size"]',25,true,'PawPrint','Shopping','[{"id": "pet-food", "name": "Pet food", "icon": "PawPrint"}, {"id": "pet-accessories", "name": "Pet accessories", "icon": "PawPrint"}, {"id": "beds-carriers", "name": "Beds & carriers", "icon": "PawPrint"}, {"id": "aquarium-supplies", "name": "Aquarium supplies", "icon": "PawPrint"}, {"id": "pet-grooming", "name": "Pet grooming", "icon": "PawPrint"}, {"id": "pet-boarding", "name": "Pet boarding", "icon": "PawPrint"}, {"id": "pet-training", "name": "Pet training", "icon": "PawPrint"}]'),
('education','Books, learning & stationery','general','["Subject", "Level", "Format", "Service area"]',26,true,'GraduationCap','Property & services','[{"id": "school-college-books", "name": "School & college books", "icon": "GraduationCap"}, {"id": "competitive-exam-books", "name": "Competitive exam books", "icon": "GraduationCap"}, {"id": "general-books", "name": "General books", "icon": "GraduationCap"}, {"id": "stationery", "name": "Stationery", "icon": "GraduationCap"}, {"id": "art-supplies", "name": "Art supplies", "icon": "GraduationCap"}, {"id": "school-supplies", "name": "School supplies", "icon": "GraduationCap"}, {"id": "tuition-tutoring", "name": "Tuition & tutoring", "icon": "GraduationCap"}, {"id": "language-classes", "name": "Language classes", "icon": "GraduationCap"}, {"id": "computer-skills-training", "name": "Computer & skills training", "icon": "GraduationCap"}, {"id": "music-dance-lessons", "name": "Music & dance lessons", "icon": "GraduationCap"}]'),
('events','Events, gifts & celebrations','general','["Service area", "Occasion", "Pricing basis"]',27,true,'Confetti','Property & services','[{"id": "event-planners", "name": "Event planners", "icon": "Confetti"}, {"id": "decorators", "name": "Decorators", "icon": "Confetti"}, {"id": "catering", "name": "Catering", "icon": "Confetti"}, {"id": "photography-videography", "name": "Photography & videography", "icon": "Confetti"}, {"id": "sound-lighting-hire", "name": "Sound & lighting hire", "icon": "Confetti"}, {"id": "venues-halls", "name": "Venues & halls", "icon": "Confetti"}, {"id": "gifts-hampers", "name": "Gifts & hampers", "icon": "Confetti"}, {"id": "flowers-bouquets", "name": "Flowers & bouquets", "icon": "Confetti"}, {"id": "wedding-services", "name": "Wedding services", "icon": "Confetti"}, {"id": "party-supplies", "name": "Party supplies", "icon": "Confetti"}]'),
('business','Business & professional services','general','["Specialisation", "Service area", "Pricing basis"]',28,true,'Briefcase','Property & services','[{"id": "accounting-bookkeeping", "name": "Accounting & bookkeeping", "icon": "Briefcase"}, {"id": "business-consulting", "name": "Business consulting", "icon": "Briefcase"}, {"id": "website-app-development", "name": "Website & app development", "icon": "Briefcase"}, {"id": "graphic-design", "name": "Graphic design", "icon": "Briefcase"}, {"id": "printing-signage", "name": "Printing & signage", "icon": "Briefcase"}, {"id": "digital-marketing", "name": "Digital marketing", "icon": "Briefcase"}, {"id": "translation", "name": "Translation", "icon": "Briefcase"}, {"id": "office-equipment", "name": "Office equipment", "icon": "Briefcase"}, {"id": "retail-pos-systems", "name": "Retail POS systems", "icon": "Briefcase"}, {"id": "commercial-cleaning", "name": "Commercial cleaning", "icon": "Briefcase"}]'),
('services','Home, repair & local services','general','["Service area", "Price unit"]',29,true,'Wrench','Property & services','[{"id": "appliance-repair", "name": "Appliance repair", "icon": "Wrench"}, {"id": "mobile-computer-repair", "name": "Mobile & computer repair", "icon": "Wrench"}, {"id": "home-cleaning", "name": "Home cleaning", "icon": "Wrench"}, {"id": "pest-control", "name": "Pest control", "icon": "Wrench"}, {"id": "laundry-ironing", "name": "Laundry & ironing", "icon": "Wrench"}, {"id": "furniture-repair", "name": "Furniture repair", "icon": "Wrench"}, {"id": "locksmiths", "name": "Locksmiths", "icon": "Wrench"}, {"id": "home-maintenance", "name": "Home maintenance", "icon": "Wrench"}, {"id": "gardening-services", "name": "Gardening services", "icon": "Wrench"}, {"id": "water-tank-cleaning", "name": "Water tank cleaning", "icon": "Wrench"}]'),
('retail','General retail & wholesale','general','["Unit", "Minimum order", "Delivery area"]',30,true,'Storefront','Shopping','[{"id": "daily-essentials", "name": "Daily essentials", "icon": "Storefront"}, {"id": "household-supplies", "name": "Household supplies", "icon": "Storefront"}, {"id": "kitchenware", "name": "Kitchenware", "icon": "Storefront"}, {"id": "reusable-bags-containers", "name": "Reusable bags & containers", "icon": "Storefront"}, {"id": "wholesale-mixed-goods", "name": "Wholesale mixed goods", "icon": "Storefront"}, {"id": "shop-fixtures-displays", "name": "Shop fixtures & displays", "icon": "Storefront"}, {"id": "local-crafts-souvenirs", "name": "Local crafts & souvenirs", "icon": "Storefront"}, {"id": "seasonal-goods", "name": "Seasonal goods", "icon": "Storefront"}]')
on conflict(id) do update set icon=excluded.icon,group_name=excluded.group_name,subcategories=excluded.subcategories;

create or replace function public.validate_listing_subcategory() returns trigger language plpgsql set search_path='' as $$
begin
 if new.subcategory_id is not null and not exists(select 1 from public.categories c, jsonb_array_elements(c.subcategories) s where c.id=new.category_id and s->>'id'=new.subcategory_id) then
  raise exception 'Subcategory does not belong to selected category';
 end if;
 return new;
end $$;
drop trigger if exists validate_listing_subcategory on public.listings;
create trigger validate_listing_subcategory before insert or update of category_id,subcategory_id on public.listings for each row execute function public.validate_listing_subcategory();
create or replace function private.validate_category_children() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if jsonb_typeof(new.subcategories) <> 'array' then raise exception 'Subcategories must be an array'; end if;
 if exists(select 1 from jsonb_array_elements(new.subcategories) s where coalesce(s->>'id','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(trim(coalesce(s->>'name',''))) < 2) then raise exception 'Each subcategory needs a stable slug ID and a name'; end if;
 if (select count(*) from jsonb_array_elements(new.subcategories)) <> (select count(distinct s->>'id') from jsonb_array_elements(new.subcategories) s) then raise exception 'Duplicate subcategory ID'; end if;
 if tg_op='UPDATE' and exists(select 1 from public.listings l where l.category_id=old.id and l.subcategory_id is not null and not exists(select 1 from jsonb_array_elements(new.subcategories) s where s->>'id'=l.subcategory_id)) then raise exception 'Cannot remove a subcategory while listings use it'; end if;
 return new;
end $$;
revoke all on function private.validate_category_children() from public;
drop trigger if exists validate_category_children on public.categories;
create trigger validate_category_children before insert or update of subcategories on public.categories for each row execute function private.validate_category_children();
create or replace function public.search_listings(p_query text default '') returns setof public.listings language sql stable security invoker set search_path='' as $$
 select l.* from public.listings l join public.sellers s on s.id=l.seller_id join public.categories c on c.id=l.category_id
 where l.status='published' and not s.suspended and (p_query='' or (l.title||' '||l.description||' '||l.tags||' '||l.socials::text||' '||l.attributes::text||' '||s.name||' '||c.name||' '||coalesce((select child->>'name' from jsonb_array_elements(c.subcategories) child where child->>'id'=l.subcategory_id),'') ) ilike '%'||replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_')||'%')
$$;
commit;

-- v0.6.0 product media and inventory
begin;
alter table public.listings add column if not exists commerce jsonb not null default '{}';
alter table public.listings add column if not exists videos jsonb not null default '[]';
alter table public.sellers add column if not exists payment_options jsonb not null default '{}';
create or replace function private.product_options_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare c jsonb; v jsonb; seen_ids text[] := '{}'; seen_labels text[] := '{}';
begin
 c:=new.commerce;
 if jsonb_typeof(c)<>'object' or jsonb_typeof(new.videos)<>'array' then raise exception 'Invalid product options or videos'; end if;
 if c ? 'mode' and coalesce(c->>'mode','') not in ('enquiry','retail') then raise exception 'Invalid selling mode'; end if;
 if c ? 'stock' and c->'stock'<>'null'::jsonb then
  if jsonb_typeof(c->'stock')<>'number' or (c->>'stock')::numeric<0 or (c->>'stock')::numeric>1000000 or (c->>'stock')::numeric<>trunc((c->>'stock')::numeric) then raise exception 'Invalid stock count'; end if;
 end if;
 if c ? 'unit' and (jsonb_typeof(c->'unit')<>'string' or length(c->>'unit')>40) then raise exception 'Invalid selling unit'; end if;
 if c ? 'delivery' and (jsonb_typeof(c->'delivery')<>'string' or length(c->>'delivery')>500) then raise exception 'Invalid delivery details'; end if;
 if c ? 'variants' then
  if jsonb_typeof(c->'variants')<>'array' then raise exception 'Invalid product variants'; end if;
  if jsonb_array_length(c->'variants')>100 then raise exception 'Maximum 100 product variants'; end if;
  for v in select value from jsonb_array_elements(c->'variants') loop
   if jsonb_typeof(v)<>'object' or not (v ?& array['id','label','stock']) then raise exception 'Invalid variant'; end if;
   if jsonb_typeof(v->'id')<>'string' or coalesce(v->>'id','') !~ '^[a-zA-Z0-9_-]{1,64}$' or (v->>'id')=any(seen_ids) then raise exception 'Variant ID must be unique'; end if;
   if jsonb_typeof(v->'label')<>'string' or length(trim(v->>'label')) not between 1 and 80 or lower(trim(v->>'label'))=any(seen_labels) then raise exception 'Variant label must be unique'; end if;
   if jsonb_typeof(v->'stock')<>'number' or (v->>'stock')::numeric<0 or (v->>'stock')::numeric>1000000 or (v->>'stock')::numeric<>trunc((v->>'stock')::numeric) then raise exception 'Invalid variant stock'; end if;
   if v ? 'price' and v->'price'<>'null'::jsonb then
    if jsonb_typeof(v->'price')<>'number' or (v->>'price')::numeric<0 or (v->>'price')::numeric>9999999999.99 then raise exception 'Invalid variant price'; end if;
   end if;
   seen_ids:=array_append(seen_ids,v->>'id');seen_labels:=array_append(seen_labels,lower(trim(v->>'label')));
  end loop;
 end if;
 if jsonb_array_length(new.videos)>6 then raise exception 'Maximum six videos'; end if;
 for v in select value from jsonb_array_elements(new.videos) loop
  if jsonb_typeof(v)<>'object' or jsonb_typeof(v->'url') is distinct from 'string' or coalesce(v->>'url','') !~* '^https://((www\.|m\.)?(youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch)/[^[:space:]]*|[^[:space:]]+\.(mp4|webm)(\?[^[:space:]]*)?)$' then raise exception 'Invalid video URL'; end if;
  if v ? 'title' and (jsonb_typeof(v->'title')<>'string' or length(v->>'title')>100) then raise exception 'Invalid video title'; end if;
 end loop;
 -- Legacy listings remain readable. Enforce the gallery when publishing or changing photos/category.
 if new.status='published' and new.category_id='fashion' and jsonb_array_length(new.images)<4 then
  if TG_OP='INSERT' then raise exception 'Add front, back, left and right clothing photos'; end if;
  if new.images is distinct from old.images or new.status is distinct from old.status or new.category_id is distinct from old.category_id then raise exception 'Add front, back, left and right clothing photos'; end if;
 end if;
 return new;
end $$;
revoke all on function private.product_options_guard() from public;
drop trigger if exists product_options_guard on public.listings;
create trigger product_options_guard before insert or update on public.listings for each row execute function private.product_options_guard();
create or replace function private.payment_options_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare p jsonb; k text;
begin
 p:=new.payment_options;
 if jsonb_typeof(p)<>'object' then raise exception 'Invalid payment options'; end if;
 if p ? 'upi_id' and (jsonb_typeof(p->'upi_id')<>'string' or ((p->>'upi_id')<>'' and (p->>'upi_id') !~ '^[a-zA-Z0-9._-]{2,255}@[a-zA-Z0-9.-]{2,64}$')) then raise exception 'Invalid UPI ID'; end if;
 if p ? 'upi_qr' and (jsonb_typeof(p->'upi_qr')<>'string' or ((p->>'upi_qr')<>'' and (p->>'upi_qr') !~ '^https://[^[:space:]]+$')) then raise exception 'Invalid UPI QR URL'; end if;
 if p ? 'upi_name' and (jsonb_typeof(p->'upi_name')<>'string' or length(p->>'upi_name')>100) then raise exception 'Invalid UPI name'; end if;
 if p ? 'instructions' and (jsonb_typeof(p->'instructions')<>'string' or length(p->>'instructions')>500) then raise exception 'Invalid payment instructions'; end if;
 foreach k in array array['cash_on_collection','cash_on_delivery'] loop
  if p ? k and jsonb_typeof(p->k)<>'boolean' then raise exception 'Invalid cash option'; end if;
 end loop;
 return new;
end $$;
revoke all on function private.payment_options_guard() from public;
drop trigger if exists payment_options_guard on public.sellers;
create trigger payment_options_guard before insert or update on public.sellers for each row execute function private.payment_options_guard();
-- Existing authenticated ownership/RLS policies cover these columns. No payment status is client writable.
update public.categories set fields='["Make","Model","Year","Kilometres","Fuel","Transmission","Owners","Body type","Engine capacity","Registration year","Insurance until","Service history","Accident history"]'::jsonb where id in ('vehicles','motorcycles');
-- Storage is optional in local SQL tests. Upgrade the existing bucket when present.
do $$ begin
 if to_regclass('storage.buckets') is not null then
  update storage.buckets set file_size_limit=6291456,allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/webm'] where id='marketplace';
 end if;
end $$;
create or replace function public.search_listings(p_query text default '') returns setof public.listings language sql stable security invoker set search_path='' as $$
 select l.* from public.listings l join public.sellers s on s.id=l.seller_id join public.categories c on c.id=l.category_id
 where l.status='published' and not s.suspended and (p_query='' or (l.title||' '||l.description||' '||l.tags||' '||l.socials::text||' '||l.videos::text||' '||coalesce(l.commerce->'variants','[]'::jsonb)::text||' '||l.attributes::text||' '||s.name||' '||c.name||' '||coalesce((select child->>'name' from jsonb_array_elements(c.subcategories) child where child->>'id'=l.subcategory_id),'') ) ilike '%'||replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_')||'%')
$$;
commit;

-- Onlinekeithel v0.7: preserve existing category IDs and listing references.
-- Construction is a UI department grouping existing specialist categories.
begin;
update public.settings
set value = jsonb_set(value, '{name}', '"Onlinekeithel"'::jsonb)
where id = 'marketplace' and value->>'name' = 'Leikai Market';

update public.categories c
set subcategories = (
  select coalesce(jsonb_agg(
    case when child->>'id' = 'general-building-contractors'
      then jsonb_set(child, '{name}', '"Builders & general contractors"'::jsonb)
      else child end
  ), '[]'::jsonb)
  from jsonb_array_elements(c.subcategories) child
) || (
  select coalesce(jsonb_agg(child), '[]'::jsonb)
  from jsonb_array_elements(
    '[{"id":"bricklayers-masons","name":"Bricklayers & masons","icon":"HardHat"},
      {"id":"handyman-repairs","name":"Handyman & small repairs","icon":"Wrench"},
      {"id":"construction-labourers","name":"Construction labourers","icon":"HardHat"},
      {"id":"site-supervisors","name":"Site supervisors","icon":"HardHat"}]'::jsonb
  ) child
  where not exists (
    select 1 from jsonb_array_elements(c.subcategories) existing
    where existing->>'id' = child->>'id'
  )
)
where c.id = 'contractors';
commit;
