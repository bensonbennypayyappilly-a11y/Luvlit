-- Phase 4: brand customization — a second curated colour and a curated button style.
-- Both additive, both optional/defaulted so no existing business page changes appearance.
alter table public.businesses
  add column if not exists brand_secondary_color text,
  add column if not exists button_style text not null default 'solid';
