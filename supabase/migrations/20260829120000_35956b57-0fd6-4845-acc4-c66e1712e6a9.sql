-- No FK references public.events(id) anywhere in the schema (verified) — this delete
-- cascades to nothing. pg_cron is not enabled on this project (verified live) — per
-- instruction, not enabling it here. This creates the cleanup function only; schedule
-- it yourself once pg_cron is enabled (see PHASE4_REPORT.md for the exact
-- cron.schedule() call to run).
create or replace function public.cleanup_expired_events()
returns void language sql security definer set search_path = public as $$
  delete from public.events where end_date < (now() - interval '90 days');
$$;
