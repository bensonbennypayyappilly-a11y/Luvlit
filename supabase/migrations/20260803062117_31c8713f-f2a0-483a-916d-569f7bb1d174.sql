alter table public.businesses add column if not exists hero_image_url text;
alter table public.businesses add column if not exists deleted_at timestamptz;
alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.influencer_profiles add column if not exists deleted_at timestamptz;
alter table public.messages add column if not exists read_at timestamptz;

drop policy if exists "Public can view live businesses" on public.businesses;
create policy "Public can view live businesses"
on public.businesses for select
using (is_live = true and deleted_at is null);

drop policy if exists "Public can view approved influencers" on public.influencer_profiles;
create policy "Public can view approved influencers"
on public.influencer_profiles for select
using (approval_status = 'approved' and deleted_at is null);

create or replace function public.soft_delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.profiles set deleted_at = now() where id = auth.uid() and deleted_at is null;
  update public.businesses set deleted_at = now(), is_live = false where owner_id = auth.uid() and deleted_at is null;
  update public.influencer_profiles set deleted_at = now() where user_id = auth.uid() and deleted_at is null;
end;
$$;

revoke all on function public.soft_delete_account() from public, anon;
grant execute on function public.soft_delete_account() to authenticated;