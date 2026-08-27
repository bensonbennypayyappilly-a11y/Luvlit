import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/influencer-approvals")({
  head: () => ({
    meta: [
      { title: "Influencer approvals — LuvLit admin" },
      { name: "description", content: "Approve or reject pending influencer profiles." },
      { property: "og:title", content: "Influencer approvals — LuvLit admin" },
      { property: "og:description", content: "Review pending influencer applications." },
    ],
  }),
  component: InfluencerApprovals,
});

function InfluencerApprovals() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: pending } = useQuery({
    queryKey: ["admin-pending-influencers"],
    queryFn: async () =>
      (
        await supabase
          .from("influencer_profiles")
          .select("*")
          .eq("approval_status", "pending")
          .order("submitted_at")
      ).data ?? [],
  });

  async function approve(id: string) {
    setActionError(null);
    const { error } = await supabase
      .from("influencer_profiles")
      .update({ approval_status: "approved", is_verified: true, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return setActionError(error.message);
    queryClient.invalidateQueries({ queryKey: ["admin-pending-influencers"] });
  }

  async function reject(id: string) {
    setActionError(null);
    const { error } = await supabase
      .from("influencer_profiles")
      .update({ approval_status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return setActionError(error.message);
    queryClient.invalidateQueries({ queryKey: ["admin-pending-influencers"] });
  }

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-4 text-4xl">Influencer approvals</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Review pending creator applications before they appear in Find an Influencer.
      </p>
      {actionError && <p className="mt-4 text-sm text-destructive">{actionError}</p>}

      <div className="mt-12 space-y-5">
        {(pending ?? []).map((p) => (
          <div key={p.id} className="surface-card p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xl">{p.display_name}</p>
                <a
                  href={`https://instagram.com/${p.instagram_handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm text-primary hover:underline"
                >
                  @{p.instagram_handle}
                </a>
                <p className="mt-2 text-sm text-muted-foreground">
                  {(p.follower_count ?? 0).toLocaleString("en-IN")} followers
                  {p.engagement_rate != null ? ` · ${p.engagement_rate}% engagement` : ""}
                  {p.city ? ` · ${p.city}` : ""}
                </p>
                {!!p.categories?.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.categories.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-border px-2.5 py-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => approve(p.id)}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(p.id)}
                  className="rounded-md border border-destructive px-5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
        {!pending?.length && (
          <p className="text-muted-foreground">No pending influencer applications.</p>
        )}
      </div>
    </div>
  );
}
