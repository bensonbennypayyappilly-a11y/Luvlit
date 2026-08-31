-- Phase 19: moderation. Businesses have self-published instantly since day one (is_live set
-- straight to true at the end of onboarding, no review). This extends is_live into the real
-- status field the task calls for, mirroring the influencer/category approval pattern already
-- proven elsewhere in this schema — admin gates entry, the business still controls its own
-- publish moment via the existing draft_sections -> sections flow.
--
-- States: draft (mid-onboarding) -> pending (submitted, awaiting review) -> approved (admin
-- cleared, not yet published) -> live (approved AND published) | suspended | rejected.
alter table public.businesses
  add column if not exists status text not null default 'draft'
    check (status in ('draft','pending','approved','live','suspended','rejected'));

-- Grandfather existing data: businesses already live under the old instant-self-publish model
-- keep working exactly as before -- nothing that's currently live goes dark. Anything that
-- never went live stays in draft, matching its current non-public state.
update public.businesses set status = case when is_live then 'live' else 'draft' end;

-- is_live stays in the schema (no destructive drop) and is kept in sync going forward, so any
-- reference to it -- this migration updates every one currently in the codebase, but this is a
-- safety net against anything missed -- keeps behaving correctly rather than silently going stale.
create or replace function public.sync_is_live_from_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.is_live := (new.status = 'live');
  return new;
end;
$$;
revoke execute on function public.sync_is_live_from_status() from public, anon, authenticated;
create trigger sync_is_live_from_status before insert or update of status on public.businesses
for each row execute function public.sync_is_live_from_status();

-- Only an admin can move a business into or out of the gated states; the owner can only submit
-- (draft->pending) and publish once cleared (approved->live), or pause their own live page back
-- to approved -- the same one-guard-trigger shape collaboration_requests already uses for its
-- state machine elsewhere in this schema, just applied to businesses.
create or replace function public.guard_business_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if old.status = 'draft' and new.status = 'pending' then
    return new;
  end if;
  if old.status = 'approved' and new.status = 'live' then
    return new;
  end if;
  if old.status = 'live' and new.status = 'approved' then
    return new;
  end if;
  raise exception 'Not authorized to change business status from % to %', old.status, new.status;
end;
$$;
revoke execute on function public.guard_business_status_change() from public, anon, authenticated;
create trigger guard_business_status before update of status on public.businesses
for each row execute function public.guard_business_status_change();

-- Public visibility now keys off status instead of the old boolean.
drop policy if exists "live businesses public" on public.businesses;
create policy "live businesses public" on public.businesses for select using (status = 'live');

-- New rows must start in draft regardless of what the client sends -- the insert-time mirror
-- of what the update guard trigger enforces for existing rows.
drop policy "owners insert business" on public.businesses;
create policy "owners insert business" on public.businesses for insert to authenticated
  with check (auth.uid() = owner_id and status = 'draft');

-- Matches status = 'live' directly rather than leaning on the sync trigger for correctness.
create or replace function public.increment_business_views(_business_id uuid)
returns void language sql volatile security definer set search_path = public as $$
  update public.businesses set view_count = view_count + 1 where id = _business_id and status = 'live';
$$;
