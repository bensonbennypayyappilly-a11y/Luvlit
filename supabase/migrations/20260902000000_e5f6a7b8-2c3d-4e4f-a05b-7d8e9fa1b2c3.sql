-- The business card/listing thumbnail was previously read straight off hero_image_url, so
-- editing the "listing thumbnail" in Profile & Media silently overwrote the public page's hero
-- image too (and vice versa). Give the card thumbnail its own column so it's genuinely
-- independent of both the hero (Website Builder only) and the gallery.
alter table public.businesses
  add column if not exists thumbnail_url text;
