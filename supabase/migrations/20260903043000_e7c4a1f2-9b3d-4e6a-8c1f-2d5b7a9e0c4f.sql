-- A real status lifecycle for requirements/leads. Previously requirements had no status
-- column at all, and leads.status was written once to 'new' at match time and never updated
-- by any code path — "progress" was only ever inferred from raw chat activity.
--
-- Lifecycle:
--   requirements.status: 'open' -> 'closed' (poster marks it fulfilled; one-way, poster-only)
--   leads.status: 'new' -> 'quoted' (automatic, the instant the matched business sends its
--                 first message) -> 'closed' (cascades automatically when the poster closes
--                 the requirement)

alter table public.requirements add column if not exists status text not null default 'open';

-- Locks requirement edits down to exactly the one thing the poster is allowed to change —
-- comparing the whole row as JSON (minus status) rather than listing every column keeps this
-- correct even if the table gains columns later.
create or replace function public.guard_requirement_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (to_jsonb(new) - 'status') <> (to_jsonb(old) - 'status') then
    raise exception 'Only the status field can be changed on an existing requirement';
  end if;
  if new.status = old.status then
    return new;
  end if;
  if old.status = 'open' and new.status = 'closed' then
    return new;
  end if;
  raise exception 'Not authorized to change requirement status from % to %', old.status, new.status;
end;
$$;

drop trigger if exists requirements_guard_status_change on public.requirements;
create trigger requirements_guard_status_change
  before update on public.requirements
  for each row execute function public.guard_requirement_status_change();

grant update on public.requirements to authenticated;
drop policy if exists "poster closes own requirement" on public.requirements;
create policy "poster closes own requirement" on public.requirements for update to authenticated
  using (auth.uid() = posted_by_user_id)
  with check (auth.uid() = posted_by_user_id);

-- Closing a requirement cascades to any of its leads still sitting at new/quoted, so a
-- business's inbox reflects that the customer isn't looking anymore without them having to
-- ask. security definer so it isn't blocked by the (unrelated) leads RLS policies.
create or replace function public.close_requirement_leads()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    update public.leads
       set status = 'closed'
     where requirement_id = new.id
       and status in ('new', 'quoted');
  end if;
  return new;
end;
$$;

drop trigger if exists requirements_close_cascades_leads on public.requirements;
create trigger requirements_close_cascades_leads
  after update on public.requirements
  for each row execute function public.close_requirement_leads();

-- A lead isn't really "quoted" until the matched business has actually sent something —
-- matches the exact "has the business replied" check the app's own UI already infers, now
-- persisted as real state instead of recomputed from message rows every time.
create or replace function public.mark_lead_quoted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _requirement_id uuid;
begin
  if new.sender_type <> 'business' then
    return new;
  end if;

  select c.requirement_id into _requirement_id
  from public.conversations c
  where c.id = new.conversation_id
    and c.requirement_id is not null
    and ((c.party_a_type = 'business' and c.party_a_id = new.sender_id)
      or (c.party_b_type = 'business' and c.party_b_id = new.sender_id));

  if _requirement_id is null then
    return new;
  end if;

  update public.leads
     set status = 'quoted'
   where requirement_id = _requirement_id
     and matched_business_id = new.sender_id
     and status = 'new';

  return new;
end;
$$;

drop trigger if exists messages_mark_lead_quoted on public.messages;
create trigger messages_mark_lead_quoted
  after insert on public.messages
  for each row execute function public.mark_lead_quoted();
