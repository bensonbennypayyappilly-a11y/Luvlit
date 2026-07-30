import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getInfluencers, getCategories } from "@/lib/public.functions";
import { CITIES } from "@/lib/constants";
import type { CategoryRow, PublicInfluencer } from "@/lib/public.types";

export const Route = createFileRoute("/find-influencer")({
  head: () => ({
    meta: [
      { title: "Find an influencer for your brand — LuvLit" },
      {
        name: "description",
        content:
          "Browse verified Indian creators by category, city and follower range, and reach out directly about collaborations.",
      },
      { property: "og:title", content: "Find an influencer for your brand — LuvLit" },
      {
        property: "og:description",
        content: "Verified Indian creators, filterable by category, city and reach.",
      },
    ],
  }),
  loader: async () => ({
    influencers: await getInfluencers({ data: {} }),
    categories: await getCategories(),
  }),
  component: FindInfluencer,
});

function FindInfluencer() {
  const initial = Route.useLoaderData() as { categories: CategoryRow[]; influencers: PublicInfluencer[] };
  const [filters, setFilters] = useState<{
    category?: string;
    city?: string;
    minFollowers?: number;
    ratesOnly?: boolean;
  }>({});
  const { data: influencers } = useQuery({
    queryKey: ["influencers", filters],
    queryFn: () => getInfluencers({ data: filters }),
    initialData: initial.influencers,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <p className="eyebrow">For brands</p>
        <h1 className="mt-4 text-4xl md:text-5xl">Find an influencer</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Every creator here has been reviewed and approved by our team.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <select
            className="rounded-md border border-border bg-card px-4 py-3 text-sm"
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
          >
            <option value="">All categories</option>
            {initial.categories.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="rounded-md border border-border bg-card px-4 py-3 text-sm"
            onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}
          >
            <option value="">All cities</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            className="rounded-md border border-border bg-card px-4 py-3 text-sm"
            onChange={(e) =>
              setFilters({ ...filters, minFollowers: Number(e.target.value) || undefined })
            }
          >
            <option value="">Any following</option>
            <option value="10000">10k+</option>
            <option value="50000">50k+</option>
            <option value="100000">100k+</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              onChange={(e) => setFilters({ ...filters, ratesOnly: e.target.checked || undefined })}
            />
            Rates listed
          </label>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(influencers ?? []).map((i) => (
            <article key={i.id} className="surface-card p-7">
              <h2 className="text-xl">{i.display_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">@{i.instagram_handle}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                {i.follower_count?.toLocaleString("en-IN")} followers
                {i.city ? ` · ${i.city}` : ""}
              </p>
              {i.is_verified && <p className="eyebrow mt-4">Verified stats</p>}
            </article>
          ))}
          {!influencers?.length && (
            <p className="text-muted-foreground">No approved creators match this yet.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
