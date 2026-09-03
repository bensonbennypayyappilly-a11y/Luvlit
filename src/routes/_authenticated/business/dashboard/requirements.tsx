import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { isStoragePath, useMediaUrl } from "@/components/media-uploader";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { CardListSkeleton } from "@/components/ui/skeleton-shapes";

export const Route = createFileRoute("/_authenticated/business/dashboard/requirements")({
  head: () => ({
    meta: [
      { title: "Requirements — Business dashboard — LuvLit" },
      { name: "description", content: "Track requirements your business posted and the quotes you've received." },
      { property: "og:title", content: "Requirements — Business dashboard — LuvLit" },
      { property: "og:description", content: "Requirements you've posted on LuvLit and responses received." },
    ],
  }),
  component: RequirementsPage,
});

function RequirementThumbs({ imageUrls }: { imageUrls: string[] | null | undefined }) {
  if (!imageUrls || imageUrls.length === 0) return null;
  return (
    <div className="mt-2 flex gap-2">
      {imageUrls.slice(0, 3).map((path, i) => (
        <RequirementThumb key={i} path={path} />
      ))}
    </div>
  );
}

function RequirementThumb({ path }: { path: string }) {
  const resolved = useMediaUrl(path, "requirement-media");
  const url = isStoragePath(path) ? resolved : path;
  if (!url) return null;
  return <img src={url} alt="" className="h-14 w-14 rounded-md object-cover" />;
}

function RequirementsPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<{ id: string; message: string } | null>(null);

  async function closeRequirement(id: string) {
    setClosingId(id);
    setCloseError(null);
    const { error } = await supabase.from("requirements").update({ status: "closed" }).eq("id", id);
    setClosingId(null);
    if (error) {
      setCloseError({ id, message: error.message });
      return;
    }
    refetch();
  }

  const {
    data: requirements,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-own-requirements", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data: reqs, error: reqsError } = await supabase
        .from("requirements")
        .select("id,category,description,city,budget,created_at,image_urls,status")
        .eq("posted_by_business_id", businessId!)
        .order("created_at", { ascending: false });
      if (reqsError) throw new Error(reqsError.message);
      const reqIds = (reqs ?? []).map((r) => r.id);
      if (!reqIds.length) return [];
      const { data: convs, error: convsError } = await supabase
        .from("conversations")
        .select("id,requirement_id,created_at")
        .in("requirement_id", reqIds);
      if (convsError) throw new Error(convsError.message);
      const convIds = (convs ?? []).map((c) => c.id);
      let latestByConv = new Map<string, { content: string; created_at: string }>();
      if (convIds.length) {
        const { data: msgs, error: msgsError } = await supabase
          .from("messages")
          .select("conversation_id,content,created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false });
        if (msgsError) throw new Error(msgsError.message);
        for (const m of msgs ?? []) {
          if (!latestByConv.has(m.conversation_id)) latestByConv.set(m.conversation_id, m);
        }
      }
      return (reqs ?? []).map((r) => ({
        ...r,
        conversations: (convs ?? [])
          .filter((c) => c.requirement_id === r.id)
          .map((c) => ({ id: c.id, latest: latestByConv.get(c.id) ?? null })),
      }));
    },
  });

  return (
    <div>
      <DashboardBackLink />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Requirements</p>
          <h1 className="mt-2 text-2xl font-medium">Your posted requirements</h1>
        </div>
        <Link to="/post-requirement" className="rounded-md border border-border px-4 py-2 text-sm">
          Post a requirement
        </Link>
      </div>

      {isLoading && <CardListSkeleton />}
      {!isLoading && error && (
        <div className="dashboard-card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-sm text-destructive">Couldn't load this information. Try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="min-h-11 rounded-md border border-destructive px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            Try again
          </button>
        </div>
      )}
      {!isLoading && !error && (requirements ?? []).length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">You haven't posted any requirements yet.</p>
      )}

      <div className="mt-6 space-y-4">
        {!error && (requirements ?? []).map((r) => (
          <div key={r.id} className="dashboard-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="font-medium">{r.category}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
                    (r as any).status === "closed" ? "bg-secondary text-muted-foreground" : "bg-accent-soft text-accent"
                  }`}
                >
                  {(r as any).status === "closed" ? "Closed" : "Open"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.city ?? "Any city"} {r.budget ? `· Budget ₹${r.budget}` : ""}
            </p>
            <RequirementThumbs imageUrls={(r as any).image_urls} />
            <div className="mt-3 space-y-2">
              {r.conversations.length === 0 && (
                <p className="text-xs text-muted-foreground">No responses yet.</p>
              )}
              {r.conversations.map((c) => (
                <div key={c.id} className="rounded-md bg-secondary px-3 py-2 text-xs">
                  {c.latest ? c.latest.content : "New conversation started — no messages yet."}
                </div>
              ))}
            </div>
            {(r as any).status === "open" && (
              <button
                onClick={() => closeRequirement(r.id)}
                disabled={closingId === r.id}
                className="mt-3 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-60"
              >
                {closingId === r.id ? "Marking as fulfilled…" : "Mark as fulfilled"}
              </button>
            )}
            {closeError?.id === r.id && <p className="mt-2 text-xs text-destructive">{closeError.message}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
