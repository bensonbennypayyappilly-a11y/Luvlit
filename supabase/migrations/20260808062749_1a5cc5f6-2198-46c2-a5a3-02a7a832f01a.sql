-- Restore EXECUTE grants dropped by 20260730030041_026fd750-d7d3-4616-854b-340fab9b2279.sql.
-- These are SECURITY DEFINER functions called inside RLS policies; the calling
-- role (authenticated, via PostgREST) needs EXECUTE on the function itself
-- regardless of what the function body can see internally.
GRANT EXECUTE ON FUNCTION public.owns_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.in_conversation(uuid) TO authenticated;