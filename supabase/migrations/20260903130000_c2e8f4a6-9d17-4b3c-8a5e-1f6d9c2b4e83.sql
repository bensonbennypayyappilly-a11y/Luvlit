-- Website Builder rebuild, Phase 2: the last curated Design-panel control from §18
-- ("image treatment") — a subtle CSS filter applied to content images, same null-means-
-- template-default pattern as corner_style/density. button_style already existed as a column
-- (pre-dating this rebuild) but was never actually wired into rendering — no schema change
-- needed for it, just the app-level wiring done alongside this migration.
alter table public.businesses
  add column if not exists image_treatment text;
alter table public.businesses
  add constraint businesses_image_treatment_check check (image_treatment is null or image_treatment in ('none', 'warm', 'mono'));
