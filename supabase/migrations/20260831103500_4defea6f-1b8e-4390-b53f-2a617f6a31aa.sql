-- Phase 15 (audit fix): influencers could self-approve. "update own influencer profile" lets
-- an influencer update any column on their own row, including approval_status and is_verified
-- — unlike businesses, which got a guard trigger restricting self-service status transitions
-- (guard_business_status_change, Phase 19), influencer_profiles never got the equivalent.
-- Unlike businesses (which legitimately need owner-driven draft->pending and approved<->live
-- self-transitions), an influencer never has a legitimate reason to change their OWN
-- approval_status/is_verified/reviewed_at at all — the only path in is admin review. So this
-- guard is simpler than the businesses one: those three columns are admin-only to touch,
-- full stop; everything else on the row (display_name, rate_card, categories, etc.) an
-- influencer can keep editing freely, same as before.
create or replace function public.guard_influencer_approval_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.approval_status is distinct from old.approval_status
    or new.is_verified is distinct from old.is_verified
    or new.reviewed_at is distinct from old.reviewed_at
  then
    if not public.has_role(auth.uid(), 'admin') then
      raise exception 'Not authorized to change influencer approval status';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_influencer_approval_change() from public, anon, authenticated;
create trigger guard_influencer_approval before update on public.influencer_profiles
for each row execute function public.guard_influencer_approval_change();

-- get_conversation_partner_names() (added alongside this migration, same batch) only revoked
-- `anon` — every other security definer function in this schema explicitly revokes `public`
-- too (this exact gap has been caught and fixed more than once in this schema's history, e.g.
-- 20260808063004), since a bare CREATE FUNCTION grants execute to PUBLIC by default, which
-- authenticated inherits from regardless of any anon-specific revoke. Low practical risk here
-- (the function returns nothing for a caller in_conversation() doesn't recognize, and anon has
-- no auth.uid() to match), but closing it for consistency with the established convention.
revoke all on function public.get_conversation_partner_names(uuid[]) from public;
grant execute on function public.get_conversation_partner_names(uuid[]) to authenticated;
