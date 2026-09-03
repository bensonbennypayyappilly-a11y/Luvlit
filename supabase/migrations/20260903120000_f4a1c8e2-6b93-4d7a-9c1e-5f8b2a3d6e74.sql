-- Website Builder rebuild, Phase 1: additive data-model groundwork.
--
-- 1) A real, owner-editable page system. `pages` is the source of truth for page
-- existence/order/labels/nav-visibility, decoupled from the previously-hardcoded PageId union.
-- Mirrors the existing sections/draft_sections pattern (draft = in-progress, live copy only on
-- publish) rather than inventing a new persistence model.
alter table public.businesses
  add column if not exists pages jsonb not null default '[]',
  add column if not exists draft_pages jsonb;

-- 2) Curated design overrides (Design panel, §18) — null means "use the template's own default",
-- so nothing changes for existing businesses until an owner explicitly picks something.
alter table public.businesses
  add column if not exists corner_style text,
  add column if not exists density text;
alter table public.businesses
  add constraint businesses_corner_style_check check (corner_style is null or corner_style in ('soft', 'sharp')),
  add constraint businesses_density_check check (density is null or density in ('airy', 'compact'));

-- 3) Clean product/service detail-page URLs. Trigger-generated from `name` (not a generated
-- column — this project has already hit Postgres's "generation expression is not immutable"
-- error with to_tsvector; a plain column + BEFORE INSERT/UPDATE trigger is the established
-- portable pattern here), unique per business so two businesses can both have "wedding-cake".
alter table public.items add column if not exists slug text;
alter table public.services add column if not exists slug text;

create or replace function public.slugify(_text text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.catalogue_set_slug()
returns trigger language plpgsql as $$
declare
  base text;
  candidate text;
  n int := 1;
  tbl text := tg_table_name;
begin
  if new.slug is not null and new.slug <> '' then
    new.slug := public.slugify(new.slug);
  else
    base := public.slugify(new.name);
    if base = '' then base := 'item'; end if;
    new.slug := base;
  end if;
  candidate := new.slug;
  if tbl = 'items' then
    while exists (select 1 from public.items where business_id = new.business_id and slug = candidate and id <> new.id) loop
      n := n + 1;
      candidate := new.slug || '-' || n;
    end loop;
  else
    while exists (select 1 from public.services where business_id = new.business_id and slug = candidate and id <> new.id) loop
      n := n + 1;
      candidate := new.slug || '-' || n;
    end loop;
  end if;
  new.slug := candidate;
  return new;
end;
$$;

create trigger items_set_slug before insert or update of name, slug on public.items
for each row execute function public.catalogue_set_slug();
create trigger services_set_slug before insert or update of name, slug on public.services
for each row execute function public.catalogue_set_slug();

-- Backfill existing rows (fires the trigger via a no-op update of name).
update public.items set name = name where slug is null;
update public.services set name = name where slug is null;

alter table public.items alter column slug set not null;
alter table public.services alter column slug set not null;
create unique index if not exists items_business_slug_idx on public.items (business_id, slug);
create unique index if not exists services_business_slug_idx on public.services (business_id, slug);
