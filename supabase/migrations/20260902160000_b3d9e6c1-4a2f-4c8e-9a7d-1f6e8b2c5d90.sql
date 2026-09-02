-- businesses.slug is also the business "username" now (onboarding lets an owner type it
-- directly, rather than only deriving it from the business name) — enforce case-insensitive
-- uniqueness at the DB level so `Alora`/`alora`/`ALORA` can never become two different rows,
-- even if some future write path forgets to lowercase first. The app already always normalizes
-- to lowercase before writing (see src/lib/username.ts's normalizeUsername), so this is a
-- defense-in-depth guarantee, not a behavior change for existing data — confirmed no existing
-- row collides case-insensitively before adding it.
alter table public.businesses drop constraint businesses_slug_key;
create unique index businesses_slug_lower_key on public.businesses (lower(slug));
