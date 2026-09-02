-- Onboarding's redesigned "Where are you based?" step asks for a PIN code alongside the
-- existing address/city/state — nullable and optional, same as address/state already are.
alter table public.locations
  add column if not exists pincode text;
