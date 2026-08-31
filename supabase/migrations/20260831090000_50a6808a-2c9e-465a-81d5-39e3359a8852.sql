-- Phase 1 (audit fix): enforce one active business per owner at the database layer.
-- Root cause of the "Edit profile & media" lockout bug: onboarding could insert a second
-- businesses row for an owner who already had one, and nothing stopped it. Every lookup
-- keyed on owner_id then hit Postgres's "multiple rows" error, silently swallowed as null
-- by the app, so the owner was bounced back to onboarding forever.

-- Remediation first: soft-delete any pre-existing duplicate rows before the constraint
-- below can be added, keeping the earliest-created row per owner as authoritative. Nothing
-- is destroyed — duplicates are marked deleted_at/suspended, matching the existing soft-delete
-- convention (see soft_delete_account()), and remain inspectable if the wrong one was kept.
with ranked as (
  select id, owner_id,
         row_number() over (partition by owner_id order by created_at asc, id asc) as rn
  from public.businesses
  where deleted_at is null
)
update public.businesses b
set deleted_at = now(), is_live = false, status = 'suspended'
from ranked r
where b.id = r.id and r.rn > 1;

-- One active (non-soft-deleted) business per owner, going forward.
create unique index if not exists businesses_owner_id_active_idx
  on public.businesses (owner_id) where deleted_at is null;

-- subscriptions.business_id had no uniqueness guard either — onboarding's finish() step
-- used to insert unconditionally, so replaying it (which the lockout bug made unreachable
-- safely, but which is now a real edit path) could have stacked duplicate billing rows.
create unique index if not exists subscriptions_business_id_idx
  on public.subscriptions (business_id);
