import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "business" | "customer" | "influencer" | null;

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export type AccountContext = {
  loading: boolean;
  userId: string | null;
  emailVerified: boolean;
  role: AppRole;
  displayName: string | null;
  businessId: string | null;
  businessName: string | null;
};

/**
 * Session + role context used by navigation and dashboards.
 * Refetches automatically whenever the auth state changes.
 */
export function useAccount(): AccountContext {
  const { user, loading } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["account-context", user?.id ?? null],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data: profile }, { data: business }, { data: influencer }] = await Promise.all([
        supabase.from("profiles").select("role,name,email").eq("id", user!.id).maybeSingle(),
        supabase
          .from("businesses")
          .select("id,name")
          .eq("owner_id", user!.id)
          .is("deleted_at", null)
          .maybeSingle(),
        supabase
          .from("influencer_profiles")
          .select("id,display_name")
          .eq("user_id", user!.id)
          .is("deleted_at", null)
          .maybeSingle(),
      ]);
      return { profile, business, influencer };
    },
  });

  const role: AppRole = !user
    ? null
    : data?.business
      ? "business"
      : data?.influencer
        ? "influencer"
        : data?.profile?.role === "business"
          ? "business"
          : "customer";

  return {
    loading: loading || (!!user && isLoading),
    userId: user?.id ?? null,
    emailVerified: !!user?.email_confirmed_at,
    role: user ? role : null,
    displayName:
      data?.influencer?.display_name ??
      data?.profile?.name ??
      user?.email?.split("@")[0] ??
      null,
    businessId: data?.business?.id ?? null,
    businessName: data?.business?.name ?? null,
  };
}
