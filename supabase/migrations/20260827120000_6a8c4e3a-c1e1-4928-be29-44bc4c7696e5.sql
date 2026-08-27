-- Storage buckets for business-media, event-media and requirement-media were previously
-- created manually and never captured in a migration, so a fresh Supabase project has no
-- buckets even though the RLS policies referencing them already exist.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('business-media', 'business-media', true, 52428800),
  ('event-media', 'event-media', true, 10485760),
  ('requirement-media', 'requirement-media', false, 10485760)
on conflict (id) do nothing;
