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

type InboxRow = {
  id: string;
  conversationId: string | null;
  title: string;
  subtitle: string;
  unread: boolean;
  imageUrls?: string[] | null;
};

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
        .select("id,status,created_at,requirement_id,requirements(id,description,category,city,image_urls)")
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

  const rows: InboxRow[] = useMemo(() => {
    const conv = (conversations ?? []).map((c) => ({
      id: c.id,
      conversationId: c.id,
      title: c.partnerName ?? (c.requirement_id ? "Requirement conversation" : "Direct conversation"),
      subtitle: new Date(c.created_at).toLocaleDateString(),
      unread: unreadMap?.has(c.id) ?? false,
    }));
    const leadRows = (leads ?? [])
      .filter((l) => !conversations?.some((c) => c.requirement_id === l.requirement_id))
      .map((l) => ({
        id: `lead-${l.id}`,
        conversationId: null,
        title: (l as any).requirements?.category ?? "Lead",
        subtitle: (l as any).requirements?.description ?? l.status,
        unread: false,
        imageUrls: (l as any).requirements?.image_urls ?? null,
      }));
    return [...conv, ...leadRows];
  }, [leads, conversations, unreadMap]);

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
        <div className="surface-card divide-y divide-border p-0">
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
          {!leadsLoading && !conversationsLoading && !leadsError && !conversationsError && rows.map((row) => (
            <button
              key={row.id}
              onClick={() => row.conversationId && openConversation(row.conversationId)}
              disabled={!row.conversationId}
              className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm disabled:cursor-default ${
                activeConversationId === row.conversationId ? "bg-accent-soft" : "hover:bg-secondary"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
                <LeadThumbs imageUrls={row.imageUrls} />
              </div>
              {row.unread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
            </button>
          ))}
        </div>

        <div>
          {activeConversationId && businessId ? (
            <ChatPanel
              conversationId={activeConversationId}
              senderType="business"
              senderId={businessId}
              title={rows.find((r) => r.conversationId === activeConversationId)?.title ?? "Conversation"}
            />
          ) : (
            <div className="surface-card flex min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
              Select a conversation to chat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
