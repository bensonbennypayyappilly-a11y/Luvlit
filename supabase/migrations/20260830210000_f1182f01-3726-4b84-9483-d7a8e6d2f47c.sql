-- Phase 17: cancellation. Bookings have been read-only after creation until now — book_slot()
-- atomically increments a slot's booked_count and flips it to 'full' at capacity, but nothing
-- reverses that. This RPC mirrors book_slot()'s pattern: one security-definer function, usable
-- by either the customer who booked or the business that owns it, so cancelling always
-- correctly reopens the slot instead of leaving it stuck at capacity forever.
-- ("Completed"/"no-show" business-side status changes need no new RPC — bookings already has
-- a working owner UPDATE policy from day one, just never exercised by any UI until this phase.)
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
end;
$$;
revoke execute on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;
