create policy "Business media is readable"
on storage.objects for select
using (bucket_id = 'business-media');

create policy "Owners can upload their business media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-media'
  and public.owns_business((storage.foldername(name))[1]::uuid)
);

create policy "Owners can update their business media"
on storage.objects for update to authenticated
using (
  bucket_id = 'business-media'
  and public.owns_business((storage.foldername(name))[1]::uuid)
);

create policy "Owners can delete their business media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-media'
  and public.owns_business((storage.foldername(name))[1]::uuid)
);