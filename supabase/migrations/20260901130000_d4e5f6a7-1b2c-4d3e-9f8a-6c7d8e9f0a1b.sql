-- Businesses self-publish — no admin approval required to go live. Reverses part of the
-- Phase 19 moderation gate: an owner can now move status straight from draft/pending/approved
-- to live themselves (the website builder's "Save and Publish" button), matching the product's
-- actual intent. Admin still keeps the ability to intervene after the fact (suspend/reinstate,
-- already unchanged below) and the existing live->approved "pause" path stays available too —
-- only the forward publish path was gated, so only it changes.
create or replace function public.guard_business_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if old.status in ('draft', 'pending', 'approved') and new.status = 'live' then
    return new;
  end if;
  if old.status = 'live' and new.status = 'approved' then
    return new;
  end if;
  raise exception 'Not authorized to change business status from % to %', old.status, new.status;
end;
$$;
