-- Phase 5 (audit fix): appointment reschedule. Until now, changing an appointment time meant
-- cancel + rebook from scratch — a new booking row, losing the original's identity (and
-- anything that might reference it later, e.g. a review is tied to booking_id).
--
-- Mirrors book_slot()/cancel_booking()'s exact shape: one SECURITY DEFINER RPC, atomic release
-- of the old slot + atomic claim of the new one, in a single transaction — never two separate
-- client round trips that could leave a booking pointing at neither slot correctly. The booking
-- row itself is updated in place (same id, same created_at) rather than replaced, so its history
-- — and anything keyed on booking_id, like a review — stays intact ("preserve appointment
-- history" per the task). The new slot must belong to the SAME business as the old one — a
-- reschedule can move to a different staff member's slot within that business, but never
-- silently swap in a slot from an unrelated business.
create or replace function public.reschedule_booking(_booking_id uuid, _new_slot_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  _old_slot_id uuid;
  _business_id uuid;
  _customer_user_id uuid;
  _current_status text;
  _new_slot_business_id uuid;
  _new_count int;
  _capacity int;
begin
  select b.slot_id, b.business_id, b.customer_user_id, b.status
    into _old_slot_id, _business_id, _customer_user_id, _current_status
  from public.bookings b
  where b.id = _booking_id;

  if not found then
    raise exception 'Booking not found';
  end if;
  if _customer_user_id is distinct from auth.uid() and not public.owns_business(_business_id) then
    raise exception 'Not authorized to reschedule this booking';
  end if;
  if _current_status <> 'confirmed' then
    raise exception 'Only a confirmed booking can be rescheduled';
  end if;
  if _new_slot_id = _old_slot_id then
    raise exception 'That is already this booking''s current slot';
  end if;

  select s.business_id into _new_slot_business_id
  from public.staff s join public.slots sl on sl.staff_id = s.id
  where sl.id = _new_slot_id;

  if _new_slot_business_id is null or _new_slot_business_id <> _business_id then
    raise exception 'The selected slot does not belong to this business';
  end if;

  -- Claim the new slot first, exactly like book_slot()'s own capacity check — if this fails
  -- (someone else took it, or it's blocked), nothing about the old slot or the booking has
  -- changed yet, so there's nothing to roll back.
  update public.slots
     set booked_count = booked_count + 1,
         status = case when booked_count + 1 >= capacity then 'full' else 'open' end
   where id = _new_slot_id
     and status <> 'blocked'
     and booked_count < capacity
  returning booked_count, capacity into _new_count, _capacity;

  if not found then
    raise exception 'Selected slot is no longer available';
  end if;

  update public.bookings set slot_id = _new_slot_id where id = _booking_id;

  update public.slots
     set booked_count = greatest(booked_count - 1, 0),
         status = case when status = 'full' then 'open' else status end
   where id = _old_slot_id;

  insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
  values (
    'business', _business_id, 'booking_rescheduled', 'An appointment was rescheduled',
    'A customer moved their booking to a new time.', '/business/dashboard/appointments'
  );
end;
$$;
revoke all on function public.reschedule_booking(uuid, uuid) from public, anon;
grant execute on function public.reschedule_booking(uuid, uuid) to authenticated;
