-- Site-wide background colour, editable in the website builder via a colour picker. Separate
-- from brand_accent_color (buttons/highlights) and the per-section override stored in each
-- section's own content.backgroundColor (see website-sections.ts) — this is just the page
-- default, same as brand_accent_color's own default-then-override relationship.
alter table public.businesses
  add column if not exists background_color text;
