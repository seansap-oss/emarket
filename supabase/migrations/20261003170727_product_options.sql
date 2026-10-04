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
