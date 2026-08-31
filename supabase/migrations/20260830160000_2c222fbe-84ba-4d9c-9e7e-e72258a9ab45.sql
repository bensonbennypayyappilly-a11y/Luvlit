-- Phase 8-9: a structured "quote" message subtype (price/inclusions/validity) rendered
-- specially inside the existing chat — not a second inbox. Additive: every existing message
-- implicitly has message_type='text' and no quote_details, so nothing already sent changes.
alter table public.messages
  add column if not exists message_type text not null default 'text',
  add column if not exists quote_details jsonb;
