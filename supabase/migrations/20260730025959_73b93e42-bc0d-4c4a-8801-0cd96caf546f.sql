-- 1. Cities table
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  state text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cities TO anon;
GRANT SELECT ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active cities public" ON public.cities FOR SELECT USING (is_active = true);
CREATE POLICY "admins read cities" ON public.cities FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage cities" ON public.cities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.cities (name, state) VALUES
  ('Mumbai','Maharashtra'),('Delhi','Delhi'),('Bengaluru','Karnataka'),('Hyderabad','Telangana'),
  ('Chennai','Tamil Nadu'),('Kolkata','West Bengal'),('Pune','Maharashtra'),('Ahmedabad','Gujarat'),
  ('Jaipur','Rajasthan'),('Lucknow','Uttar Pradesh'),('Kochi','Kerala'),('Thiruvananthapuram','Kerala'),
  ('Kozhikode','Kerala'),('Surat','Gujarat'),('Indore','Madhya Pradesh'),('Nagpur','Maharashtra'),
  ('Bhopal','Madhya Pradesh'),('Patna','Bihar'),('Chandigarh','Chandigarh'),('Coimbatore','Tamil Nadu'),
  ('Visakhapatnam','Andhra Pradesh'),('Guwahati','Assam'),('Bhubaneswar','Odisha'),('Ranchi','Jharkhand'),
  ('Raipur','Chhattisgarh'),('Dehradun','Uttarakhand'),('Amritsar','Punjab'),('Vadodara','Gujarat'),
  ('Nashik','Maharashtra'),('Mysuru','Karnataka'),('Goa','Goa'),('Gurugram','Haryana'),
  ('Noida','Uttar Pradesh'),('Ludhiana','Punjab'),('Agra','Uttar Pradesh'),('Varanasi','Uttar Pradesh'),
  ('Madurai','Tamil Nadu'),('Jodhpur','Rajasthan'),('Udaipur','Rajasthan'),('Shillong','Meghalaya'),
  ('Imphal','Manipur'),('Aizawl','Mizoram'),('Kohima','Nagaland'),('Agartala','Tripura'),
  ('Itanagar','Arunachal Pradesh'),('Gangtok','Sikkim'),('Shimla','Himachal Pradesh'),
  ('Srinagar','Jammu & Kashmir'),('Jammu','Jammu & Kashmir'),('Gandhinagar','Gujarat'),
  ('Panaji','Goa'),('Puducherry','Puducherry'),('Amaravati','Andhra Pradesh'),('Dispur','Assam')
ON CONFLICT (name) DO NOTHING;

-- 2. Lock down slot status changes by anonymous users
DROP POLICY IF EXISTS "guests can book slot" ON public.slots;

-- 3. Lock down booking inserts (no spoofed identity)
DROP POLICY IF EXISTS "anyone can create booking" ON public.bookings;
CREATE POLICY "signed-in create own booking" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (customer_user_id = auth.uid());

-- 4. Atomic, safe booking RPC for guests and signed-in customers
CREATE OR REPLACE FUNCTION public.book_slot(
  _slot_id uuid,
  _customer_name text,
  _customer_phone text,
  _customer_email text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _business_id uuid;
  _booking_id uuid;
begin
  if coalesce(trim(_customer_name), '') = '' or coalesce(trim(_customer_phone), '') = '' then
    raise exception 'Name and phone are required';
  end if;
  if length(_customer_name) > 120 or length(_customer_phone) > 20
     or length(coalesce(_customer_email, '')) > 255 or length(coalesce(_notes, '')) > 1000 then
    raise exception 'Input too long';
  end if;

  update public.slots set status = 'booked'
  where id = _slot_id and status = 'open';
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

  return _booking_id;
end;
$$;

REVOKE ALL ON FUNCTION public.book_slot(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_slot(uuid, text, text, text, text) TO anon, authenticated, service_role;

-- 5. Internal helper functions should not be directly callable via the API
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_business(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.in_conversation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_business_views(uuid) TO anon, authenticated;