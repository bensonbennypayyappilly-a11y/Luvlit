revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.owns_business(uuid) from anon;
revoke execute on function public.in_conversation(uuid) from anon;
revoke execute on function public.soft_delete_account() from anon;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

drop policy if exists "Business media is readable" on storage.objects;

create policy "Live business media is readable"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'business-media'
  and exists (
    select 1 from public.businesses b
    where b.id = ((storage.foldername(name))[1])::uuid
      and b.is_live = true
      and b.deleted_at is null
  )
);

create policy "Owners can read their business media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'business-media'
  and public.owns_business(((storage.foldername(name))[1])::uuid)
);