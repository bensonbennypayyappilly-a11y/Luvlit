import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { PLANS, FREE_UNTIL_DATE } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/business/dashboard/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Business dashboard — LuvLit" },
      { name: "description", content: "See your current LuvLit plan, status and pricing structure." },
      { property: "og:title", content: "Billing — Business dashboard — LuvLit" },
      { property: "og:description", content: "Your LuvLit subscription and billing summary." },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["dashboard-subscription", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      (
        await supabase
          .from("subscriptions")
          .select("*")
          .eq("business_id", businessId!)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data,
  });

  const isFreePeriod = Date.now() <= FREE_UNTIL_DATE.getTime();

  return (
    <div>
      <p className="eyebrow">Billing</p>
      <h1 className="mt-2 text-2xl font-medium">Plan & billing</h1>

      <div className="surface-card mt-6 max-w-xl p-6 text-sm">
        <p className="text-xs text-muted-foreground">Current status</p>
        {isLoading ? (
          <p className="mt-1">Loading…</p>
        ) : subscription ? (
          <p className="mt-1 capitalize">
            {subscription.plan} · {subscription.status}
            {subscription.is_intro_month ? " · intro month" : ""}
          </p>
        ) : (
          <p className="mt-1">No subscription record yet — you're on the free period.</p>
        )}

        <div className="mt-5 space-y-2 border-t border-border pt-5 text-muted-foreground">
          <p>Every business is free to use until <strong className="text-foreground">30 November</strong>.</p>
          <p>
            Subscriptions starting after that are <strong className="text-foreground">₹{PLANS.base.introPrice} for the first month</strong>, then{" "}
            <strong className="text-foreground">₹{PLANS.base.price}/month</strong>.
          </p>
          <p>Yearly billing gives you <strong className="text-foreground">2 months free</strong>.</p>
          {isFreePeriod ? (
            <p className="text-accent-foreground">You're currently in the free period.</p>
          ) : (
            <p>The free period has ended — standard pricing applies to new subscriptions.</p>
          )}
        </div>

        <div className="mt-5 rounded-md bg-secondary p-4 text-xs text-muted-foreground">
          Manage billing isn't wired up yet — this is a read-only summary for now.
        </div>
      </div>
    </div>
  );
}
