import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChatPanel } from "@/components/chat-panel";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { useAccount } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/dashboard/chats")({
  head: () => ({
    meta: [
      { title: "Chats — LuvLit" },
      {
        name: "description",
        content: "Your conversations with businesses on LuvLit.",
      },
      { property: "og:title", content: "Chats — LuvLit" },
      { property: "og:description", content: "All your LuvLit conversations in one place." },
    ],
  }),
  component: Chats,
});

function Chats() {
  const { userId } = useAccount();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, error, refetch } = useQuery({
    queryKey: ["customer-conversations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, party_a_id, party_a_type, party_b_id, party_b_type, created_at, requirements(category)")
        .or(`party_a_id.eq.${userId},party_b_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      if (!rows.length) return [];

      // Resolve the other party's display name server-side — conversations.party_*_id is
      // polymorphic (customer/business/influencer, no single FK to embed), and a customer
      // reading a business's name works fine client-side, but the reverse case elsewhere
      // (a business resolving a customer's name) can't: public.profiles only allows reading
      // your own row. This RPC handles all three party types consistently in one call.
      const { data: names, error: namesError } = await supabase.rpc("get_conversation_partner_names", {
        _conversation_ids: rows.map((c) => c.id),
      });
      if (namesError) throw new Error(namesError.message);
      const nameById = new Map((names ?? []).map((n) => [n.conversation_id, n.partner_name]));
      return rows.map((c) => ({ ...c, partnerName: nameById.get(c.id) ?? null }));
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <DashboardBackLink to="/dashboard" />
      <p className="eyebrow">Say hello</p>
        <h1 className="mt-4 text-4xl">Chats</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Conversations you've started with businesses about your requirements.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[16rem_1fr]">
          <div className="space-y-3">
            {error ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">Couldn't load this information. Try again.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="min-h-11 rounded-md border border-destructive px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {(data ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`w-full rounded-md border px-4 py-3 text-left text-sm ${
                      activeId === c.id
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border hover:border-accent"
                    }`}
                  >
                    <p className="truncate font-medium">{c.partnerName ?? "Conversation"}</p>
                    {(c as any).requirements?.category && (
                      <p className="truncate text-xs opacity-70">{(c as any).requirements.category}</p>
                    )}
                  </button>
                ))}
                {!data?.length && <p className="text-sm text-muted-foreground">No chats yet.</p>}
              </>
            )}
          </div>
          <div>
            {activeId ? (
              <ChatPanel
                conversationId={activeId}
                senderType="customer"
                senderId={userId!}
                title={data?.find((c) => c.id === activeId)?.partnerName ?? "Chat"}
              />
            ) : (
              <p className="text-muted-foreground">Pick a conversation to open it.</p>
            )}
          </div>
        </div>
    </div>
  );
}
