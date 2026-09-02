import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { CardListSkeleton } from "@/components/ui/skeleton-shapes";
import { CITIES } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/business/dashboard/featured")({
  head: () => ({
    meta: [
      { title: "Featured Placement — Business dashboard — LuvLit" },
      { name: "description", content: "Boost your visibility with featured placement in your city or across India." },
      { property: "og:title", content: "Featured Placement — Business dashboard — LuvLit" },
      { property: "og:description", content: "Get featured on LuvLit for your category and location." },
    ],
  }),
  component: FeaturedPage,
});

const CAP = 5;

function FeaturedPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const qc = useQueryClient();

  const { data: categoryOptions } = useQuery({
    queryKey: ["dashboard-business-categories", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      (await supabase.from("businesses").select("categories").eq("id", businessId!).single()).data?.categories ?? [],
  });

  const [scope, setScope] = useState<"city" | "pan_india">("city");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [duration, setDuration] = useState<"monthly" | "yearly">("monthly");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: myPlacements, isLoading: placementsLoading } = useQuery({
    queryKey: ["dashboard-my-placements", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      (
        await supabase
          .from("featured_placements")
          .select("*")
          .eq("business_id", businessId!)
          .order("start_date", { ascending: false })
      ).data ?? [],
  });

  const monthlyPrice = scope === "city" ? 499 : 999;
  const price = duration === "monthly" ? monthlyPrice : monthlyPrice * 10;

  async function confirm() {
    if (!businessId || !category) {
      setMessage("Choose a category first.");
      return;
    }
    if (scope === "city" && !city) {
      setMessage("Choose a city first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from("featured_placements")
      .select("id", { count: "exact", head: true })
      .eq("category", category)
      .eq("scope", scope)
      .eq(scope === "city" ? "city" : "scope", scope === "city" ? city : "pan_india")
      .lte("start_date", today)
      .gte("end_date", today);

    if ((count ?? 0) >= CAP) {
      setBusy(false);
      setMessage("Featured slots full for this location — join the waitlist.");
      return;
    }

    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + (duration === "monthly" ? 1 : 12));

    const { error } = await supabase.from("featured_placements").insert({
      business_id: businessId,
      category,
      scope,
      city: scope === "city" ? city : null,
      plan_tier: duration,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(`Placement reserved. Billing (₹${price}) is activated separately from your account billing.`);
    qc.invalidateQueries({ queryKey: ["dashboard-my-placements", businessId] });
  }

  return (
    <div>
      <DashboardBackLink />
      <p className="eyebrow">Featured Placement</p>
      <h1 className="mt-2 text-2xl font-medium">Get featured</h1>

      <div className="dashboard-card mt-6 max-w-xl space-y-4 p-6">
        <div>
          <p className="text-xs text-muted-foreground">Category</p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Choose a category</option>
            {(categoryOptions ?? []).map((c: string) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Scope</p>
          <div className="mt-1 flex gap-3">
            <button
              onClick={() => setScope("city")}
              className={`rounded-md border px-4 py-2 text-sm ${scope === "city" ? "border-accent bg-accent-soft" : "border-border"}`}
            >
              Specific city — ₹499/mo
            </button>
            <button
              onClick={() => setScope("pan_india")}
              className={`rounded-md border px-4 py-2 text-sm ${scope === "pan_india" ? "border-accent bg-accent-soft" : "border-border"}`}
            >
              All India — ₹999/mo
            </button>
          </div>
        </div>

        {scope === "city" && (
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Choose a city</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}

        <div>
          <p className="text-xs text-muted-foreground">Duration</p>
          <div className="mt-1 flex gap-3">
            <button
              onClick={() => setDuration("monthly")}
              className={`rounded-md border px-4 py-2 text-sm ${duration === "monthly" ? "border-accent bg-accent-soft" : "border-border"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setDuration("yearly")}
              className={`rounded-md border px-4 py-2 text-sm ${duration === "yearly" ? "border-accent bg-accent-soft" : "border-border"}`}
            >
              Yearly (10 months' price)
            </button>
          </div>
        </div>

        <p className="text-sm font-medium">Total: ₹{price}</p>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <button
          onClick={confirm}
          disabled={busy}
          className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          Reserve placement
        </button>
        <p className="text-xs text-muted-foreground">
          Payment isn't wired up yet — reserving a slot here doesn't charge you. Billing is activated separately.
        </p>
      </div>

      <div className="mt-8">
        <p className="text-sm font-medium">Your placements</p>
        {placementsLoading && <CardListSkeleton rows={2} />}
        <div className="mt-3 space-y-2">
          {!placementsLoading && (myPlacements ?? []).length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {!placementsLoading && (myPlacements ?? []).map((p) => (
            <div key={p.id} className="dashboard-card flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <span>
                {p.category} · {p.scope === "city" ? p.city : "All India"} · {p.plan_tier}
              </span>
              <span className="text-muted-foreground">
                {p.start_date} → {p.end_date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
