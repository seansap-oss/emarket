-- Run on an existing dedicated marketplace database only.
begin;
alter table public.sellers drop constraint if exists sellers_theme_check;
alter table public.sellers add constraint sellers_theme_check check(theme in ('general','fashion','electronics','vehicles','motorcycles'));
insert into public.categories(id,name,theme,fields,position,active) values
('motorcycles','Motorcycles','motorcycles','["Make","Engine","Year","Kilometres"]',8,true),
('retail','General retail','general','["Material","Dimensions"]',9,true)
on conflict(id) do nothing;
commit;
