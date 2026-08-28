import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getInfluencers, getCategories } from "@/lib/public.functions";
import { useCities } from "@/hooks/use-cities";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { supabase } from "@/integrations/supabase/client";
import type { PublicInfluencer } from "@/lib/public.types";

export const Route = createFileRoute("/_authenticated/dashboard/find-influencer")({
  head: () => ({
    meta: [
      { title: "Find an influencer for your brand — LuvLit" },
      {
        name: "description",
        content:
          "Browse reviewed Indian creators by category, city and follower range, and reach out directly about collaborations.",
      },
      { property: "og:title", content: "Find an influencer for your brand — LuvLit" },
      {
        property: "og:description",
        content: "Reviewed Indian creators, filterable by category, city and reach.",
      },
    ],
  }),
  component: FindInfluencer,
});

/** Inline "Request a collaboration" form for one influencer card. */
function CollaborationRequestForm({
  influencer,
  businessId,
  onClose,
}: {
  influencer: PublicInfluencer;
  businessId: string;
  onClose: () => void;
}) {
  const rateItems = Object.entries(influencer.rate_card ?? {});
  const [rateCardItem, setRateCardItem] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!brief.trim()) return setError("Describe what you're looking for.");
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from("collaboration_requests").insert({
      business_id: businessId,
      influencer_id: influencer.id,
      rate_card_item: rateCardItem || null,
      proposed_rate: proposedRate ? Number(proposedRate) : null,
      brief: brief.trim(),
    });
    setBusy(false);
    if (insertError) return setError(insertError.message);
    setSent(true);
  }

  if (sent) {
    return <p className="mt-4 text-sm text-muted-foreground">Request sent — you'll see their reply in your requests.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-border pt-4">
      {rateItems.length > 0 && (
        <select
          value={rateCardItem}
          onChange={(e) => setRateCardItem(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Which rate card item? (optional)</option>
          {rateItems.map(([key, value]) => (
            <option key={key} value={key}>
              {key}
              {typeof value === "number" ? ` — ₹${value}` : ""}
            </option>
          ))}
        </select>
      )}
      <input
        type="number"
        value={proposedRate}
        onChange={(e) => setProposedRate(e.target.value)}
        placeholder="Your proposed rate (₹, optional)"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <textarea
        required
        rows={3}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="What are you looking for?"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send request"}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border border-border px-5 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

function FindInfluencer() {
  const cities = useCities();
  const { data: business } = useDashboardBusiness();
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => getCategories() });
  const [filters, setFilters] = useState<{
    category?: string;
    city?: string;
    minFollowers?: number;
    ratesOnly?: boolean;
  }>({});
  const { data: influencers } = useQuery({
    queryKey: ["influencers", filters],
    queryFn: () => getInfluencers({ data: filters }),
  });

  const select = "rounded-md border border-border bg-card px-4 py-3 text-sm";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <p className="eyebrow">Business tools</p>
        <h1 className="mt-4 text-4xl md:text-5xl">Find an influencer</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Every creator here has been reviewed and approved by our team.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <select
            className={select}
            aria-label="Category"
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
          >
            <option value="">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className={select}
            aria-label="City"
            onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            className={select}
            aria-label="Minimum following"
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
              {i.rate_card && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Rates listed
                  {typeof i.rate_card.reel === "number" ? ` · Reel ₹${i.rate_card.reel}` : ""}
                </p>
              )}
              {i.is_verified && <p className="eyebrow mt-4">Verified stats</p>}
              {business?.id &&
                (openRequestId === i.id ? (
                  <CollaborationRequestForm
                    influencer={i}
                    businessId={business.id}
                    onClose={() => setOpenRequestId(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenRequestId(i.id)}
                    className="mt-5 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
                  >
                    Request a collaboration
                  </button>
                ))}
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
