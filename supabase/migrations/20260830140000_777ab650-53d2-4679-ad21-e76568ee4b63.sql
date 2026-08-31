-- Phase 5: category-specific quote-request answers (event date, guest count, etc.),
-- additive and optional — a requirement with no category-specific questions stores null.
alter table public.requirements
  add column if not exists extra_answers jsonb;
