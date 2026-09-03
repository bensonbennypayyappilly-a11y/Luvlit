-- The catalogue_set_slug trigger always fills `slug` before the NOT NULL constraint is checked,
-- but a NOT NULL column with no default makes Supabase's generated Insert type mark it required
-- — a false requirement callers shouldn't have to satisfy. A default lets the generator (and
-- PostgREST) treat it as optional while the trigger still does the real work.
alter table public.items alter column slug set default '';
alter table public.services alter column slug set default '';
