import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — LuvLit" },
      {
        name: "description",
        content: "Your appointments, requirements, quotes and saved businesses on LuvLit.",
      },
      { property: "og:title", content: "Your dashboard — LuvLit" },
      { property: "og:description", content: "Appointments, quotes and favourites in one place." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["customer-dashboard"],
    queryFn: async () => {
      const [{ data: profile }, { data: requirements }, { data: favorites }] = await Promise.all([
        supabase.auth.getUser().then(async ({ data: u }) =>
          supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle(),
        ),
        supabase.from("requirements").select("*").order("created_at", { ascending: false }),
        supabase.from("favorites").select("business_id, businesses(id,name)"),
      ]);
      return { profile, requirements: requirements ?? [], favorites: favorites ?? [] };
    },
  });

  const isBusiness = data?.profile?.role === "business";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-20">
        <p className="eyebrow">Your account</p>
        <h1 className="mt-4 text-4xl">Dashboard</h1>

        {isBusiness && (
          <div className="surface-card mt-10 flex flex-wrap items-center justify-between gap-4 p-8">
            <p className="text-muted-foreground">You have a business account.</p>
            <Link
              to="/business/onboarding"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
            >
              Manage your business
            </Link>
          </div>
        )}

        <section className="mt-14">
          <div className="hairline flex items-end justify-between pt-10">
            <h2 className="text-2xl">Your requirements</h2>
            <Link to="/post-requirement" className="text-sm text-primary hover:underline">
              Post a requirement →
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {(data?.requirements ?? []).map((r) => (
              <div key={r.id} className="surface-card p-6">
                <p className="eyebrow">{r.category}</p>
                <p className="mt-2">{r.description}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {r.city} {r.budget ? `· ₹${r.budget}` : ""}
                </p>
              </div>
            ))}
            {!data?.requirements.length && (
              <p className="text-muted-foreground">Nothing posted yet.</p>
            )}
          </div>
        </section>

        <section className="mt-14">
          <div className="hairline pt-10">
            <h2 className="text-2xl">Saved businesses</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(data?.favorites ?? []).map((f) => (
              <Link
                key={f.business_id}
                to="/business/$id"
                params={{ id: f.business_id }}
                className="surface-card p-6 hover:border-accent"
              >
                {f.businesses?.name ?? "Business"}
              </Link>
            ))}
            {!data?.favorites.length && <p className="text-muted-foreground">No favourites yet.</p>}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
