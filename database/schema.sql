-- Leikai Market v0.3: apply to a NEW dedicated Supabase project.
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
create table public.sellers(id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade, name text not null check(length(name) between 2 and 80), slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'), type text not null default 'individual' check(type in ('individual','shop')), theme text not null default 'general' check(theme in ('general','fashion','electronics','vehicles','motorcycles')), description text not null default '', location text not null default 'Imphal', whatsapp text not null check(whatsapp ~ '^[1-9][0-9]{7,14}$'), logo text not null default '', cover text not null default '', socials jsonb not null default '{}', suspended boolean not null default false, created_at timestamptz not null default now());
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
insert into public.settings(id,value) values('marketplace','{"name":"Leikai Market","tagline":"Our people. Our neighbourhood.","hero_title":"Your neighbourhood. Every shop.","hero_description":"Discover something wonderful, just around the corner. Shop local across Manipur.","hero_image":"/images/hero-handloom.webp","support_email":"","support_whatsapp":"","announcement":"Made for Manipur. Open to everyone.","ads_price_note":"Contact us for featured placement prices."}');
commit;
create function public.search_listings(p_query text default '') returns setof public.listings language sql stable security invoker set search_path='' as $$
 select l.* from public.listings l join public.sellers s on s.id=l.seller_id
 where l.status='published' and not s.suspended and (p_query='' or (l.title||' '||l.description||' '||l.tags||' '||l.socials::text||' '||l.attributes::text||' '||s.name) ilike '%'||replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_')||'%')
$$;
revoke all on function public.search_listings(text) from public;
grant execute on function public.search_listings(text) to anon,authenticated;
