-- Phase 3: curated website style presets. A short text id (not an enum) matching one of the
-- keys in src/lib/website-templates.ts — kept a plain column rather than a Postgres enum so
-- adding a future template doesn't need a migration, only a code change to that file's map.
alter table public.businesses
  add column if not exists template text not null default 'studio';
