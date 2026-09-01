-- Website builder Phase 2: the 6 conceptual template ids (studio/boutique/food/professional/
-- home-services/events) are replaced by 5 templates built from real design references
-- (editorial/modern-business/catalogue/experience/story). No CHECK constraint exists on
-- businesses.template (plain text), so this is purely a data remap + new default — nothing
-- breaks even for a row this migration somehow misses, since templateStyle() already falls
-- back to the default for any unrecognized id.
update public.businesses set template = case template
  when 'studio' then 'editorial'
  when 'boutique' then 'catalogue'
  when 'food' then 'catalogue'
  when 'professional' then 'modern-business'
  when 'home-services' then 'modern-business'
  when 'events' then 'experience'
  else template
end
where template in ('studio', 'boutique', 'food', 'professional', 'home-services', 'events');

alter table public.businesses alter column template set default 'editorial';
