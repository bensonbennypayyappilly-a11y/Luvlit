import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAccount } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/dashboard/")({
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
  const { userId, displayName, role } = useAccount();

  const { data } = useQuery({
    queryKey: ["customer-dashboard-overview", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: bookings }, { data: requirements }, { data: favorites }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id,status,businesses(name),slots(date,start_time,staff(name))")
          .eq("customer_user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("requirements")
          .select("*")
          .eq("posted_by_user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("favorites")
          .select("business_id, businesses(id,name)")
          .eq("user_id", userId!)
          .limit(4),
      ]);
      return { bookings: bookings ?? [], requirements: requirements ?? [], favorites: favorites ?? [] };
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-20">
        <p className="eyebrow">Hey {displayName ?? "there"} 👋</p>
        <h1 className="mt-4 text-4xl">Welcome back to LuvLit</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Here's a warm little snapshot of your appointments, requirements, chats and favourite
          businesses.
        </p>

        {role === "business" && (
          <div className="surface-card mt-10 flex flex-wrap items-center justify-between gap-4 p-8">
            <p className="text-muted-foreground">You also have a business account.</p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/dashboard/find-influencer"
                className="rounded-md border border-accent px-6 py-3 text-sm font-medium text-accent hover:bg-accent-soft"
              >
                Find an influencer
              </Link>
              <Link
                to="/business/onboarding"
                className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
              >
                Manage your business
              </Link>
            </div>
          </div>
        )}

        <section className="mt-14 grid gap-6 sm:grid-cols-2">
          <Link to="/dashboard/requirements" className="surface-card p-8 hover:border-accent">
            <p className="eyebrow">My requirements</p>
            <p className="mt-3 text-2xl">{data?.requirements.length ?? 0} recent</p>
            <p className="mt-2 text-sm text-muted-foreground">See quotes coming in and reply.</p>
          </Link>
          <Link to="/dashboard/saved" className="surface-card p-8 hover:border-accent">
            <p className="eyebrow">Saved businesses</p>
            <p className="mt-3 text-2xl">{data?.favorites.length ?? 0} favourites</p>
            <p className="mt-2 text-sm text-muted-foreground">Your shortlist, all in one place.</p>
          </Link>
          <Link to="/dashboard/chats" className="surface-card p-8 hover:border-accent">
            <p className="eyebrow">Chats</p>
            <p className="mt-3 text-2xl">Open conversations</p>
            <p className="mt-2 text-sm text-muted-foreground">Talk to businesses you've reached out to.</p>
          </Link>
          <Link to="/dashboard/settings" className="surface-card p-8 hover:border-accent">
            <p className="eyebrow">Account settings</p>
            <p className="mt-3 text-2xl">Your details</p>
            <p className="mt-2 text-sm text-muted-foreground">Update your name, phone and email.</p>
          </Link>
        </section>

        <section className="mt-16">
          <div className="hairline flex items-end justify-between pt-10">
            <h2 className="text-2xl">Upcoming appointments</h2>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {(data?.bookings ?? []).map((b) => (
              <div key={b.id} className="surface-card p-7">
                <p className="text-lg">{b.businesses?.name ?? "Business"}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {b.slots?.date} · {b.slots?.start_time}
                  {b.slots?.staff?.name ? ` · with ${b.slots.staff.name}` : ""}
                </p>
                <p className="mt-3 eyebrow">{b.status}</p>
              </div>
            ))}
            {!data?.bookings.length && (
              <p className="text-muted-foreground">No appointments booked yet.</p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
