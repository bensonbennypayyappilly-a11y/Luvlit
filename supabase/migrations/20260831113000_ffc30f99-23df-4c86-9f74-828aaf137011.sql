-- Phase 17 (audit fix): admin's "Merge into…" category action always failed. It renamed a
-- pending category's `name` to an already-existing approved category's name, which the unique
-- constraint on categories.name rejects on every real use — that's not a bug in the intent, the
-- intent (consolidate a duplicate suggestion into the real category) was just implemented as a
-- rename instead of an actual merge.
--
-- categories.name isn't a foreign key anywhere — businesses.categories is a text[], and
-- requirements.category / featured_placements.category are plain text, all matched by name, not
-- id. A real merge has to: reassign every row referencing the pending category's name to the
-- target's name (deduplicating businesses.categories so a business already in both categories
-- doesn't end up with the target name twice), then remove the now-redundant pending row —
-- never silently drop a business's own category membership, never touch anything unrelated.
create or replace function public.admin_merge_category(_pending_id uuid, _target_name text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  pending_name text;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized to merge categories';
  end if;

  select name into pending_name from public.categories where id = _pending_id and is_approved = false;
  if pending_name is null then
    raise exception 'Pending category not found';
  end if;
  if pending_name = _target_name then
    raise exception 'Cannot merge a category into itself';
  end if;
  if not exists (select 1 from public.categories where name = _target_name and is_approved = true) then
    raise exception 'Target category does not exist or is not approved';
  end if;

  update public.businesses
  set categories = (
    select array_agg(distinct x) from unnest(array_replace(categories, pending_name, _target_name)) as x
  )
  where pending_name = any(categories);

  update public.requirements set category = _target_name where category = pending_name;
  update public.featured_placements set category = _target_name where category = pending_name;

  delete from public.categories where id = _pending_id;
end;
$$;
revoke all on function public.admin_merge_category(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_merge_category(uuid, text) to authenticated;
