import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { PublicEvent } from "@/lib/public.types";

type EventWithOrganizer = Pick<
  PublicEvent,
  "id" | "title" | "description" | "category" | "city" | "address" | "start_date" | "end_date" | "image_urls" | "is_featured"
> & { organizer: { id: string; name: string } | null };

/** Public single-event lookup — kept local to this route since it isn't shared elsewhere. */
const getEventById = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<EventWithOrganizer | null> => {
    const { publicClient } = await import("@/lib/supabase-public.server");
    const client = publicClient();
    const { data: event, error } = await client
      .from("events")
      .select("id,title,description,category,city,address,start_date,end_date,image_urls,is_featured,organizer_id")
      .eq("id", data.id)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) return null;

    const { data: organizer, error: organizerError } = await client
      .from("organizer_profiles")
      .select("id,name")
      .eq("user_id", event.organizer_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (organizerError) throw new Error(organizerError.message);

    return { ...event, organizer: organizer ?? null } as EventWithOrganizer;
  });

export const Route = createFileRoute("/events/$id")({
  loader: async ({ params }) => getEventById({ data: { id: params.id } }),
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Event unavailable — LuvLit" }, { name: "robots", content: "noindex" }] };
    }
    const url = `https://luvlit.in/events/${params.id}`;
    const desc = (loaderData.description ?? `${loaderData.title} on LuvLit.`).slice(0, 155);
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title: `${loaderData.title} — LuvLit` },
      { name: "description", content: desc },
      { property: "og:title", content: loaderData.title },
      { property: "og:description", content: desc },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
    ];
    if (loaderData.image_urls?.[0]) {
      meta.push({ property: "og:image", content: loaderData.image_urls[0] });
      meta.push({ name: "twitter:image", content: loaderData.image_urls[0] });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: loaderData.title,
            description: desc,
            url,
            startDate: loaderData.start_date,
            ...(loaderData.end_date ? { endDate: loaderData.end_date } : {}),
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            ...(loaderData.image_urls?.length ? { image: loaderData.image_urls } : {}),
            ...(loaderData.city || loaderData.address
              ? {
                  location: {
                    "@type": "Place",
                    name: loaderData.address ?? loaderData.city ?? "",
                    address: {
                      "@type": "PostalAddress",
                      ...(loaderData.address ? { streetAddress: loaderData.address } : {}),
                      ...(loaderData.city ? { addressLocality: loaderData.city } : {}),
                      addressCountry: "IN",
                    },
                  },
                }
              : {}),
          }),
        },
      ],
    };
  },
  errorComponent: () => <Shell>Something went wrong loading this event.</Shell>,
  notFoundComponent: () => <Shell>This event isn't available.</Shell>,
  component: EventDetail,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="text-muted-foreground">{children}</p>
        <Link to="/events" className="mt-4 inline-block text-primary underline-offset-4 hover:underline">
          Browse events
        </Link>
      </div>
    </div>
  );
}

function EventDetail() {
  const event = Route.useLoaderData();
  if (!event) return <Shell>This event isn't available.</Shell>;

  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground">
          ← All events
        </Link>

        {event.image_urls?.[0] && (
          <div className="mt-6 aspect-[16/9] w-full overflow-hidden rounded-3xl bg-secondary">
            <img src={event.image_urls[0]} alt={event.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {event.category && (
            <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {event.category}
            </span>
          )}
          {event.is_featured && (
            <span className="rounded-full bg-accent px-3 py-1 text-xs uppercase tracking-[0.16em] text-accent-foreground">
              Featured
            </span>
          )}
        </div>

        <h1 className="mt-4 text-3xl md:text-4xl">{event.title}</h1>

        <p className="mt-4 text-sm text-muted-foreground">
          {start.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
          {end && ` — ${end.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}`}
        </p>
        {(event.city || event.address) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[event.address, event.city].filter(Boolean).join(", ")}
          </p>
        )}
        {event.organizer && (
          <p className="mt-1 text-sm text-muted-foreground">
            Hosted by{" "}
            <Link
              to="/organizer/$id"
              params={{ id: event.organizer.id }}
              className="text-primary underline-offset-4 hover:underline"
            >
              {event.organizer.name}
            </Link>
          </p>
        )}

        {event.description && <p className="mt-8 whitespace-pre-line text-base leading-relaxed">{event.description}</p>}
      </main>
    </div>
  );
}
