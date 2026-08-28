import { createFileRoute, Link } from "@tanstack/react-router";
import { getOrganizerById } from "@/lib/public.functions";
import { EventCard } from "@/components/event-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/organizer/$id")({
  loader: async ({ params }) => getOrganizerById({ data: { id: params.id } }),
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Organizer unavailable — LuvLit" }, { name: "robots", content: "noindex" }] };
    }
    const url = `https://luvlit.in/organizer/${params.id}`;
    const desc = `${loaderData.name}'s upcoming events on LuvLit.`;
    return {
      meta: [
        { title: `${loaderData.name} — LuvLit` },
        { name: "description", content: desc },
        { property: "og:title", content: loaderData.name },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  errorComponent: () => <Shell>Something went wrong loading this organizer.</Shell>,
  notFoundComponent: () => <Shell>This organizer page isn't available.</Shell>,
  component: OrganizerProfile,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-6 py-16 text-center">
        <div>
          <p className="text-muted-foreground">{children}</p>
          <Link to="/events" className="mt-4 inline-block text-primary underline-offset-4 hover:underline">
            Browse events
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function OrganizerProfile() {
  const organizer = Route.useLoaderData();
  if (!organizer) return <Shell>This organizer page isn't available.</Shell>;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <p className="eyebrow">Event organizer</p>
        <h1 className="mt-4 text-4xl">{organizer.name}</h1>
        {organizer.city && <p className="mt-2 text-muted-foreground">{organizer.city}</p>}

        <h2 className="mt-14 text-2xl">Upcoming events</h2>
        {organizer.events.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No upcoming events right now.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {organizer.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
