import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAccount } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { userId, loading: accountLoading } = useAccount();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId!,
        _role: "admin",
      });
      if (error) return false;
      return !!data;
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        {accountLoading || isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : isAdmin ? (
          <Outlet />
        ) : (
          <div className="surface-card p-10 text-center">
            <p className="eyebrow">Restricted area</p>
            <h1 className="mt-4 text-3xl">Not authorised</h1>
            <p className="mt-3 text-muted-foreground">
              This area is only available to LuvLit administrators.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
