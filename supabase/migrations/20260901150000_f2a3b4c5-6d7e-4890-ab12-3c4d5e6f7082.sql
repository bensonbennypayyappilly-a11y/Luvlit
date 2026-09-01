-- Optional "Visit Official Site" link. A business can add their own external domain (their own
-- standalone site, a Linktree, whatever) and it shows as a "Visit Official Site" button on their
-- LuvLit page's navigation — purely optional, never required, never affects any other field.
alter table public.businesses
  add column if not exists custom_domain text;
