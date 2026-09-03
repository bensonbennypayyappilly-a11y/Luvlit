import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { ChatPanel } from "@/components/chat-panel";
import { isStoragePath, useMediaUrl } from "@/components/media-uploader";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { CardListSkeleton } from "@/components/ui/skeleton-shapes";

export const Route = createFileRoute("/_authenticated/business/dashboard/leads")({
  head: () => ({
    meta: [
      { title: "Leads & Chats — Business dashboard — LuvLit" },
      { name: "description", content: "Your unified inbox of leads and conversations from LuvLit customers and businesses." },
      { property: "og:title", content: "Leads & Chats — Business dashboard — LuvLit" },
      { property: "og:description", content: "Manage leads and conversations in one place." },
    ],
  }),
  component: LeadsPage,
});

type MatchReason = { code: string; detail: string };
type MatchTier = "excellent" | "strong" | "relevant" | null;

type InboxRow = {
  id: string;
  conversationId: string | null;
  title: string;
  subtitle: string;
  unread: boolean;
  imageUrls?: string[] | null;
  leadStatus?: string | null;
  matchScore?: number | null;
  matchReasons?: MatchReason[];
};

function scoreTier(score: number | null | undefined): MatchTier {
  if (score == null) return null;
  if (score >= 85) return "excellent";
  if (score >= 70) return "strong";
  if (score >= 60) return "relevant";
  return null;
}

const TIER_LABEL: Record<Exclude<MatchTier, null>, string> = {
  excellent: "Excellent matches",
  strong: "Strong matches",
  relevant: "Relevant matches",
};

function MatchTierBadge({ score }: { score: number | null | undefined }) {
  const tier = scoreTier(score);
  if (!tier) return null;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-medium ${
        tier === "excellent"
          ? "bg-primary text-primary-foreground"
          : tier === "strong"
            ? "bg-accent-soft text-accent"
            : "bg-secondary text-muted-foreground"
      }`}
    >
      {tier === "excellent" ? "Excellent" : tier === "strong" ? "Strong" : "Relevant"}
    </span>
  );
}

// Translates the stored reason codes into copy — wording can change here without touching any
// persisted data, since only the code/detail pair is ever written to the database.
const REASON_LABEL: Record<string, (detail: string) => string> = {
  category_match: (d) => d,
  speciality_match: (d) => `${d} speciality`,
  service_match: (d) => d,
  intent_match: (d) => d.replace(/_/g, " "),
  location_match: (d) => `Serves ${d}`,
  delivery_match: (d) => d,
};

function MatchReasonsList({ reasons }: { reasons: MatchReason[] | null | undefined }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">Matched because</p>
      <ul className="mt-1 space-y-0.5">
        {reasons.map((r, i) => (
          <li key={i} className="flex items-center gap-1.5 text-xs text-foreground">
            <span className="text-primary">✓</span>
            {(REASON_LABEL[r.code] ?? ((d: string) => d))(r.detail)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeadStatusPill({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const label = status === "closed" ? "Closed" : status === "quoted" ? "Quoted" : "New";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-medium ${
        status === "closed"
          ? "bg-secondary text-muted-foreground"
          : status === "quoted"
            ? "bg-accent-soft text-accent"
            : "bg-primary/10 text-primary"
      }`}
    >
      {label}
    </span>
  );
}

function LeadThumbs({ imageUrls }: { imageUrls: string[] | null | undefined }) {
  if (!imageUrls || imageUrls.length === 0) return null;
  return (
    <div className="mt-1 flex gap-1">
      {imageUrls.slice(0, 3).map((path, i) => (
        <LeadThumb key={i} path={path} />
      ))}
    </div>
  );
}

function LeadThumb({ path }: { path: string }) {
  const resolved = useMediaUrl(path, "requirement-media");
  const url = isStoragePath(path) ? resolved : path;
  if (!url) return null;
  return <img src={url} alt="" className="h-8 w-8 rounded object-cover" />;
}

function LeadsPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const qc = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const {
    data: leads,
    error: leadsError,
    isLoading: leadsLoading,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ["dashboard-leads", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id,status,created_at,requirement_id,match_score,match_reasons,requirements(id,description,category,city,image_urls)")
        .eq("matched_business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const {
    data: conversations,
    error: conversationsError,
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["dashboard-conversations", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id,party_a_id,party_a_type,party_b_id,party_b_type,requirement_id,created_at")
        .or(`party_a_id.eq.${businessId},party_b_id.eq.${businessId}`)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      if (!rows.length) return [];

      // Who's on the other end: a customer for a requirement-sourced lead, or another
      // business/an influencer for a direct chat. profiles (customer names) can't be read
      // client-side by anyone but the profile's own owner, so this is resolved server-side.
      const { data: names, error: namesError } = await supabase.rpc("get_conversation_partner_names", {
        _conversation_ids: rows.map((c) => c.id),
      });
      if (namesError) throw new Error(namesError.message);
      const nameById = new Map((names ?? []).map((n) => [n.conversation_id, n.partner_name]));
      return rows.map((c) => ({ ...c, partnerName: nameById.get(c.id) ?? null }));
    },
  });

  const conversationIds = useMemo(() => (conversations ?? []).map((c) => c.id), [conversations]);

  const { data: unreadMap } = useQuery({
    queryKey: ["dashboard-unread", businessId, conversationIds.join(",")],
    enabled: !!businessId && conversationIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("conversation_id,sender_id,read_at")
        .in("conversation_id", conversationIds)
        .is("read_at", null);
      const map = new Set<string>();
      for (const m of data ?? []) {
        if (m.sender_id !== businessId) map.add(m.conversation_id);
      }
      return map;
    },
  });

  // leads always arrive with their conversation already created (submit_requirement_with_matches
  // creates both together), so this is the only place the requirement's own category/description
  // actually lives — without it, a requirement-sourced conversation would show nothing but the
  // customer's name, and the business would have no idea what was being asked for.
  type RequirementInfo = { category: string | null; description: string | null; image_urls: string[] | null };
  const requirementByReqId = useMemo(() => {
    const map = new Map<string, RequirementInfo>();
    for (const l of leads ?? []) {
      const req = (l as any).requirements as RequirementInfo | null;
      if (l.requirement_id && req) map.set(l.requirement_id, req);
    }
    return map;
  }, [leads]);

  // new -> quoted happens automatically (a DB trigger flips it the instant this business sends
  // its first message) -> closed cascades automatically when the poster marks their requirement
  // fulfilled — nothing here writes lead status directly, it's read-only state.
  const leadStatusByReqId = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads ?? []) {
      if (l.requirement_id) map.set(l.requirement_id, l.status);
    }
    return map;
  }, [leads]);

  // Score/reasons are written once by the matching engine at lead-creation time — read here,
  // never recomputed client-side.
  const matchInfoByReqId = useMemo(() => {
    const map = new Map<string, { score: number | null; reasons: MatchReason[] }>();
    for (const l of leads ?? []) {
      if (l.requirement_id) {
        map.set(l.requirement_id, {
          score: (l as any).match_score ?? null,
          reasons: ((l as any).match_reasons as MatchReason[] | null) ?? [],
        });
      }
    }
    return map;
  }, [leads]);

  const rows: InboxRow[] = useMemo(() => {
    const conv = (conversations ?? []).map((c) => {
      const req = c.requirement_id ? requirementByReqId.get(c.requirement_id) : undefined;
      const matchInfo = c.requirement_id ? matchInfoByReqId.get(c.requirement_id) : undefined;
      return {
        id: c.id,
        conversationId: c.id,
        title: c.partnerName ?? (c.requirement_id ? "Requirement conversation" : "Direct conversation"),
        subtitle: req
          ? [req.category, req.description].filter(Boolean).join(" — ") || new Date(c.created_at).toLocaleDateString()
          : new Date(c.created_at).toLocaleDateString(),
        unread: unreadMap?.has(c.id) ?? false,
        imageUrls: req?.image_urls ?? null,
        leadStatus: c.requirement_id ? (leadStatusByReqId.get(c.requirement_id) ?? null) : null,
        matchScore: matchInfo?.score ?? null,
        matchReasons: matchInfo?.reasons ?? [],
      };
    });
    // Kept as a fallback for the (currently unreachable in practice) case of a lead whose
    // conversation hasn't been created yet, so a lead is never silently dropped from the inbox.
    const leadRows = (leads ?? [])
      .filter((l) => !conversations?.some((c) => c.requirement_id === l.requirement_id))
      .map((l) => ({
        id: `lead-${l.id}`,
        conversationId: null,
        title: (l as any).requirements?.category ?? "Lead",
        subtitle: (l as any).requirements?.description ?? l.status,
        unread: false,
        imageUrls: (l as any).requirements?.image_urls ?? null,
        leadStatus: l.status,
        matchScore: (l as any).match_score ?? null,
        matchReasons: ((l as any).match_reasons as MatchReason[] | null) ?? [],
      }));
    return [...conv, ...leadRows];
  }, [leads, conversations, unreadMap, requirementByReqId, leadStatusByReqId, matchInfoByReqId]);

  const activeConversation = useMemo(
    () => conversations?.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId],
  );
  const activeRequirement = activeConversation?.requirement_id
    ? requirementByReqId.get(activeConversation.requirement_id)
    : undefined;
  const activeLeadStatus = activeConversation?.requirement_id
    ? (leadStatusByReqId.get(activeConversation.requirement_id) ?? null)
    : null;
  const activeMatchInfo = activeConversation?.requirement_id
    ? matchInfoByReqId.get(activeConversation.requirement_id)
    : undefined;

  // Grouped by match quality — no "Possible" tier exists; anything under 60 was never inserted
  // as a lead in the first place, so every row here already cleared that floor. Rows with no
  // score (direct business-to-business/influencer chats, not requirement-sourced) sit in their
  // own ungrouped section at the end.
  const groupedRows = useMemo(() => {
    const groups: Record<"excellent" | "strong" | "relevant" | "other", InboxRow[]> = {
      excellent: [], strong: [], relevant: [], other: [],
    };
    for (const row of rows) {
      const tier = scoreTier(row.matchScore);
      groups[tier ?? "other"].push(row);
    }
    return groups;
  }, [rows]);

  async function openConversation(conversationId: string | null) {
    setActiveConversationId(conversationId);
    if (!conversationId || !businessId) return;
    const { error } = await supabase.rpc("mark_conversation_read", { _conversation_id: conversationId });
    if (error) return;
    qc.invalidateQueries({ queryKey: ["dashboard-unread"] });
  }

  return (
    <div>
      <DashboardBackLink />
      <p className="eyebrow">Leads & Chats</p>
      <h1 className="mt-2 text-2xl font-medium">Inbox</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="dashboard-card divide-y divide-border p-0">
          {(leadsError || conversationsError) && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-sm text-destructive">Couldn't load this information. Try again.</p>
              <button
                type="button"
                onClick={() => {
                  if (leadsError) refetchLeads();
                  if (conversationsError) refetchConversations();
                }}
                className="min-h-11 rounded-md border border-destructive px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                Try again
              </button>
            </div>
          )}
          {(leadsLoading || conversationsLoading) && <CardListSkeleton rows={4} />}
          {!leadsLoading && !conversationsLoading && !leadsError && !conversationsError && rows.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">No leads or conversations yet.</p>
          )}
          {!leadsLoading && !conversationsLoading && !leadsError && !conversationsError &&
            (["excellent", "strong", "relevant", "other"] as const).map((tier) => {
              const tierRows = groupedRows[tier];
              if (tierRows.length === 0) return null;
              return (
                <div key={tier}>
                  {tier !== "other" && (
                    <p className="bg-secondary/40 px-5 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {TIER_LABEL[tier]}
                    </p>
                  )}
                  {tierRows.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => row.conversationId && openConversation(row.conversationId)}
                      disabled={!row.conversationId}
                      className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm disabled:cursor-default ${
                        activeConversationId === row.conversationId ? "bg-accent-soft" : "hover:bg-secondary"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{row.title}</p>
                          <LeadStatusPill status={row.leadStatus} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
                        <LeadThumbs imageUrls={row.imageUrls} />
                      </div>
                      {row.unread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              );
            })}
        </div>

        <div>
          {activeConversationId && businessId ? (
            <div className="flex h-full flex-col gap-3">
              {activeRequirement && (
                <div className="dashboard-card space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <p className="eyebrow">{activeRequirement.category ?? "Requirement"}</p>
                    <MatchTierBadge score={activeMatchInfo?.score} />
                    <LeadStatusPill status={activeLeadStatus} />
                  </div>
                  {activeRequirement.description && (
                    <p className="text-sm text-foreground">{activeRequirement.description}</p>
                  )}
                  <LeadThumbs imageUrls={activeRequirement.image_urls} />
                  <MatchReasonsList reasons={activeMatchInfo?.reasons} />
                </div>
              )}
              <ChatPanel
                conversationId={activeConversationId}
                senderType="business"
                senderId={businessId}
                title={rows.find((r) => r.conversationId === activeConversationId)?.title ?? "Conversation"}
              />
            </div>
          ) : (
            <div className="dashboard-card flex min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
              Select a conversation to chat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
