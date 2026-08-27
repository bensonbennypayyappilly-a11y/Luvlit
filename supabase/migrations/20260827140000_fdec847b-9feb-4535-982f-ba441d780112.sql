-- Backfill businesses.slug (column + unique constraint already existed since the very
-- first migration, but was never populated or used) and make it NOT NULL.
--
-- Reserved words kept in sync by hand with src/lib/reserved-slugs.ts.
do $$
declare
  reserved text[] := array[
    'www','api','app','admin','dashboard','auth','mail','staging','luvlit','luvlit-in',
    'browse','business','cities','contact','events','influencer','privacy','terms',
    'pricing','about','post-requirement','organizer','sitemap','robots','favicon',
    'verify-email',
    'ftp','ns1','ns2','smtp','imap','pop','mx','cdn','static','assets','dev','test',
    'blog','help','support','docs','status','cname','webmail','autodiscover','autoconfig'
  ];
  biz record;
  base_slug text;
  candidate text;
  suffix int;
begin
  for biz in select id, name from public.businesses where slug is null order by created_at loop
    base_slug := lower(regexp_replace(coalesce(biz.name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' then
      base_slug := 'business';
    end if;

    candidate := base_slug;
    suffix := 1;
    while candidate = any(reserved)
       or exists(select 1 from public.businesses b where b.slug = candidate and b.id <> biz.id) loop
      suffix := suffix + 1;
      candidate := base_slug || '-' || suffix::text;
    end loop;

    update public.businesses set slug = candidate where id = biz.id;
  end loop;
end $$;

alter table public.businesses alter column slug set not null;
