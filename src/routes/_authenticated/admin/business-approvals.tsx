import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PaginationBar } from "@/components/pagination-bar";

const LIVE_PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/admin/business-approvals")({
  head: () => ({
    meta: [
      { title: "Business moderation — LuvLit admin" },
      { name: "description", content: "Suspend or reinstate business listings." },
      { property: "og:title", content: "Business moderation — LuvLit admin" },
      { property: "og:description", content: "Moderate live business listings." },
    ],
  }),
  component: BusinessApprovals,
});

function BusinessApprovals() {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [livePage, setLivePage] = useState(1);

  const { data: liveResult, error: liveError } = useQuery({
    queryKey: ["admin-live-businesses", livePage],
    queryFn: async () => {
      const from = (livePage - 1) * LIVE_PAGE_SIZE;
      const to = from + LIVE_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("businesses")
        .select("id,name,categories", { count: "exact" })
        .eq("status", "live")
        .order("name")
        .range(from, to);
      if (error) throw new Error(error.message);
      return { rows: data ?? [], total: count ?? 0 };
    },
  });
  const live = liveResult?.rows ?? [];

  const { data: suspended, error: suspendedError } = useQuery({
    queryKey: ["admin-suspended-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id,name,categories")
        .eq("status", "suspended")
        .order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: string) {
    setActionError(null);
    const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
    if (error) return setActionError(error.message);
    // Any status change can shift which businesses fall on which page of the live list —
    // reset to page 1 so we never strand the admin on a now out-of-range page.
    setLivePage(1);
    qc.invalidateQueries({ queryKey: ["admin-live-businesses"] });
    qc.invalidateQueries({ queryKey: ["admin-suspended-businesses"] });
  }

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-4 text-4xl">Business moderation</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Businesses publish their own page — there's no approval step. Use this page to suspend a
        live business, or reinstate one you've suspended.
      </p>
      {actionError && <p className="mt-4 text-sm text-destructive">{actionError}</p>}

      <section className="mt-12">
        <h2 className="text-xl font-medium">Live businesses</h2>
        {liveError && (
          <p className="mt-3 text-sm text-destructive">Couldn't load live businesses — try refreshing.</p>
        )}
        <div className="mt-4 space-y-2">
          {(live ?? []).map((b) => (
            <div key={b.id} className="surface-card flex items-center justify-between p-4">
              <span>{b.name}</span>
              <button
                onClick={() => setStatus(b.id, "suspended")}
                className="min-h-11 rounded-md border border-border px-4 text-sm hover:border-destructive hover:text-destructive"
              >
                Suspend
              </button>
            </div>
          ))}
          {!liveError && !live?.length && <p className="text-muted-foreground">No live businesses yet.</p>}
        </div>
        <PaginationBar
          page={livePage}
          pageSize={LIVE_PAGE_SIZE}
          total={liveResult?.total ?? 0}
          onPageChange={setLivePage}
        />
      </section>

      <section className="mt-14">
        <h2 className="hairline pt-10 text-xl font-medium">Suspended</h2>
        {suspendedError && (
          <p className="mt-3 text-sm text-destructive">Couldn't load suspended businesses — try refreshing.</p>
        )}
        <div className="mt-4 space-y-2">
          {(suspended ?? []).map((b) => (
            <div key={b.id} className="surface-card flex items-center justify-between p-4">
              <span>{b.name}</span>
              <button
                onClick={() => setStatus(b.id, "live")}
                className="min-h-11 rounded-md border border-accent px-4 text-sm text-accent hover:bg-accent-soft"
              >
                Reinstate
              </button>
            </div>
          ))}
          {!suspendedError && !suspended?.length && <p className="text-muted-foreground">No suspended businesses.</p>}
        </div>
      </section>
    </div>
  );
}
