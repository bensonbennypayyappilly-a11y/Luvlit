-- Separate from `description` (the short blurb used as the hero tagline, SEO summary and
-- business-card text): this is the long-form "About us" narrative shown only in the About
-- section, so editing one no longer overwrites what the other displays.
alter table public.businesses
  add column if not exists about_text text;
