import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Props = {
  conversationId: string;
  senderType: "customer" | "business" | "influencer";
  senderId: string;
  title?: string;
  accent?: string;
};

/** Realtime chat, reused for customer↔business, business↔business and business↔influencer. */
export function ChatPanel({ conversationId, senderType, senderId, title, accent }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .then(({ data }) => {
        if (active) setMessages((data ?? []) as ChatMessage[]);
      });

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as ChatMessage).id)
              ? prev
              : [...prev, payload.new as ChatMessage],
          );
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim().slice(0, 2000);
    if (!content) return;
    setSending(true);
    setDraft("");
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: senderType,
      sender_id: senderId,
      content,
    });
    setSending(false);
  }

  return (
    <div className="flex h-full min-h-[24rem] flex-col rounded-lg border border-border bg-card">
      {title && (
        <div className="border-b border-border px-5 py-3">
          <p className="text-sm font-medium">{title}</p>
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet — say hello.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === senderId;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                  mine ? "text-primary-foreground" : "bg-secondary text-foreground"
                }`}
                style={mine ? { backgroundColor: accent || "hsl(var(--primary))" } : undefined}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="mt-1 text-[0.625rem] opacity-70">
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border px-4 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Write a message"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          disabled={sending || !draft.trim()}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
