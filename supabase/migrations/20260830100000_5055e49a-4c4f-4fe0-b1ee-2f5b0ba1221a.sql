-- Optional per-business operating hours, same shape convention as staff.working_hours
-- ({"start":"HH:MM","end":"HH:MM","days":[0-6]}). Nullable: a business that hasn't set
-- this simply has no "open now" data — no forced entry, no false "closed" state.
alter table public.businesses
  add column if not exists operating_hours jsonb;
