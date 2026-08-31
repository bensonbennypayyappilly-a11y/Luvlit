import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/** Shared between the customer and business dashboards — every notification row is created
 * exclusively by a database trigger (see the notifications migration), never client-side, so
 * this component only ever reads and marks-read. In-app only: no email/SMS provider is
 * configured, so nothing here claims to have been delivered anywhere else. */
export function NotificationsList({
  recipientType,
  recipientId,
}: {
  recipientType: "customer" | "business";
  recipientId: string | null;
}) {
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", recipientType, recipientId],
    enabled: !!recipientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,link,read_at,created_at")
        .eq("recipient_type", recipientType)
        .eq("recipient_id", recipientId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as Notification[];
    },
  });

  async function markRead(n: Notification) {
    if (n.read_at) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    qc.invalidateQueries({ queryKey: ["notifications", recipientType, recipientId] });
    // Unread-count badges (business sidebar, customer dashboard card) live in separate
    // components with their own query keys — invalidate both by prefix so the badge updates
    // immediately instead of waiting for their own next natural refetch.
    qc.invalidateQueries({ queryKey: ["sidebar-unread-notifications"] });
    qc.invalidateQueries({ queryKey: ["customer-unread-notifications"] });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) {
    return (
      <div className="text-sm">
        <p className="text-destructive">Couldn't load this information. Try again.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-destructive underline underline-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!data?.length) return <p className="text-sm text-muted-foreground">No notifications yet.</p>;

  return (
    <div className="divide-y divide-border">
      {data.map((n) => {
        const row = (
          <div
            className={`flex min-h-11 items-start justify-between gap-3 px-1 py-4 text-sm ${
              n.read_at ? "" : "font-medium"
            }`}
          >
            <div className="min-w-0">
              <p>{n.title}</p>
              {n.body && <p className="mt-1 truncate font-normal text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-xs font-normal text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            {!n.read_at && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
          </div>
        );
        return n.link ? (
          <Link key={n.id} to={n.link} onClick={() => markRead(n)} className="block hover:bg-secondary">
            {row}
          </Link>
        ) : (
          <button key={n.id} type="button" onClick={() => markRead(n)} className="block w-full text-left hover:bg-secondary">
            {row}
          </button>
        );
      })}
    </div>
  );
}
