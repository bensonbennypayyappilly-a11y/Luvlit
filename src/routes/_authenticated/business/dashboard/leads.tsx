import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { ChatPanel } from "@/components/chat-panel";

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
};

function LeadsPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const qc = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const { data: leads } = useQuery({
    queryKey: ["dashboard-leads", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      (
        await supabase
          .from("leads")
          .select("id,status,created_at,requirement_id,requirements(id,description,category,city)")
          .eq("matched_business_id", businessId!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const { data: conversations } = useQuery({
    queryKey: ["dashboard-conversations", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      (
        await supabase
          .from("conversations")
          .select("id,party_a_id,party_a_type,party_b_id,party_b_type,requirement_id,created_at")
          .or(`party_a_id.eq.${businessId},party_b_id.eq.${businessId}`)
          .order("created_at", { ascending: false })
      ).data ?? [],
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
      title: c.requirement_id ? "Requirement conversation" : "Direct conversation",
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
      }));
    return [...conv, ...leadRows];
  }, [leads, conversations, unreadMap]);

  async function openConversation(conversationId: string | null) {
    setActiveConversationId(conversationId);
    if (!conversationId || !businessId) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .is("read_at", null)
      .neq("sender_id", businessId);
    qc.invalidateQueries({ queryKey: ["dashboard-unread"] });
  }

  return (
    <div>
      <p className="eyebrow">Leads & Chats</p>
      <h1 className="mt-2 text-2xl font-medium">Inbox</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="surface-card divide-y divide-border p-0">
          {rows.length === 0 && <p className="p-5 text-sm text-muted-foreground">No leads or conversations yet.</p>}
          {rows.map((row) => (
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
              title="Conversation"
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
