-- Website builder: a business's public page becomes an ordered list of typed, toggleable
-- sections instead of a fixed set of hardcoded fields. Additive only — every existing
-- businesses column stays exactly as-is; several section types (services, products, gallery,
-- location, etc.) reference that existing data rather than duplicating it into jsonb.
--
-- sections = published/live layout, rendered publicly.
-- draft_sections = a business's in-progress edits (null = no unpublished changes). "Save"
-- writes here; "Publish" copies draft_sections -> sections. Mirrors the existing is_live
-- publish-gate pattern (private iteration, then an explicit publish step) rather than the
-- instant-autosave-to-production behaviour the rest of the business row still has today.
alter table public.businesses
  add column if not exists sections jsonb not null default '[]',
  add column if not exists draft_sections jsonb;
