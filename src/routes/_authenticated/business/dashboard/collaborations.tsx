import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { acceptCollaborationRequest } from "@/lib/collaboration";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { CardListSkeleton } from "@/components/ui/skeleton-shapes";

export const Route = createFileRoute("/_authenticated/business/dashboard/collaborations")({
  head: () => ({
    meta: [
      { title: "Influencer collaborations — Business dashboard — LuvLit" },
      {
        name: "description",
        content: "Track collaboration requests you've sent to influencers and respond to their counter-offers.",
      },
      { property: "og:title", content: "Influencer collaborations — Business dashboard — LuvLit" },
      { property: "og:description", content: "Manage outgoing influencer collaboration requests." },
    ],
  }),
  component: CollaborationsPage,
});

type RequestRow = {
  id: string;
  influencer_id: string;
  rate_card_item: string | null;
  proposed_rate: number | null;
  brief: string;
  status: "pending" | "accepted" | "declined" | "countered";
  counter_rate: number | null;
  conversation_id: string | null;
  created_at: string;
  influencer_profiles: { display_name: string } | null;
};

function RequestCard({ request, businessId, onChanged }: { request: RequestRow; businessId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(status: "accepted" | "declined") {
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("collaboration_requests")
      .update({ status })
      .eq("id", request.id);
    if (updateError) {
      setBusy(false);
      return setError(updateError.message);
    }
    if (status === "accepted") {
      const { error: linkError } = await acceptCollaborationRequest({
        id: request.id,
        business_id: businessId,
        influencer_id: request.influencer_id,
      });
      if (linkError) {
        setBusy(false);
        return setError(linkError);
      }
    }
    setBusy(false);
    onChanged();
  }

  return (
    <div className="surface-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg">{request.influencer_profiles?.display_name ?? "An influencer"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.rate_card_item ? `${request.rate_card_item} · ` : ""}
            {request.proposed_rate ? `Proposed ₹${request.proposed_rate}` : "No rate proposed"}
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">
          {request.status}
        </span>
      </div>
      <p className="mt-4 text-sm">{request.brief}</p>
      {request.status === "countered" && request.counter_rate != null && (
        <p className="mt-3 text-sm text-muted-foreground">Their counter: ₹{request.counter_rate}</p>
      )}
      {request.status === "accepted" && request.conversation_id && (
        <Link to="/business/dashboard/leads" className="mt-4 inline-block text-sm text-primary hover:underline">
          Go to conversation →
        </Link>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {request.status === "countered" && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => respond("accepted")}
            className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Accept counter
          </button>
          <button
            disabled={busy}
            onClick={() => respond("declined")}
            className="min-h-11 rounded-md border border-destructive/40 px-4 text-sm text-destructive disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}

function CollaborationsPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const queryClient = useQueryClient();

  const { data: requests, error: requestsError, isLoading: requestsLoading } = useQuery({
    queryKey: ["business-collaboration-requests", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaboration_requests")
        .select(
          "id,influencer_id,rate_card_item,proposed_rate,brief,status,counter_rate,conversation_id,created_at,influencer_profiles(display_name)",
        )
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as RequestRow[];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["business-collaboration-requests", businessId] });
  }

  return (
    <div>
      <DashboardBackLink />
      <p className="eyebrow">Influencer outreach</p>
      <h1 className="mt-2 text-2xl font-medium">Collaborations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Requests you've sent to influencers, and their responses.
      </p>

      <div className="mt-6 space-y-4">
        {requestsLoading && <CardListSkeleton rows={3} />}
        {requestsError && (
          <p className="text-sm text-destructive">Couldn't load your collaboration requests. Try again.</p>
        )}
        {!requestsLoading &&
          !requestsError &&
          (requests ?? []).map((r) => (
            <RequestCard key={r.id} request={r} businessId={businessId!} onChanged={refresh} />
          ))}
        {!requestsLoading && !requestsError && !requests?.length && (
          <p className="surface-card p-6 text-sm text-muted-foreground">
            You haven't reached out to any influencers yet.{" "}
            <Link to="/dashboard/find-influencer" className="text-primary hover:underline">
              Find an influencer →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
