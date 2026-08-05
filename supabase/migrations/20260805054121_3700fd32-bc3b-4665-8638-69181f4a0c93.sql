-- PHASE 13: slot capacity
ALTER TABLE public.slots
  ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS booked_count integer NOT NULL DEFAULT 0;

UPDATE public.slots SET booked_count = 1 WHERE status = 'booked' AND booked_count = 0;

CREATE OR REPLACE FUNCTION public.book_slot(_slot_id uuid, _customer_name text, _customer_phone text, _customer_email text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  return _booking_id;
end;
$function$;

-- PHASE 14 / 18: business logo + gallery
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}'::text[];

-- PHASE 17: organiser profiles
CREATE TABLE IF NOT EXISTS public.organizer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_email text,
  contact_phone text,
  city text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.organizer_profiles TO authenticated;
GRANT ALL ON public.organizer_profiles TO service_role;
ALTER TABLE public.organizer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own profile" ON public.organizer_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- PHASE 17: events
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  city text,
  address text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  image_urls text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled')),
  is_featured boolean NOT NULL DEFAULT false,
  featured_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_city_status_idx ON public.events (city, status, start_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage own events" ON public.events
  FOR ALL TO authenticated USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Published events are public" ON public.events
  FOR SELECT TO anon, authenticated USING (status = 'published');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizer_profiles_updated_at BEFORE UPDATE ON public.organizer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();