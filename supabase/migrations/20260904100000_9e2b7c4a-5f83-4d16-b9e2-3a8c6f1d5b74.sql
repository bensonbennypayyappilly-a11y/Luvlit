-- Pre-launch audit fix: four real notification gaps.
--
-- 1. book_slot() never notified the business of a new booking.
-- 2. cancel_booking() never notified whichever party didn't do the cancelling.
-- 3. Admin suspending/reinstating a business (admin/business-approvals.tsx, a plain
--    businesses.update({status})) never told the owner.
-- 4. Admin approving/rejecting an influencer application (admin/influencer-approvals.tsx,
--    a plain influencer_profiles.update({approval_status})) never told the applicant.
--
-- (3) and (4) go through ordinary client updates, not a SECURITY DEFINER RPC — consistent with
-- how every other notification in this schema is created, both get a new AFTER UPDATE trigger
-- rather than a client-side insert (notifications has no INSERT grant for authenticated at all).

-- ---------- 1 & 2: booking confirmed / cancelled ----------

create or replace function public.book_slot(_slot_id uuid, _customer_name text, _customer_phone text, _customer_email text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  _business_id uuid;
  _booking_id uuid;
  _new_count int;
  _capacity int;
begin
  if coalesce(trim(_customer_name), '') = '' or coalesce(trim(_customer_phone), '') = '' then
    raise exception 'Name and phone are required';
  end if;
  if length(_customer_name) > 120 or length(_customer_phone) > 20
     or length(coalesce(_customer_email, '')) > 255 or length(coalesce(_notes, '')) > 1000 then
    raise exception 'Input too long';
  end if;

  update public.slots
     set booked_count = booked_count + 1,
         status = case when booked_count + 1 >= capacity then 'full' else 'open' end
   where id = _slot_id
     and status <> 'blocked'
     and booked_count < capacity
  returning booked_count, capacity into _new_count, _capacity;

  if not found then
    raise exception 'Slot unavailable';
  end if;

  select s.business_id into _business_id
  from public.staff s
  join public.slots sl on sl.staff_id = s.id
  where sl.id = _slot_id;

  insert into public.bookings (
    slot_id, business_id, customer_user_id, customer_name, customer_phone, customer_email, notes
  ) values (
    _slot_id, _business_id, auth.uid(), trim(_customer_name), trim(_customer_phone),
    nullif(trim(coalesce(_customer_email, '')), ''), nullif(trim(coalesce(_notes, '')), '')
  ) returning id into _booking_id;

  insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
  values (
    'business', _business_id, 'booking_confirmed', 'New appointment booked',
    trim(_customer_name) || ' booked an appointment.', '/business/dashboard/appointments'
  );

  return _booking_id;
end;
$function$;

create or replace function public.cancel_booking(_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _slot_id uuid;
  _business_id uuid;
  _customer_user_id uuid;
  _current_status text;
begin
  select slot_id, business_id, customer_user_id, status
    into _slot_id, _business_id, _customer_user_id, _current_status
  from public.bookings where id = _booking_id;

  if not found then
    raise exception 'Booking not found';
  end if;
  if _customer_user_id <> auth.uid() and not public.owns_business(_business_id) then
    raise exception 'Not authorized to cancel this booking';
  end if;
  if _current_status = 'cancelled' then
    return;
  end if;

  update public.bookings set status = 'cancelled' where id = _booking_id;

  update public.slots
     set booked_count = greatest(booked_count - 1, 0),
         status = case when status = 'full' then 'open' else status end
   where id = _slot_id;

  -- Notify whichever party didn't do the cancelling — same "notify the other side" shape as
  -- notify_on_new_message(). Guest bookings (_customer_user_id null) have no one to notify when
  -- the business cancels; nothing to do there.
  if auth.uid() = _customer_user_id then
    insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
    values (
      'business', _business_id, 'booking_cancelled', 'An appointment was cancelled',
      'A customer cancelled their booking.', '/business/dashboard/appointments'
    );
  elsif _customer_user_id is not null then
    insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
    values (
      'customer', _customer_user_id, 'booking_cancelled', 'Your appointment was cancelled',
      'The business cancelled your booking.', '/dashboard'
    );
  end if;
end;
$$;
revoke execute on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;

-- ---------- 3: business suspended / reinstated by admin ----------

-- guard_business_status_change (before update of status) only ever lets 'suspended' appear via
-- an admin transition — the owner's self-service path is strictly
-- draft/pending/approved -> live and live -> approved, never touching 'suspended' either
-- direction — so checking old/new against 'suspended' here is sufficient to mean "an admin did
-- this", with no separate has_role() check needed.
create or replace function public.notify_on_business_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'suspended' and old.status is distinct from 'suspended' then
    insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
    values (
      'business', new.id, 'business_suspended', 'Your listing was suspended',
      'Your business page has been taken off LuvLit by an admin. Contact support if this looks wrong.',
      '/business/dashboard'
    );
  elsif old.status = 'suspended' and new.status = 'live' then
    insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
    values (
      'business', new.id, 'business_reinstated', 'Your listing is live again',
      'Your business page has been reinstated and is visible on LuvLit again.',
      '/business/dashboard'
    );
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_on_business_status_change() from public, anon, authenticated;
create trigger notify_business_status_change after update of status on public.businesses
for each row execute function public.notify_on_business_status_change();

-- ---------- 4: influencer application approved / rejected ----------

-- guard_influencer_approval_change (before update) already restricts changing approval_status
-- to admins only, so by the time this AFTER trigger runs the change is already admin-authorized.
create or replace function public.notify_on_influencer_approval_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.approval_status is distinct from old.approval_status then
    if new.approval_status = 'approved' then
      insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
      values (
        'influencer', new.id, 'influencer_approved', 'You''re approved!',
        'Your influencer profile is live — brands can now find and message you.',
        '/influencer/requests'
      );
    elsif new.approval_status = 'rejected' then
      insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
      values (
        'influencer', new.id, 'influencer_rejected', 'Application not approved',
        'Your influencer application wasn''t approved this time.', null
      );
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_on_influencer_approval_change() from public, anon, authenticated;
create trigger notify_influencer_approval_change after update on public.influencer_profiles
for each row execute function public.notify_on_influencer_approval_change();
