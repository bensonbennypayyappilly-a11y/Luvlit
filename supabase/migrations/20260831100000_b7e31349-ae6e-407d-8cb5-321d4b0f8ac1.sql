-- Phase 10 (audit fix): marking a message read always silently failed. messages was only ever
-- granted select, insert — never update, even after read_at was added — so leads.tsx's
-- "mark as read" call has been failing at the grant level (before RLS is even consulted) since
-- read_at was introduced, and the code never checked the returned error. Unread badges could
-- never clear.
--
-- Column-scoped grant: authenticated can only ever UPDATE read_at, never content/sender_id/etc,
-- even before RLS is considered. RLS then restricts WHO: only a participant in the message's
-- conversation, and never the message's own sender (mirrors the app's existing intent —
-- leads.tsx already excludes the caller's own messages via `.neq("sender_id", businessId)` —
-- this makes that a real security boundary, not just a client-side filter). Sender identity is
-- resolved the same three-way way (customer/business/influencer) as in_conversation() already
-- does for read/send, since sender_id isn't always auth.uid() directly.
grant update (read_at) on public.messages to authenticated;

create policy "participants mark messages read" on public.messages for update to authenticated
  using (
    public.in_conversation(conversation_id)
    and not (
      (sender_type = 'customer' and sender_id = auth.uid())
      or (sender_type = 'business' and public.owns_business(sender_id))
      or (sender_type = 'influencer' and public.owns_influencer_profile(sender_id))
    )
  )
  with check (
    public.in_conversation(conversation_id)
    and not (
      (sender_type = 'customer' and sender_id = auth.uid())
      or (sender_type = 'business' and public.owns_business(sender_id))
      or (sender_type = 'influencer' and public.owns_influencer_profile(sender_id))
    )
  );
