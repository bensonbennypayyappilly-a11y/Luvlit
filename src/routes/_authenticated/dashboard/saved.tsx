import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BusinessCard } from "@/components/business-card";
import { useAccount } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/dashboard/saved")({
  head: () => ({
    meta: [
      { title: "Saved businesses — LuvLit" },
      {
        name: "description",
        content: "The businesses you've favourited on LuvLit, all in one place.",
      },
      { property: "og:title", content: "Saved businesses — LuvLit" },
      { property: "og:description", content: "Your shortlist of favourite businesses." },
    ],
  }),
  component: Saved,
});

function Saved() {
  const { userId } = useAccount();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["saved-businesses", userId],
    enabled: !!userId,
    queryFn: async () =>
      (
        await supabase
          .from("favorites")
          .select(
            "id, business_id, businesses(id,name,description,categories,is_eco_friendly,locations(city))",
          )
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  async function remove(favoriteId: string) {
    await supabase.from("favorites").delete().eq("id", favoriteId);
    queryClient.invalidateQueries({ queryKey: ["saved-businesses", userId] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <p className="eyebrow">Your shortlist</p>
        <h1 className="mt-4 text-4xl">Saved businesses</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Businesses you've favourited, ready whenever you need them.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {(data ?? []).map((f) =>
            f.businesses ? (
              <div key={f.id} className="relative">
                <BusinessCard business={f.businesses} />
                <button
                  onClick={() => remove(f.id)}
                  className="absolute right-4 top-4 rounded-full bg-card px-3 py-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            ) : null,
          )}
          {!data?.length && (
            <p className="text-muted-foreground">No favourites yet — browse and save some businesses.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
