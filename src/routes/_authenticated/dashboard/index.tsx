import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/use-session";
import { getStaffAvailability } from "@/lib/public.functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Your dashboard — LuvLit" },
      {
        name: "description",
        content: "Your appointments, requirements, quotes and saved businesses on LuvLit.",
      },
      { property: "og:title", content: "Your dashboard — LuvLit" },
      { property: "og:description", content: "Appointments, quotes and favourites in one place." },
    ],
  }),
  component: Dashboard,
});

/** Reschedule picks from the same business's other open slots — booking_id/business_id/the
 * slot being replaced are all it needs; capacity/ownership/atomicity are enforced server-side
 * by reschedule_booking(), same as book_slot()/cancel_booking() already do for their own steps. */
function RescheduleDialog({
  bookingId,
  businessId,
  currentSlotId,
  onDone,
  onClose,
}: {
  bookingId: string;
  businessId: string;
  currentSlotId: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: availability, isLoading } = useQuery({
    queryKey: ["reschedule-availability", businessId],
    queryFn: () => getStaffAvailability({ data: { businessId } }),
  });

  const openSlots = (availability?.slots ?? []).filter(
    (s) => s.id !== currentSlotId && s.status === "open" && s.booked_count < s.capacity,
  );
  const staffById = new Map((availability?.staff ?? []).map((s) => [s.id, s.name]));

  async function pick(slotId: string) {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("reschedule_booking", {
      _booking_id: bookingId,
      _new_slot_id: slotId,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="surface-card max-h-[80vh] w-full max-w-md overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-medium">Choose a new time</p>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading available times…</p>}
        {!isLoading && openSlots.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No other open slots right now — try again later.</p>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-4 space-y-2">
          {openSlots.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => pick(s.id)}
              className="flex min-h-11 w-full items-center justify-between rounded-md border border-border px-4 text-sm hover:border-accent disabled:opacity-50"
            >
              <span>
                {s.date} · {s.start_time.slice(0, 5)}
                {staffById.get(s.staff_id) ? ` · with ${staffById.get(s.staff_id)}` : ""}
              </span>
              <span aria-hidden>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Star-rating + comment for a single completed booking. Gated server-side by
 * can_review_booking() (a non-cancelled booking whose slot date has passed) and a
 * unique(booking_id) constraint — this form can only ever succeed once per booking. */
function ReviewDialog({
  bookingId,
  businessId,
  businessName,
  customerUserId,
  onDone,
  onClose,
}: {
  bookingId: string;
  businessId: string;
  businessName: string;
  customerUserId: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!rating) return setError("Choose a star rating first.");
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("reviews")
      .insert({ business_id: businessId, booking_id: bookingId, customer_user_id: customerUserId, rating, comment: comment.trim() || null });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="surface-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-lg font-medium">Review {businessName}</p>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="mt-5 flex justify-center gap-1 text-3xl" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className={`min-h-11 min-w-11 leading-none ${n <= (hoverRating || rating) ? "text-accent" : "text-border"}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What was it like working with them? (optional)"
          rows={3}
          className="mt-4 w-full rounded-md border border-border bg-background px-4 py-3 text-sm"
        />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="mt-4 min-h-11 w-full rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  const { userId, displayName, role } = useAccount();
  const qc = useQueryClient();
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data, error: overviewError, refetch: refetchOverview } = useQuery({
    queryKey: ["customer-dashboard-overview", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [
        { data: bookings, error: bookingsError },
        { data: requirements, error: requirementsError },
        { data: favorites, error: favoritesError },
        { data: reviews, error: reviewsError },
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("id,status,business_id,businesses(name),slots(id,date,start_time,staff(name))")
          .eq("customer_user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("requirements")
          .select("*")
          .eq("posted_by_user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("favorites")
          .select("business_id, businesses(id,name)")
          .eq("user_id", userId!)
          .limit(4),
        supabase.from("reviews").select("booking_id,rating").eq("customer_user_id", userId!),
      ]);
      if (bookingsError) throw new Error(bookingsError.message);
      if (requirementsError) throw new Error(requirementsError.message);
      if (favoritesError) throw new Error(favoritesError.message);
      if (reviewsError) throw new Error(reviewsError.message);
      return {
        bookings: bookings ?? [],
        requirements: requirements ?? [],
        favorites: favorites ?? [],
        reviewedBookingIds: new Map((reviews ?? []).map((r) => [r.booking_id, r.rating])),
      };
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="eyebrow">Hey {displayName ?? "there"} 👋</p>
        <h1 className="mt-4 text-4xl">Welcome back to LuvLit</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Here's a warm little snapshot of your appointments, requirements, chats and favourite
          businesses.
        </p>

        {overviewError && (
          <div className="surface-card mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
            <p className="text-sm text-destructive">Couldn't load this information. Try again.</p>
            <button
              type="button"
              onClick={() => refetchOverview()}
              className="min-h-11 rounded-md border border-destructive px-5 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              Try again
            </button>
          </div>
        )}

        {role === "business" && (
          <div className="surface-card mt-10 flex flex-wrap items-center justify-between gap-4 p-8">
            <p className="text-muted-foreground">You also have a business account.</p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/dashboard/find-influencer"
                className="rounded-md border border-accent px-6 py-3 text-sm font-medium text-accent hover:bg-accent-soft"
              >
                Find an influencer
              </Link>
              <Link
                to="/business/onboarding"
                className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
              >
                Manage your business
              </Link>
            </div>
          </div>
        )}

        <section className="mt-14 grid gap-6 sm:grid-cols-2">
          <Link to="/dashboard/requirements" className="surface-card p-8 hover:border-accent">
            <p className="eyebrow">My requirements</p>
            <p className="mt-3 text-2xl">{overviewError ? "—" : `${data?.requirements.length ?? 0} recent`}</p>
            <p className="mt-2 text-sm text-muted-foreground">See quotes coming in and reply.</p>
          </Link>
          <Link to="/dashboard/saved" className="surface-card p-8 hover:border-accent">
            <p className="eyebrow">Saved businesses</p>
            <p className="mt-3 text-2xl">{overviewError ? "—" : `${data?.favorites.length ?? 0} favourites`}</p>
            <p className="mt-2 text-sm text-muted-foreground">Your shortlist, all in one place.</p>
          </Link>
          <Link to="/dashboard/chats" className="surface-card p-8 hover:border-accent">
            <p className="eyebrow">Chats</p>
            <p className="mt-3 text-2xl">Open conversations</p>
            <p className="mt-2 text-sm text-muted-foreground">Talk to businesses you've reached out to.</p>
          </Link>
          <Link to="/dashboard/settings" className="surface-card p-8 hover:border-accent">
            <p className="eyebrow">Account settings</p>
            <p className="mt-3 text-2xl">Your details</p>
            <p className="mt-2 text-sm text-muted-foreground">Update your name, phone and email.</p>
          </Link>
        </section>

        <section className="mt-16">
          <div className="hairline flex items-end justify-between pt-10">
            <h2 className="text-2xl">Your appointments</h2>
          </div>
          {actionError && <p className="mt-3 text-sm text-destructive">{actionError}</p>}
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {!overviewError &&
              (data?.bookings ?? []).map((b) => {
                const isPast = !!b.slots?.date && b.slots.date < todayStr;
                const reviewedRating = data?.reviewedBookingIds.get(b.id);
                return (
                  <div key={b.id} className="surface-card p-7">
                    <p className="text-lg">{b.businesses?.name ?? "Business"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {b.slots?.date} · {b.slots?.start_time}
                      {b.slots?.staff?.name ? ` · with ${b.slots.staff.name}` : ""}
                    </p>
                    <p className="mt-3 eyebrow">{b.status}</p>
                    {b.status === "confirmed" && !isPast && b.slots?.id && b.business_id && (
                      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                        <button
                          type="button"
                          onClick={() => setReschedulingId(b.id)}
                          className="inline-flex min-h-11 items-center px-1 text-xs text-muted-foreground hover:text-accent"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setActionError(null);
                            const { error } = await supabase.rpc("cancel_booking", { _booking_id: b.id });
                            if (error) return setActionError(error.message);
                            qc.invalidateQueries({ queryKey: ["customer-dashboard-overview"] });
                          }}
                          className="inline-flex min-h-11 items-center px-1 text-xs text-muted-foreground hover:text-destructive"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {isPast && b.status !== "cancelled" && b.business_id && (
                      <div className="mt-3 border-t border-border pt-3">
                        {reviewedRating != null ? (
                          <p className="text-xs text-muted-foreground">
                            You reviewed this — {"★".repeat(reviewedRating)}
                            {"☆".repeat(5 - reviewedRating)}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReviewingId(b.id)}
                            className="inline-flex min-h-11 items-center px-1 text-xs text-accent hover:underline"
                          >
                            Leave a review
                          </button>
                        )}
                      </div>
                    )}
                    {reschedulingId === b.id && b.slots?.id && b.business_id && (
                      <RescheduleDialog
                        bookingId={b.id}
                        businessId={b.business_id}
                        currentSlotId={b.slots.id}
                        onClose={() => setReschedulingId(null)}
                        onDone={() => {
                          setReschedulingId(null);
                          qc.invalidateQueries({ queryKey: ["customer-dashboard-overview"] });
                        }}
                      />
                    )}
                    {reviewingId === b.id && b.business_id && userId && (
                      <ReviewDialog
                        bookingId={b.id}
                        businessId={b.business_id}
                        businessName={b.businesses?.name ?? "this business"}
                        customerUserId={userId}
                        onClose={() => setReviewingId(null)}
                        onDone={() => {
                          setReviewingId(null);
                          qc.invalidateQueries({ queryKey: ["customer-dashboard-overview"] });
                        }}
                      />
                    )}
                  </div>
                );
              })}
            {overviewError && (
              <p className="text-destructive">Couldn't load this information. Try again.</p>
            )}
            {!overviewError && !data?.bookings.length && (
              <p className="text-muted-foreground">No appointments booked yet.</p>
            )}
          </div>
        </section>
    </div>
  );
}
