import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useSession } from "@/hooks/use-session";
import { acceptCollaborationRequest } from "@/lib/collaboration";

export const Route = createFileRoute("/influencer/requests")({
  head: () => ({
    meta: [
      { title: "Collaboration requests — LuvLit" },
      { name: "description", content: "Incoming brand collaboration requests — accept, decline, or counter." },
      { property: "og:title", content: "Collaboration requests — LuvLit" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CollaborationRequests,
});

type RequestRow = {
  id: string;
  business_id: string;
  rate_card_item: string | null;
  proposed_rate: number | null;
  brief: string;
  status: "pending" | "accepted" | "declined" | "countered";
  counter_rate: number | null;
  conversation_id: string | null;
  created_at: string;
  businesses: { name: string } | null;
};

function useMyInfluencerProfileId(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-influencer-profile-id", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("influencer_profiles")
        .select("id")
        .eq("user_id", userId!)
        .maybeSingle();
      return data?.id as string | undefined;
    },
  });
}

function RequestCard({ request, influencerId, onChanged }: { request: RequestRow; influencerId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterRate, setCounterRate] = useState("");

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
        business_id: request.business_id,
        influencer_id: influencerId,
      });
      if (linkError) {
        setBusy(false);
        return setError(linkError);
      }
    }
    setBusy(false);
    onChanged();
  }

  async function submitCounter() {
    if (!counterRate) return setError("Enter a counter rate.");
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("collaboration_requests")
      .update({ status: "countered", counter_rate: Number(counterRate) })
      .eq("id", request.id);
    setBusy(false);
    if (updateError) return setError(updateError.message);
    onChanged();
  }

  return (
    <div className="surface-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg">{request.businesses?.name ?? "A business"}</h3>
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
        <p className="mt-3 text-sm text-muted-foreground">Your counter: ₹{request.counter_rate}</p>
      )}
      {request.status === "accepted" && request.conversation_id && (
        <Link to="/dashboard/chats" className="mt-4 inline-block text-sm text-primary hover:underline">
          Go to conversation →
        </Link>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {request.status === "pending" && !counterOpen && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => respond("accepted")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Accept
          </button>
          <button
            disabled={busy}
            onClick={() => setCounterOpen(true)}
            className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-60"
          >
            Counter
          </button>
          <button
            disabled={busy}
            onClick={() => respond("declined")}
            className="rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}
      {request.status === "pending" && counterOpen && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <input
            type="number"
            value={counterRate}
            onChange={(e) => setCounterRate(e.target.value)}
            placeholder="Your counter rate (₹)"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            onClick={submitCounter}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Send counter
          </button>
          <button
            disabled={busy}
            onClick={() => setCounterOpen(false)}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function CollaborationRequests() {
  const { user, loading } = useSession();
  const { data: influencerId } = useMyInfluencerProfileId(user?.id);
  const queryClient = useQueryClient();

  const { data: requests } = useQuery({
    queryKey: ["collaboration-requests", influencerId],
    enabled: !!influencerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("collaboration_requests")
        .select(
          "id,business_id,rate_card_item,proposed_rate,brief,status,counter_rate,conversation_id,created_at,businesses(name)",
        )
        .eq("influencer_id", influencerId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as RequestRow[];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["collaboration-requests", influencerId] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
        <p className="eyebrow">For creators</p>
        <h1 className="mt-4 text-4xl">Collaboration requests</h1>

        {loading ? null : !user ? (
          <div className="surface-card mt-10 p-8">
            <p className="text-muted-foreground">Sign in to see your incoming collaboration requests.</p>
            <Link
              to="/auth"
              search={{ redirect: "/influencer/requests" }}
              className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            {(requests ?? []).map((r) => (
              <RequestCard key={r.id} request={r} influencerId={influencerId!} onChanged={refresh} />
            ))}
            {!requests?.length && (
              <p className="text-muted-foreground">No collaboration requests yet.</p>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
