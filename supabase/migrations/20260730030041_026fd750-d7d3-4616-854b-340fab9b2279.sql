DROP POLICY IF EXISTS "authenticated create conversation" ON public.conversations;
CREATE POLICY "participants create conversation" ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  (party_a_type = 'customer' AND party_a_id = auth.uid())
  OR (party_b_type = 'customer' AND party_b_id = auth.uid())
  OR (party_a_type IN ('business','influencer') AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = party_a_id AND b.owner_id = auth.uid()))
  OR (party_b_type IN ('business','influencer') AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = party_b_id AND b.owner_id = auth.uid()))
);