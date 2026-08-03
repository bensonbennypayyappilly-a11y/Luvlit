import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatPanel } from "@/components/chat-panel";
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

  const { data } = useQuery({
    queryKey: ["customer-conversations", userId],
    enabled: !!userId,
    queryFn: async () =>
      (
        await supabase
          .from("conversations")
          .select("id, party_a_id, party_a_type, party_b_id, party_b_type, created_at")
          .or(`party_a_id.eq.${userId},party_b_id.eq.${userId}`)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-20">
        <p className="eyebrow">Say hello</p>
        <h1 className="mt-4 text-4xl">Chats</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Conversations you've started with businesses about your requirements.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[16rem_1fr]">
          <div className="space-y-3">
            {(data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full rounded-md border px-4 py-3 text-left text-sm ${
                  activeId === c.id
                    ? "border-accent bg-accent-soft text-accent-foreground"
                    : "border-border hover:border-accent"
                }`}
              >
                Conversation {c.id.slice(0, 8)}
              </button>
            ))}
            {!data?.length && <p className="text-sm text-muted-foreground">No chats yet.</p>}
          </div>
          <div>
            {activeId ? (
              <ChatPanel conversationId={activeId} senderType="customer" senderId={userId!} title="Chat" />
            ) : (
              <p className="text-muted-foreground">Pick a conversation to open it.</p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
