-- Phase 26: DB consistency re-sweep. Two real issues found cross-referencing every table's
-- grants against its policies and tracing the actual conversation-party data model end to end.

-- Issue 1: public.conversations has had a correct, restrictive INSERT policy
-- ("participants create conversation", from 20260829130000 — predates this 28-phase project)
-- the whole time. The Phase 5 migration's `drop policy if exists "authenticated create
-- conversation"` was a no-op (already dropped by that earlier migration) — it then added a
-- second, redundant policy ("party creates own conversation") that happened to be safe only
-- because it's OR'd with the already-correct one, but its is_conversation_party() helper
-- mishandles the 'influencer' party type (checks owns_business() instead of
-- owns_influencer_profile()), unlike the policy it duplicates. Removing the redundant pair
-- avoids two policies silently drifting apart on the same check.
drop policy if exists "party creates own conversation" on public.conversations;
drop function if exists public.is_conversation_party(text, uuid);

-- Issue 2: notifications only ever supported recipient_type 'customer'/'business', but
-- conversations genuinely has a third party type — 'influencer', routed through
-- influencer_profiles.id, not businesses.id (public.collaboration.ts's acceptCollaborationRequest
-- creates these for real). notify_on_new_message() folded 'influencer' into 'business' when
-- picking a recipient, storing an influencer_profiles.id as if it were a businesses.id — the
-- notifications RLS policies' owns_business() check can never match that id, so an influencer
-- who receives a message notification could never read it back. Extends recipient_type to the
-- same three-way model already used correctly by in_conversation().
alter table public.notifications drop constraint if exists notifications_recipient_type_check;
alter table public.notifications add constraint notifications_recipient_type_check
  check (recipient_type in ('customer', 'business', 'influencer'));

drop policy if exists "recipient reads own notifications" on public.notifications;
create policy "recipient reads own notifications" on public.notifications for select to authenticated
  using (
    (recipient_type = 'customer' and recipient_id = auth.uid())
    or (recipient_type = 'business' and public.owns_business(recipient_id))
    or (recipient_type = 'influencer' and public.owns_influencer_profile(recipient_id))
  );
drop policy if exists "recipient marks own notifications read" on public.notifications;
create policy "recipient marks own notifications read" on public.notifications for update to authenticated
  using (
    (recipient_type = 'customer' and recipient_id = auth.uid())
    or (recipient_type = 'business' and public.owns_business(recipient_id))
    or (recipient_type = 'influencer' and public.owns_influencer_profile(recipient_id))
  )
  with check (
    (recipient_type = 'customer' and recipient_id = auth.uid())
    or (recipient_type = 'business' and public.owns_business(recipient_id))
    or (recipient_type = 'influencer' and public.owns_influencer_profile(recipient_id))
  );

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
    r_type := conv.party_b_type;
    r_id := conv.party_b_id;
  else
    r_type := conv.party_a_type;
    r_id := conv.party_a_id;
  end if;
  -- Anything sent through the generic /dashboard/chats UI uses sender_type='customer' even
  -- when the sender is really an influencer replying on a collaboration conversation (that UI
  -- doesn't distinguish) — recipient resolution here is unaffected either way, since it's
  -- always picking "whichever party isn't the sender", not re-deriving the sender's own type.
  if r_type not in ('customer', 'business', 'influencer') then
    r_type := 'business';
  end if;

  insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
  values (
    r_type,
    r_id,
    case when new.message_type = 'quote' then 'new_quote' else 'new_message' end,
    case when new.message_type = 'quote' then 'You received a quote' else 'New message' end,
    left(new.content, 140),
    case
      when r_type = 'business' then '/business/dashboard/leads'
      when r_type = 'influencer' then '/influencer/requests'
      else '/dashboard/chats'
    end
  );
  return new;
end;
$$;
