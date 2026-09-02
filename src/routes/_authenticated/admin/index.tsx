import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLANS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — LuvLit" },
      { name: "description", content: "Review businesses, categories and subscriptions." },
      { property: "og:title", content: "Admin — LuvLit" },
      { property: "og:description", content: "LuvLit admin overview." },
    ],
  }),
  component: AdminIndex,
});

function AdminIndex() {
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [merging, setMerging] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const { data: businesses } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () =>
      (
        await supabase
          .from("businesses")
          .select("id,name,created_at")
          .eq("status", "live")
          .order("created_at", { ascending: false })
          .limit(20)
      ).data ?? [],
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-pending-categories"],
    queryFn: async () =>
      (
        await supabase.from("categories").select("*").eq("is_approved", false).order("created_at")
      ).data ?? [],
  });

  const { data: approvedCategories } = useQuery({
    queryKey: ["admin-approved-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("id,name").eq("is_approved", true).order("name"))
        .data ?? [],
  });

  const { data: subscriptionStats } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      // This screen only ever needs active/total counts per plan, not the underlying rows —
      // head-only exact counts stay accurate as the table grows instead of an unbounded
      // row fetch (or a row limit, which would silently under-count revenue at scale).
      const planKeys = Object.keys(PLANS) as (keyof typeof PLANS)[];
      return Promise.all(
        planKeys.map(async (plan) => {
          const [totalRes, activeRes] = await Promise.all([
            supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("plan", plan),
            supabase
              .from("subscriptions")
              .select("id", { count: "exact", head: true })
              .eq("plan", plan)
              .eq("status", "active"),
          ]);
          return { plan, total: totalRes.count ?? 0, active: activeRes.count ?? 0 };
        }),
      );
    },
  });

  async function approveCategory(id: string) {
    setCategoryError(null);
    const { error } = await supabase.from("categories").update({ is_approved: true }).eq("id", id);
    if (error) {
      setCategoryError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-pending-categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin-approved-categories"] });
  }

  async function renameCategory(id: string) {
    if (!renameValue.trim()) return;
    setCategoryError(null);
    const { error } = await supabase.from("categories").update({ name: renameValue.trim() }).eq("id", id);
    if (error) {
      setCategoryError(error.message);
      return;
    }
    setRenaming(null);
    setRenameValue("");
    queryClient.invalidateQueries({ queryKey: ["admin-pending-categories"] });
  }

  async function mergeCategory(id: string, targetName: string) {
    setCategoryError(null);
    const { error } = await supabase.rpc("admin_merge_category", { _pending_id: id, _target_name: targetName });
    if (error) {
      setCategoryError(error.message);
      return;
    }
    setMerging(null);
    queryClient.invalidateQueries({ queryKey: ["admin-pending-categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin-approved-categories"] });
  }

  const planCounts: Record<string, { active: number; total: number }> = {};
  let totalSubscriptions = 0;
  for (const s of subscriptionStats ?? []) {
    totalSubscriptions += s.total;
    if (s.total > 0) planCounts[s.plan] = { active: s.active, total: s.total };
  }
  const monthlyRevenue = Object.entries(planCounts).reduce(
    (sum, [plan, c]) => sum + c.active * (PLANS[plan as keyof typeof PLANS]?.price ?? 0),
    0,
  );

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-4 text-4xl">Overview</h1>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/admin/influencer-approvals"
          className="rounded-md border border-accent px-6 py-3 text-sm font-medium text-accent hover:bg-accent-soft"
        >
          Influencer approvals →
        </Link>
        <Link
          to="/admin/business-approvals"
          className="rounded-md border border-accent px-6 py-3 text-sm font-medium text-accent hover:bg-accent-soft"
        >
          Business moderation →
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="hairline pt-10 text-2xl">Revenue & subscriptions</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="surface-card p-6">
            <p className="eyebrow">Estimated monthly revenue</p>
            <p className="mt-2 text-2xl">₹{monthlyRevenue.toLocaleString("en-IN")}</p>
          </div>
          {Object.entries(planCounts).map(([plan, c]) => (
            <div key={plan} className="surface-card p-6">
              <p className="eyebrow">{plan.replace(/_/g, " ")}</p>
              <p className="mt-2 text-2xl">{c.active} active</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.total} total</p>
            </div>
          ))}
          {!totalSubscriptions && <p className="text-muted-foreground">No subscriptions yet.</p>}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="hairline pt-10 text-2xl">Recently live businesses</h2>
        <div className="mt-6 space-y-3">
          {(businesses ?? []).map((b) => (
            <Link
              key={b.id}
              to="/business/$id"
              params={{ id: b.id }}
              className="surface-card flex items-center justify-between p-5 hover:border-accent"
            >
              <span>{b.name}</span>
              <span className="text-sm text-muted-foreground">
                {new Date(b.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
          {!businesses?.length && <p className="text-muted-foreground">No live businesses yet.</p>}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="hairline pt-10 text-2xl">Pending category suggestions</h2>
        {categoryError && <p className="mt-3 text-sm text-destructive">{categoryError}</p>}
        <div className="mt-6 space-y-4">
          {(categories ?? []).map((c) => (
            <div key={c.id} className="surface-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {renaming === c.id ? (
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                ) : (
                  <p>{c.name}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {renaming === c.id ? (
                    <button
                      onClick={() => renameCategory(c.id)}
                      className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                    >
                      Save name
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setCategoryError(null);
                        setRenaming(c.id);
                        setRenameValue(c.name);
                      }}
                      className="rounded-md border border-border px-4 py-2 text-sm hover:border-accent"
                    >
                      Rename
                    </button>
                  )}
                  <button
                    onClick={() => approveCategory(c.id)}
                    className="rounded-md border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setMerging(merging === c.id ? null : c.id)}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:border-accent"
                  >
                    Merge into…
                  </button>
                </div>
              </div>
              {merging === c.id && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(approvedCategories ?? []).map((ac) => (
                    <button
                      key={ac.id}
                      onClick={() => mergeCategory(c.id, ac.name)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent"
                    >
                      {ac.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!categories?.length && (
            <p className="text-muted-foreground">No pending category suggestions.</p>
          )}
        </div>
      </section>
    </div>
  );
}
