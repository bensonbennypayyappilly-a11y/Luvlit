import { Heart } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

/**
 * Small icon-only save/favorite toggle — heart, filled when saved, outline when not. Reused on
 * /browse result cards and a business's own public page (see business-profile-preview.tsx);
 * never on the homepage or anything it renders, per this project's homepage-freeze rule.
 *
 * Self-contained by design: given just a business id, it reads and writes its own "is this
 * saved" state, so callers don't need to fetch favorites themselves or thread state through
 * props. Every instance mounted at once (e.g. a dozen browse cards) shares one react-query
 * cache entry — same query key, same underlying request — so this never fires N duplicate
 * favorites queries for N cards, and saving/unsaving anywhere invalidates that one shared
 * entry so every other instance (the same business's card on /browse and its own profile page)
 * picks up the new state on its own next render.
 *
 * Customers can browse and book without an account (see README) — only saving needs one.
 * Clicking while signed out sends them to /auth with a `redirect` back to this exact page,
 * matching the pattern already used for other optional-auth actions in this app (see
 * influencer.requests.tsx / influencer.onboarding.tsx) rather than inventing a new prompt.
 */
export function FavoriteButton({ businessId, className }: { businessId: string; className?: string }) {
  const { userId, loading } = useAccount();
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  const queryClient = useQueryClient();

  const queryKey = ["favorite-business-ids", userId] as const;
  const { data: favoriteIds } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("business_id").eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return new Set((data ?? []).map((f) => f.business_id));
    },
  });

  const saved = favoriteIds?.has(businessId) ?? false;

  async function toggle(e: React.MouseEvent) {
    // Cards this sits on (BrowseResultCard) are themselves a <Link> to the business page —
    // never let the toggle also trigger that navigation.
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    if (!userId) {
      navigate({ to: "/auth", search: { redirect: href } });
      return;
    }

    const previous = favoriteIds ?? new Set<string>();
    const next = new Set(previous);
    if (saved) next.delete(businessId);
    else next.add(businessId);
    queryClient.setQueryData(queryKey, next);

    const { error } = saved
      ? await supabase.from("favorites").delete().eq("user_id", userId).eq("business_id", businessId)
      : // The unique(user_id, business_id) constraint is the actual source of truth for "already
        // saved" — upsert with ignoreDuplicates relies on it atomically (ON CONFLICT DO NOTHING)
        // instead of a separate check-then-insert round trip. It's also the only form of upsert
        // that works here: the favorites table only grants insert/select/delete, not update, so
        // a merge-duplicates upsert would fail on RLS/privileges — ignoreDuplicates never issues
        // an UPDATE.
        await supabase
          .from("favorites")
          .upsert(
            { user_id: userId, business_id: businessId },
            { onConflict: "user_id,business_id", ignoreDuplicates: true },
          );

    if (error) {
      queryClient.setQueryData(queryKey, previous);
      return;
    }
    queryClient.invalidateQueries({ queryKey });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? "Remove from saved businesses" : "Save this business"}
      aria-pressed={saved}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-90",
        saved ? "text-accent" : "text-muted-foreground hover:text-accent",
        className,
      )}
    >
      <Heart size={18} fill={saved ? "currentColor" : "none"} strokeWidth={1.75} />
    </button>
  );
}
