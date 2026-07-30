import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCities } from "@/lib/public.functions";
import type { CityRow } from "@/lib/public.types";

export const Route = createFileRoute("/cities")({
  loader: async () => ({ cities: await getCities() }),
  head: () => ({
    meta: [
      { title: "Cities on LuvLit — browse small businesses across India" },
      {
        name: "description",
        content:
          "Every city LuvLit covers, from Mumbai and Bengaluru to Guwahati and Kozhikode. Pick a city to browse the small businesses and brands serving it.",
      },
      { property: "og:title", content: "Cities on LuvLit" },
      {
        property: "og:description",
        content: "Browse small businesses and brands city by city across India.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cities,
});

function Cities() {
  const { cities } = Route.useLoaderData() as { cities: CityRow[] };
  const byState = new Map<string, CityRow[]>();
  for (const c of cities) {
    const key = c.state ?? "Other";
    byState.set(key, [...(byState.get(key) ?? []), c]);
  }
  const states = [...byState.keys()].sort();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-20">
        <p className="eyebrow">Discover</p>
        <h1 className="mt-4 text-4xl md:text-5xl">Cities we cover</h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Pick a city to see businesses located there, plus everyone who delivers or serves it.
        </p>

        <div className="mt-14 space-y-10">
          {states.map((state) => (
            <section key={state} className="hairline pt-8">
              <h2 className="font-sans text-xs font-medium uppercase tracking-[0.16em] text-foreground">
                {state}
              </h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {(byState.get(state) ?? []).map((c) => (
                  <Link
                    key={c.id}
                    to="/browse"
                    search={{ city: c.name }}
                    className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-accent"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-16 text-sm text-muted-foreground">
          Don't see your city?{" "}
          <Link to="/contact" className="text-primary hover:underline">
            Tell us
          </Link>{" "}
          and we'll add it.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
