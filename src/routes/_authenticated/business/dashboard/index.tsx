import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/business/dashboard/")({
  head: () => ({
    meta: [
      { title: "Overview — Business dashboard — LuvLit" },
      { name: "description", content: "A snapshot of leads, appointments, conversations and views for your business." },
      { property: "og:title", content: "Overview — Business dashboard — LuvLit" },
      { property: "og:description", content: "A snapshot of your business activity on LuvLit." },
    ],
  }),
  component: Overview,
});

function startOfWeekISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
}

function Overview() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-overview", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const todayDate = todayStart.toISOString().slice(0, 10);

      const [{ count: newLeads }, { data: staffRows }, { data: conversations }] = await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("matched_business_id", businessId!)
          .gte("created_at", startOfWeekISO()),
        supabase.from("staff").select("id").eq("business_id", businessId!),
        supabase
          .from("conversations")
          .select("id")
          .or(`party_a_id.eq.${businessId},party_b_id.eq.${businessId}`),
      ]);

      const staffIds = (staffRows ?? []).map((s) => s.id);
      let upcomingToday = 0;
      if (staffIds.length) {
        const { data: slots } = await supabase
          .from("slots")
          .select("id")
          .in("staff_id", staffIds)
          .eq("date", todayDate);
        const slotIds = (slots ?? []).map((s) => s.id);
        if (slotIds.length) {
          const { count } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .in("slot_id", slotIds)
            .neq("status", "cancelled");
          upcomingToday = count ?? 0;
        }
      }

      return {
        newLeads: newLeads ?? 0,
        upcomingToday,
        activeConversations: (conversations ?? []).length,
      };
    },
  });

  const cards = [
    { label: "New leads this week", value: stats?.newLeads ?? 0 },
    { label: "Today's appointments", value: stats?.upcomingToday ?? 0 },
    { label: "Active conversations", value: stats?.activeConversations ?? 0 },
    { label: "Profile views (all-time)", value: business?.view_count ?? 0 },
  ];

  return (
    <div>
      <p className="eyebrow">Overview</p>
      <h1 className="mt-2 text-2xl font-medium">Welcome back{business ? `, ${business.name}` : ""}</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-5">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-2 text-3xl font-medium">{c.value}</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        "Profile views" is a running total since your page went live, not just this month.
      </p>
    </div>
  );
}
