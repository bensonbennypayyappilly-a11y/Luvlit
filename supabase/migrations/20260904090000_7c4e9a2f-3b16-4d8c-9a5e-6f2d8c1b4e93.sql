-- Security fix: the messages INSERT policy only ever checked "is the caller a participant in
-- this conversation" via in_conversation(conversation_id) — it never checked that the
-- client-supplied sender_id/sender_type actually correspond to the authenticated caller. Every
-- real UI caller happens to send its own identity today, but RLS is the trust boundary, not app
-- code discipline: a direct API call from a legitimate participant could forge a message as the
-- *other* party in a conversation they're in, which also feeds the wrong recipient into
-- notify_on_new_message() (it trusts NEW.sender_id/sender_type to pick who gets notified).
-- Same shape as in_conversation()/owns_business()/owns_influencer_profile() — resolves a
-- sender_type/sender_id pair to "is this the caller's own identity".
create or replace function public.is_own_sender(_sender_type text, _sender_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    (_sender_type = 'customer' and _sender_id = auth.uid())
    or (_sender_type = 'business' and exists (select 1 from public.businesses b where b.id = _sender_id and b.owner_id = auth.uid()))
    or (_sender_type = 'influencer' and exists (select 1 from public.influencer_profiles ip where ip.id = _sender_id and ip.user_id = auth.uid()))
$$;
revoke execute on function public.is_own_sender(text, uuid) from anon;

drop policy if exists "participants send messages" on public.messages;
create policy "participants send own messages" on public.messages for insert to authenticated
with check (public.in_conversation(conversation_id) and public.is_own_sender(sender_type, sender_id));
