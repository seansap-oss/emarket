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
