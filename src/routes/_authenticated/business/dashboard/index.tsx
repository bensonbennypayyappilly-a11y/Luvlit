import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Calendar, Eye, Handshake, MessageSquare, TrendingUp, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { Skeleton } from "@/components/ui/skeleton";
import { localDateString } from "@/lib/utils";
import type { Section, ServicesContent } from "@/lib/website-sections";

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
      const todayDate = localDateString();

      const [
        { count: newLeads },
        { count: uncontactedLeads },
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
          .gte("created_at", startOfWeekISO()),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("matched_business_id", businessId!)
          .eq("status", "new"),
        supabase.from("staff").select("id").eq("business_id", businessId!),
        supabase
          .from("conversations")
          .select("id")
          .or(`party_a_id.eq.${businessId},party_b_id.eq.${businessId}`),
        supabase.from("locations").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
        supabase.from("delivery_areas").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
        supabase.from("items").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
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
        newLeads: newLeads ?? 0,
        uncontactedLeads: uncontactedLeads ?? 0,
        upcomingToday,
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
      ? { label: `${stats.uncontactedLeads} lead${stats.uncontactedLeads === 1 ? "" : "s"} awaiting a response`, href: "/business/dashboard/leads" }
      : null,
    stats?.unreadCount
      ? { label: `${stats.unreadCount} unread message${stats.unreadCount === 1 ? "" : "s"}`, href: "/business/dashboard/leads" }
      : null,
    ...checklist.filter((c) => !c.done).map((c) => ({ label: c.label, href: c.href })),
  ].filter((x): x is { label: string; href: string } => !!x);

  const cards: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "New leads this week", value: stats?.newLeads ?? 0, icon: TrendingUp },
    { label: "Today's appointments", value: stats?.upcomingToday ?? 0, icon: Calendar },
    { label: "Active conversations", value: stats?.activeConversations ?? 0, icon: MessageSquare },
    { label: "Profile views (all-time)", value: business?.view_count ?? 0, icon: Eye },
  ];

  return (
    <div>
      <p className="eyebrow">Overview</p>
      <h1 className="mt-2 text-[1.75rem] font-medium tracking-tight">
        Welcome back{business ? `, ${business.name}` : ""}
      </h1>

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="surface-card p-5 transition-shadow duration-150 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </span>
              </div>
              {isLoading ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <p className="mt-3 text-3xl font-medium tabular-nums">{c.value}</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        "Profile views" is a running total since your page went live, not just this month.
      </p>

      <Link
        to="/post-requirement"
        className="group mt-8 flex flex-col gap-5 rounded-lg border border-accent/25 bg-accent-soft p-6 transition-colors duration-150 hover:border-accent/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-4">
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
        <span className="flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-transform duration-150 group-hover:translate-x-0.5 sm:self-auto">
          Get started
          <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
        </span>
      </Link>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Profile completeness</p>
            <p className="text-sm font-medium text-muted-foreground tabular-nums">{completePct}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completePct}%` }} />
          </div>
          <ul className="mt-5 space-y-2.5">
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
        </div>

        <div className="surface-card p-6">
          <p className="text-sm font-medium">Needs attention</p>
          {attention.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {attention.map((a) => (
                <li key={a.label}>
                  <Link
                    to={a.href}
                    className="flex min-h-11 items-center justify-between rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {a.label}
                    <span aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
