-- Phase 10 correction: the previous migration's column-scoped grant
-- (`grant update (read_at) on messages to authenticated`) did not actually stop a caller from
-- updating OTHER columns (e.g. content) in the same statement — verified directly: a signed-in
-- participant could still successfully `.update({ content: "tampered" })` on someone else's
-- message despite the column grant. Rather than chase why column-level grants aren't behaving
-- as expected here, replace the approach with the same pattern this schema already uses
-- successfully for other narrow, security-sensitive writes (book_slot, cancel_booking): a
-- SECURITY DEFINER RPC that does exactly one thing, with no ambiguity about what it can touch.

revoke update (read_at) on public.messages from authenticated;
drop policy if exists "participants mark messages read" on public.messages;

create or replace function public.mark_conversation_read(_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.in_conversation(_conversation_id) then
    raise exception 'Not a participant in this conversation';
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = _conversation_id
    and read_at is null
    and not (
      (sender_type = 'customer' and sender_id = auth.uid())
      or (sender_type = 'business' and public.owns_business(sender_id))
      or (sender_type = 'influencer' and public.owns_influencer_profile(sender_id))
    );
end;
$$;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
