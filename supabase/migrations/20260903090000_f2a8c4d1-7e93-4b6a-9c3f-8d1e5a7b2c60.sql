-- Smart Lead Engine V1, part 1: schema.
-- Adds the structured fields the matching engine needs, plus reference tables for synonym
-- normalization, narrow exclusions, and deliberate (never inferred) cross-category relationships.
-- Everything here is additive — no column is removed or repurposed. requirements.extra_answers
-- stays untouched and unused; the new fields below are typed columns instead, since the matching
-- engine needs to filter/index them, not just display them.

-- ---------------------------------------------------------------------------
-- businesses: richer matching profile
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column if not exists tagline text,
  add column if not exists phone text,
  add column if not exists specialities text[] not null default '{}',
  add column if not exists order_types text[] not null default '{}',
  add column if not exists service_locations text[] not null default '{}',
  add column if not exists pickup_available boolean not null default false,
  add column if not exists delivery_available boolean not null default false,
  add column if not exists courier_available boolean not null default false,
  add column if not exists preferred_contact text,
  add column if not exists gallery_alt_text jsonb not null default '{}';

-- ---------------------------------------------------------------------------
-- locations: landmark + declared service radius (a label, not a computed distance —
-- this project has no lat/long/geocoding, so radius stays a declared scope like the
-- existing delivery_areas city/pan-India model, not a real geometry).
-- ---------------------------------------------------------------------------
alter table public.locations
  add column if not exists landmark text,
  add column if not exists service_radius text;

-- ---------------------------------------------------------------------------
-- requirements: structured intent/speciality/delivery fields the matching engine reads
-- ---------------------------------------------------------------------------
alter table public.requirements
  add column if not exists title text,
  add column if not exists intent text,
  add column if not exists speciality_tags text[] not null default '{}',
  add column if not exists delivery_preference text,
  add column if not exists quantity integer,
  add column if not exists needed_before date,
  add column if not exists urgent boolean not null default false;

-- ---------------------------------------------------------------------------
-- leads: persisted match score + structured reason codes (jsonb, not text[] — an array of
-- {code, detail} objects so the UI can translate codes to copy without touching stored data)
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists match_score integer,
  add column if not exists match_reasons jsonb not null default '[]';

-- ---------------------------------------------------------------------------
-- Reference tables. All three are read-only to `authenticated` (matching the `notifications`
-- table's pattern of blocking client writes) — managed by service-role/admin only, no app UI
-- for editing these in V1 per the approved plan.
-- ---------------------------------------------------------------------------

-- Normalizes equivalent terminology (e.g. "servicing"/"fix" -> "repair", "bridal jewelry" ->
-- "bridal jewellery"). Must never be used to imply a different capability, only to merge
-- spelling/phrasing variants of the same thing — enforced by convention (seed data below), not
-- by a schema constraint.
create table public.keyword_synonyms (
  term text primary key,
  canonical text not null
);
grant select on public.keyword_synonyms to authenticated;
grant all on public.keyword_synonyms to service_role;
alter table public.keyword_synonyms enable row level security;
create policy "anyone reads keyword synonyms" on public.keyword_synonyms for select to authenticated using (true);

-- Narrow, conservative, admin-curated final exclusions — NOT a second matching engine. Seeded
-- with only clearly-wrong pairings; never relied on to compensate for weak category modeling.
create table public.keyword_exclusions (
  category text not null,
  excluded_term text not null,
  primary key (category, excluded_term)
);
grant select on public.keyword_exclusions to authenticated;
grant all on public.keyword_exclusions to service_role;
alter table public.keyword_exclusions enable row level security;
create policy "anyone reads keyword exclusions" on public.keyword_exclusions for select to authenticated using (true);

-- Deliberate, explicit cross-category relationships only — seeded EMPTY. A requirement in one
-- category only ever reaches a business in a different category if a row exists here; nothing
-- is inferred from specialities, keywords, or text similarity.
create table public.category_relations (
  category text not null,
  related_category text not null,
  primary key (category, related_category)
);
grant select on public.category_relations to authenticated;
grant all on public.category_relations to service_role;
alter table public.category_relations enable row level security;
create policy "anyone reads category relations" on public.category_relations for select to authenticated using (true);

-- Seed: normalization only, no capability inference.
insert into public.keyword_synonyms (term, canonical) values
  ('bridal', 'bridal'),
  ('wedding', 'wedding'),
  ('marriage', 'wedding'),
  ('reception', 'wedding'),
  ('engagement', 'wedding'),
  ('gift hamper', 'hamper'),
  ('gift box', 'hamper'),
  ('return gift', 'hamper'),
  ('corporate gift', 'hamper'),
  ('personalised', 'customized'),
  ('personalized', 'customized'),
  ('bespoke', 'customized'),
  ('made-to-order', 'customized'),
  ('made to order', 'customized'),
  ('servicing', 'repair'),
  ('fixing', 'repair'),
  ('fix', 'repair'),
  ('repairing', 'repair')
on conflict (term) do nothing;

-- ---------------------------------------------------------------------------
-- Full-text search columns + GIN indexes (Postgres FTS, not a vector database — this is the
-- 5-point supporting text-relevance signal only, and the lookup basis for structured
-- capability checks against items/services names).
-- ---------------------------------------------------------------------------
-- Trigger-maintained rather than GENERATED ALWAYS AS STORED: Postgres's generated-column
-- immutability check rejects to_tsvector(regconfig, text) in this project's environment even
-- with an explicit ::regconfig cast (a known cross-version friction point) — a plain column
-- kept current by a BEFORE INSERT/UPDATE trigger sidesteps that check entirely and is the
-- standard portable pattern.
alter table public.businesses add column if not exists search_vector tsvector;
alter table public.items add column if not exists search_vector tsvector;
alter table public.services add column if not exists search_vector tsvector;

create or replace function public.businesses_update_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector := to_tsvector('english',
    coalesce(new.name, '') || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(new.tagline, '') || ' ' ||
    array_to_string(coalesce(new.specialities, '{}'), ' ') || ' ' ||
    array_to_string(coalesce(new.categories, '{}'), ' ')
  );
  return new;
end;
$$;
drop trigger if exists businesses_search_vector_trigger on public.businesses;
create trigger businesses_search_vector_trigger
  before insert or update on public.businesses
  for each row execute function public.businesses_update_search_vector();

create or replace function public.catalogue_update_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector := to_tsvector('english',
    coalesce(new.name, '') || ' ' || coalesce(new.description, '') || ' ' || coalesce(new.category, '')
  );
  return new;
end;
$$;
drop trigger if exists items_search_vector_trigger on public.items;
create trigger items_search_vector_trigger
  before insert or update on public.items
  for each row execute function public.catalogue_update_search_vector();
drop trigger if exists services_search_vector_trigger on public.services;
create trigger services_search_vector_trigger
  before insert or update on public.services
  for each row execute function public.catalogue_update_search_vector();

-- Backfill existing rows (the trigger above only fires on future writes).
update public.businesses set search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(tagline, '') || ' ' ||
  array_to_string(coalesce(specialities, '{}'), ' ') || ' ' || array_to_string(coalesce(categories, '{}'), ' ')
);
update public.items set search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '')
);
update public.services set search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '')
);

create index if not exists businesses_search_vector_idx on public.businesses using gin (search_vector);
create index if not exists items_search_vector_idx on public.items using gin (search_vector);
create index if not exists services_search_vector_idx on public.services using gin (search_vector);

-- ---------------------------------------------------------------------------
-- Indexes the matching engine leans on directly (previously unindexed per audit).
-- ---------------------------------------------------------------------------
create index if not exists leads_matched_business_status_idx on public.leads (matched_business_id, status);
create index if not exists requirements_category_status_idx on public.requirements (category, status);
create index if not exists items_business_category_idx on public.items (business_id, category);
create index if not exists services_business_category_idx on public.services (business_id, category);
