-- Seller-controlled presentation settings. Existing profiles retain template defaults.
begin;
alter table public.sellers add column if not exists storefront jsonb not null default '{}'::jsonb;
alter table public.sellers drop constraint if exists sellers_storefront_object;
alter table public.sellers add constraint sellers_storefront_object check (jsonb_typeof(storefront) = 'object' and pg_column_size(storefront) <= 8192);
commit;
