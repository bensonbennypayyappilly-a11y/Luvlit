CREATE OR REPLACE FUNCTION public.is_organizer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizer_profiles
    WHERE user_id = _user_id AND deleted_at IS NULL
  )
$$;
REVOKE ALL ON FUNCTION public.is_organizer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_organizer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_organizer(uuid) TO authenticated;

DROP POLICY IF EXISTS "Organizers manage own events" ON public.events;
CREATE POLICY "Organizers manage own events" ON public.events
  FOR ALL TO authenticated
  USING (organizer_id = auth.uid() AND public.is_organizer(auth.uid()))
  WITH CHECK (organizer_id = auth.uid() AND public.is_organizer(auth.uid()));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';
UPDATE public.items SET image_urls = ARRAY[image_url]
 WHERE image_url IS NOT NULL AND array_length(image_urls,1) IS NULL;

-- event-media storage policies
CREATE POLICY "Organizer can upload own event media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-media'
  AND public.is_organizer(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Organizer can manage own event media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Organizer can delete own event media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Published event media is public"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'event-media'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.organizer_id::text = (storage.foldername(name))[1]
      AND e.status = 'published'
  )
);
CREATE POLICY "Organizer can read own event media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'event-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- requirement-media storage policies
CREATE POLICY "Poster can upload own requirement media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'requirement-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Poster can read own requirement media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'requirement-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Matched businesses can read requirement media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'requirement-media'
  AND EXISTS (
    SELECT 1 FROM public.requirements r
    JOIN public.leads l ON l.requirement_id = r.id
    WHERE r.posted_by_user_id::text = (storage.foldername(name))[1]
      AND public.owns_business(l.matched_business_id)
  )
);
CREATE POLICY "Poster can delete own requirement media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'requirement-media' AND (storage.foldername(name))[1] = auth.uid()::text);