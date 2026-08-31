-- Phase 15: notification architecture. No email/SMS/WhatsApp provider is configured in this
-- app (Supabase Auth's built-in email is the only channel that exists, and only for
-- auth flows) — so this is deliberately in-app only, never claiming delivery it can't back up.
-- Rows are created exclusively by trigger functions (no INSERT grant to authenticated/anon at
-- all), so nobody can spoof a notification for someone else.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_type text not null check (recipient_type in ('customer', 'business')),
  recipient_id uuid not null,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create policy "recipient reads own notifications" on public.notifications for select to authenticated
  using (
    (recipient_type = 'customer' and recipient_id = auth.uid())
    or (recipient_type = 'business' and public.owns_business(recipient_id))
  );
create policy "recipient marks own notifications read" on public.notifications for update to authenticated
  using (
    (recipient_type = 'customer' and recipient_id = auth.uid())
    or (recipient_type = 'business' and public.owns_business(recipient_id))
  )
  with check (
    (recipient_type = 'customer' and recipient_id = auth.uid())
    or (recipient_type = 'business' and public.owns_business(recipient_id))
  );

-- Trigger point 1: a business is matched to a new requirement.
create or replace function public.notify_on_new_lead()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  req_category text;
begin
  select category into req_category from public.requirements where id = new.requirement_id;
  insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
  values ('business', new.matched_business_id, 'new_lead', 'New lead', req_category, '/business/dashboard/leads');
  return new;
end;
$$;
revoke execute on function public.notify_on_new_lead() from public, anon, authenticated;
create trigger notify_lead_matched after insert on public.leads
for each row execute function public.notify_on_new_lead();

-- Trigger point 2: a new message (including a structured quote) — notifies whichever party
-- didn't send it. 'influencer' routes through businesses.id the same way in_conversation()
-- and is_conversation_party() already treat it elsewhere in this schema.
create or replace function public.notify_on_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  conv record;
  r_type text;
  r_id uuid;
begin
  select party_a_type, party_a_id, party_b_type, party_b_id into conv
  from public.conversations where id = new.conversation_id;

  if conv.party_a_id = new.sender_id and conv.party_a_type = new.sender_type then
    r_type := case when conv.party_b_type = 'customer' then 'customer' else 'business' end;
    r_id := conv.party_b_id;
  else
    r_type := case when conv.party_a_type = 'customer' then 'customer' else 'business' end;
    r_id := conv.party_a_id;
  end if;

  insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
  values (
    r_type,
    r_id,
    case when new.message_type = 'quote' then 'new_quote' else 'new_message' end,
    case when new.message_type = 'quote' then 'You received a quote' else 'New message' end,
    left(new.content, 140),
    case when r_type = 'business' then '/business/dashboard/leads' else '/dashboard/chats' end
  );
  return new;
end;
$$;
revoke execute on function public.notify_on_new_message() from public, anon, authenticated;
create trigger notify_message_sent after insert on public.messages
for each row execute function public.notify_on_new_message();

-- Trigger point 3: a business receives a review.
create or replace function public.notify_on_new_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
  values (
    'business',
    new.business_id,
    'new_review',
    new.rating || '-star review',
    new.comment,
    '/business/dashboard/website'
  );
  return new;
end;
$$;
revoke execute on function public.notify_on_new_review() from public, anon, authenticated;
create trigger notify_review_received after insert on public.reviews
for each row execute function public.notify_on_new_review();
