-- Scope role lookup to the caller only (prevents probing other users' roles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role = _role
      and _user_id = auth.uid()
  )
$function$;

-- Scope organizer lookup to the caller only
CREATE OR REPLACE FUNCTION public.is_organizer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organizer_profiles
    WHERE user_id = _user_id
      AND deleted_at IS NULL
      AND _user_id = auth.uid()
  )
$function$;

-- Remove blanket PUBLIC execute grants; keep only the roles that need them
REVOKE ALL ON FUNCTION public.increment_business_views(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_slot(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_organizer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_business(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.in_conversation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_account() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.increment_business_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_slot(uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organizer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.in_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_account() TO authenticated;