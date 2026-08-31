import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PaginationBar } from "@/components/pagination-bar";

const LIVE_PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/admin/business-approvals")({
  head: () => ({
    meta: [
      { title: "Business approvals — LuvLit admin" },
      { name: "description", content: "Approve, reject or suspend business listings." },
      { property: "og:title", content: "Business approvals — LuvLit admin" },
      { property: "og:description", content: "Review pending business submissions." },
    ],
  }),
  component: BusinessApprovals,
});

function BusinessApprovals() {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [livePage, setLivePage] = useState(1);

  const { data: pending, error: pendingError } = useQuery({
    queryKey: ["admin-pending-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id,name,description,categories,created_at")
        .eq("status", "pending")
        .order("created_at");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

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

  const { data: rejected, error: rejectedError } = useQuery({
    queryKey: ["admin-rejected-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id,name,description,categories,created_at")
        .eq("status", "rejected")
        .order("created_at");
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
    qc.invalidateQueries({ queryKey: ["admin-pending-businesses"] });
    qc.invalidateQueries({ queryKey: ["admin-live-businesses"] });
    qc.invalidateQueries({ queryKey: ["admin-suspended-businesses"] });
    qc.invalidateQueries({ queryKey: ["admin-rejected-businesses"] });
  }

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-4 text-4xl">Business approvals</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        New businesses need approval before they can publish. Approving clears them to publish
        their own page — it doesn't make them live by itself.
      </p>
      {actionError && <p className="mt-4 text-sm text-destructive">{actionError}</p>}

      <section className="mt-12">
        <h2 className="text-xl font-medium">Pending review</h2>
        {pendingError && (
          <p className="mt-3 text-sm text-destructive">Couldn't load pending businesses — try refreshing.</p>
        )}
        <div className="mt-4 space-y-4">
          {(pending ?? []).map((b) => (
            <div key={b.id} className="surface-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-medium">{b.name}</p>
                  {!!b.categories?.length && (
                    <p className="mt-1 text-sm text-muted-foreground">{b.categories.join(", ")}</p>
                  )}
                  {b.description && <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStatus(b.id, "approved")}
                    className="min-h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setStatus(b.id, "rejected")}
                    className="min-h-11 rounded-md border border-destructive px-5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!pendingError && !pending?.length && (
            <p className="text-muted-foreground">No businesses awaiting review.</p>
          )}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="hairline pt-10 text-xl font-medium">Live businesses</h2>
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

      <section className="mt-14">
        <h2 className="hairline pt-10 text-xl font-medium">Rejected</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Not visible to anyone but you. Reconsider to clear a business for approval again, or leave it as is.
        </p>
        {rejectedError && (
          <p className="mt-3 text-sm text-destructive">Couldn't load rejected businesses — try refreshing.</p>
        )}
        <div className="mt-4 space-y-4">
          {(rejected ?? []).map((b) => (
            <div key={b.id} className="surface-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-medium">{b.name}</p>
                  {!!b.categories?.length && (
                    <p className="mt-1 text-sm text-muted-foreground">{b.categories.join(", ")}</p>
                  )}
                  {b.description && <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStatus(b.id, "approved")}
                    className="min-h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
                  >
                    Reconsider
                  </button>
                  <button
                    onClick={() => setStatus(b.id, "rejected")}
                    className="min-h-11 rounded-md border border-destructive px-5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!rejectedError && !rejected?.length && (
            <p className="text-muted-foreground">No rejected businesses.</p>
          )}
        </div>
      </section>
    </div>
  );
}
