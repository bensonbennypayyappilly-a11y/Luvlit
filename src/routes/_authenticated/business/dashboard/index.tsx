import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Eye,
  FileText,
  Handshake,
  Images,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { localDateString } from "@/lib/utils";
import type { Section, ServicesContent } from "@/lib/website-sections";

// Pure-white card surface for Overview only — the shared `surface-card` utility keeps its
// off-white/cream tint everywhere else in the app; this local class is deliberately scoped to
// this file so the rest of the dashboard is untouched.
const CARD = "rounded-xl border border-border bg-white";

type ChecklistItem = { key: string; label: string; done: boolean; href: string };

/**
 * A pure appointment/services business can describe what it offers entirely through the
 * website builder's "Services" section (freeform content living in a section's `content`,
 * see website-sections.ts) instead of ever adding a row to `items` (which is really for
 * sellable products). The completeness checklist should recognise either path.
 *
 * Only the *published* `sections` array is considered — not draft_sections — so this matches
 * what's actually live, same as the rest of this checklist (description/hero/gallery/contact
 * all read the live business row too). A section only counts if it's visible and has at least
 * one service with a real (non-blank) name — an empty list or a placeholder row a business
 * added but never filled in shouldn't read as "done".
 */
function hasVisibleServicesContent(sections: Section[] | null | undefined): boolean {
  if (!Array.isArray(sections)) return false;
  return sections.some((section) => {
    if (!section || section.type !== "services" || !section.visible) return false;
    const services = (section.content as ServicesContent | undefined)?.services;
    return Array.isArray(services) && services.some((svc) => typeof svc?.name === "string" && svc.name.trim().length > 0);
  });
}

const CHECKLIST_META: Record<string, { icon: LucideIcon; description: string }> = {
  description: { icon: FileText, description: "A clear description helps customers know what you offer." },
  hero: { icon: Images, description: "Businesses with a hero photo get more profile views." },
  gallery: { icon: Images, description: "Show your work — photos build trust with new customers." },
  contact: { icon: Phone, description: "Add a way to reach you so leads can get in touch." },
  location: { icon: MapPin, description: "Help customers find you or know where you deliver." },
  offering: { icon: Package, description: "List what you sell or offer so it shows on your page." },
};

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

function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function weekLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CHART_WEEKS = 8;

function Overview() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;

  // Fixed at render time — a plain date/time readout, not an interactive range picker.
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLabel = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-overview", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const todayDate = localDateString();
      const yesterdayDate = localDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

      // 8 weekly buckets (oldest -> newest), the newest being the current, still-in-progress week.
      const weekStarts = Array.from({ length: CHART_WEEKS }, (_, i) => {
        const start = startOfWeek(new Date());
        start.setDate(start.getDate() - (CHART_WEEKS - 1 - i) * 7);
        return start;
      });

      const [
        { count: uncontactedLeads },
        { data: leadRows },
        { data: staffRows },
        { data: conversations },
        { count: locationsCount },
        { count: deliveryAreasCount },
        { count: itemsCount },
      ] = await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("matched_business_id", businessId!)
          .eq("status", "new"),
        supabase
          .from("leads")
          .select("created_at")
          .eq("matched_business_id", businessId!)
          .gte("created_at", weekStarts[0].toISOString()),
        supabase.from("staff").select("id").eq("business_id", businessId!),
        supabase
          .from("conversations")
          .select("id")
          .or(`party_a_id.eq.${businessId},party_b_id.eq.${businessId}`),
        supabase.from("locations").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
        supabase.from("delivery_areas").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
        supabase.from("items").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
      ]);

      const weekCounts = weekStarts.map(() => 0);
      (leadRows ?? []).forEach((r) => {
        const created = new Date(r.created_at);
        for (let i = weekStarts.length - 1; i >= 0; i--) {
          if (created >= weekStarts[i]) {
            weekCounts[i]++;
            break;
          }
        }
      });
      const newLeads = weekCounts[CHART_WEEKS - 1];
      const previousWeekLeads = weekCounts[CHART_WEEKS - 2];
      const requirementsTrend = weekStarts.map((start, i) => ({ label: weekLabel(start), count: weekCounts[i] }));

      const staffIds = (staffRows ?? []).map((s) => s.id);
      let upcomingToday = 0;
      let upcomingYesterday = 0;
      if (staffIds.length) {
        const { data: slots } = await supabase
          .from("slots")
          .select("id,date")
          .in("staff_id", staffIds)
          .in("date", [todayDate, yesterdayDate]);
        const todaySlotIds = (slots ?? []).filter((s) => s.date === todayDate).map((s) => s.id);
        const yesterdaySlotIds = (slots ?? []).filter((s) => s.date === yesterdayDate).map((s) => s.id);
        const allSlotIds = [...todaySlotIds, ...yesterdaySlotIds];
        if (allSlotIds.length) {
          const { data: bookingRows } = await supabase
            .from("bookings")
            .select("id,slot_id")
            .in("slot_id", allSlotIds)
            .neq("status", "cancelled");
          const todaySet = new Set(todaySlotIds);
          (bookingRows ?? []).forEach((b) => {
            if (todaySet.has(b.slot_id)) upcomingToday++;
            else upcomingYesterday++;
          });
        }
      }

      const conversationIds = (conversations ?? []).map((c) => c.id);
      let unreadCount = 0;
      if (conversationIds.length) {
        const { data: unread } = await supabase
          .from("messages")
          .select("sender_id")
          .in("conversation_id", conversationIds)
          .is("read_at", null);
        unreadCount = (unread ?? []).filter((m) => m.sender_id !== businessId).length;
      }

      return {
        newLeads,
        previousWeekLeads,
        requirementsTrend,
        uncontactedLeads: uncontactedLeads ?? 0,
        upcomingToday,
        upcomingYesterday,
        activeConversations: conversationIds.length,
        unreadCount,
        hasLocation: (locationsCount ?? 0) > 0 || (deliveryAreasCount ?? 0) > 0,
        // Only the `items` half of this check — combined with the website-builder Services
        // section (read straight off `business.sections`, already fetched by
        // useDashboardBusiness) when building the checklist below.
        hasItemsOffering: (itemsCount ?? 0) > 0,
      };
    },
  });

  const checklist: ChecklistItem[] = business
    ? [
        { key: "description", label: "Add a business description", done: !!business.description, href: "/business/dashboard/profile" },
        { key: "hero", label: "Add a hero photo", done: !!business.hero_image_url, href: "/business/dashboard/website" },
        { key: "gallery", label: "Add photos to your gallery", done: (business.gallery_urls ?? []).length > 0, href: "/business/dashboard/website" },
        { key: "contact", label: "Add a way to contact you", done: !!(business.whatsapp || business.contact_email || business.instagram_url), href: "/business/dashboard/website" },
        { key: "location", label: "Add a location or delivery area", done: stats?.hasLocation ?? false, href: "/business/dashboard/website" },
        {
          key: "offering",
          label: "Add your products or services",
          done: (stats?.hasItemsOffering ?? false) || hasVisibleServicesContent(business.sections),
          href: "/business/dashboard/products",
        },
      ]
    : [];
  const completePct = checklist.length ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100) : 0;

  const attention = [
    stats?.uncontactedLeads
      ? {
          icon: Users,
          label: `${stats.uncontactedLeads} lead${stats.uncontactedLeads === 1 ? "" : "s"} awaiting a response`,
          description: "Quick replies win more business — most customers message more than one place.",
          href: "/business/dashboard/leads",
        }
      : null,
    stats?.unreadCount
      ? {
          icon: MessageSquare,
          label: `${stats.unreadCount} unread message${stats.unreadCount === 1 ? "" : "s"}`,
          description: "Catch up on conversations with customers and other businesses.",
          href: "/business/dashboard/leads",
        }
      : null,
    ...checklist
      .filter((c) => !c.done)
      .map((c) => ({ icon: CHECKLIST_META[c.key].icon, label: c.label, description: CHECKLIST_META[c.key].description, href: c.href })),
  ].filter((x): x is { icon: LucideIcon; label: string; description: string; href: string } => !!x);

  const cards: {
    label: string;
    value: number;
    icon: LucideIcon;
    badgeClassName: string;
    trend?: { current: number; previous: number; periodLabel: string };
    caption?: string;
  }[] = [
    {
      label: "New leads this week",
      value: stats?.newLeads ?? 0,
      icon: TrendingUp,
      badgeClassName: "bg-accent-soft text-accent",
      trend: { current: stats?.newLeads ?? 0, previous: stats?.previousWeekLeads ?? 0, periodLabel: "from last week" },
    },
    {
      label: "Today's appointments",
      value: stats?.upcomingToday ?? 0,
      icon: Calendar,
      badgeClassName: "bg-violet-50 text-violet-600",
      trend: { current: stats?.upcomingToday ?? 0, previous: stats?.upcomingYesterday ?? 0, periodLabel: "from yesterday" },
    },
    {
      label: "Active conversations",
      value: stats?.activeConversations ?? 0,
      icon: MessageSquare,
      badgeClassName: "bg-blue-50 text-blue-600",
      caption: stats?.unreadCount ? `${stats.unreadCount} unread` : "All caught up",
    },
    {
      label: "Profile views (all-time)",
      value: business?.view_count ?? 0,
      icon: Eye,
      badgeClassName: "bg-amber-50 text-amber-600",
      caption: "Since your page went live",
    },
  ];

  const chartConfig: ChartConfig = {
    count: { label: "Requirements received", color: "var(--chart-1)" },
  };
  const hasRequirementsData = (stats?.requirementsTrend ?? []).some((w) => w.count > 0);
  const firstIncomplete = checklist.find((c) => !c.done);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="mt-1.5 text-2xl font-medium tracking-tight">
            Welcome back{business ? `, ${business.name}` : ""} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {dateLabel} · {timeLabel}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${CARD} p-4 transition-shadow duration-150 hover:shadow-sm`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${c.badgeClassName}`}>
                  <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </span>
              </div>
              {isLoading ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <p className="mt-2 text-3xl font-medium tabular-nums">{c.value}</p>
              )}
              {c.trend ? <TrendCaption {...c.trend} /> : <p className="mt-2 text-xs text-muted-foreground">{c.caption}</p>}
            </div>
          );
        })}
      </div>

      <Link
        to="/post-requirement"
        className="group relative mt-6 flex flex-col gap-5 overflow-hidden rounded-lg border border-accent/25 bg-accent-soft p-5 transition-colors duration-150 hover:border-accent/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <Handshake
          className="pointer-events-none absolute -right-4 -top-4 size-28 text-accent/10"
          strokeWidth={1}
          aria-hidden="true"
        />
        <div className="relative flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Handshake className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Post a requirement</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Need a supplier, vendor or collaborator? Describe what you're looking for and get matched
              with other businesses on LuvLit who can help.
            </p>
          </div>
        </div>
        <span className="relative flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-transform duration-150 group-hover:translate-x-0.5 sm:self-auto">
          Post a requirement
          <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
        </span>
      </Link>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Profile completeness</p>
            <p className="text-sm font-medium text-muted-foreground tabular-nums">{completePct}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completePct}%` }} />
          </div>
          <ul className="mt-4 space-y-2">
            {checklist.map((c) => (
              <li key={c.key} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[0.625rem] ${
                    c.done ? "bg-accent text-accent-foreground" : "border border-border"
                  }`}
                >
                  {c.done ? "✓" : ""}
                </span>
                {c.done ? (
                  <span className="text-muted-foreground line-through">{c.label}</span>
                ) : (
                  <Link to={c.href} className="transition-colors hover:text-accent">
                    {c.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {firstIncomplete ? (
            <Link
              to={firstIncomplete.href}
              className="mt-4 inline-flex min-h-9 items-center rounded-md bg-accent-soft px-4 text-sm font-medium text-accent transition-colors hover:bg-accent-soft/70"
            >
              Complete your profile
            </Link>
          ) : (
            <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-accent">
              <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[0.625rem] text-accent-foreground">✓</span>
              Your profile is complete
            </p>
          )}
        </div>

        <div className={`${CARD} p-5`}>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Needs attention</p>
            {attention.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-destructive/10 text-[0.6875rem] font-semibold text-destructive">
                {attention.length}
              </span>
            )}
          </div>
          {attention.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {attention.slice(0, 4).map((a) => {
                const AttentionIcon = a.icon;
                return (
                  <li key={a.label}>
                    <Link
                      to={a.href}
                      className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-secondary"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                        <AttentionIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">{a.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.description}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className={`${CARD} mt-5 p-5`}>
        <p className="text-sm font-medium">Requirements received</p>
        <p className="text-xs text-muted-foreground">Last {CHART_WEEKS} weeks</p>
        {hasRequirementsData ? (
          <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-56 w-full">
            <AreaChart data={stats?.requirementsTrend ?? []} margin={{ left: -20, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="requirementsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} interval={0} />
              <YAxis tickLine={false} axisLine={false} width={32} fontSize={11} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="count"
                isAnimationActive={false}
                stroke="var(--color-count)"
                strokeWidth={2}
                fill="url(#requirementsFill)"
                dot={{ r: 3, stroke: "var(--color-count)", strokeWidth: 2, fill: "white" }}
                activeDot={{ r: 5, stroke: "var(--color-count)", strokeWidth: 2, fill: "white" }}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="mt-4 flex h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center">
            <TrendingUp className="size-6 text-muted-foreground/50" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No requirements received in the last {CHART_WEEKS} weeks yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TrendCaption({ current, previous, periodLabel }: { current: number; previous: number; periodLabel: string }) {
  if (previous === 0) {
    if (current === 0) {
      return <p className="mt-2 text-xs text-muted-foreground">No activity {periodLabel}</p>;
    }
    return (
      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-accent">
        <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
        New {periodLabel}
      </p>
    );
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${up ? "text-accent" : "text-destructive"}`}>
      <Icon className="size-3.5" strokeWidth={2} aria-hidden="true" />
      {up ? "+" : ""}
      {pct}% {periodLabel}
    </p>
  );
}
