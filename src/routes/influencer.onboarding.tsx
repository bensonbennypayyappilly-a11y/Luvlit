import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useSession } from "@/hooks/use-session";
import { useCities } from "@/hooks/use-cities";
import { getCategories } from "@/lib/public.functions";

export const Route = createFileRoute("/influencer/onboarding")({
  head: () => ({
    meta: [
      { title: "Apply as an influencer — LuvLit" },
      {
        name: "description",
        content:
          "Apply to LuvLit's reviewed creator directory: your Instagram handle, reach, categories and an optional rate card. Free for influencers.",
      },
      { property: "og:title", content: "Apply as an influencer — LuvLit" },
      { property: "og:description", content: "Free application to LuvLit's creator directory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InfluencerOnboarding,
});

function InfluencerOnboarding() {
  const { user, loading } = useSession();
  const cities = useCities();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const [form, setForm] = useState({
    display_name: "",
    instagram_handle: "",
    city: "",
    follower_count: "",
    engagement_rate: "",
    categories: [] as string[],
    rate_post: "",
    rate_reel: "",
    rate_story: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    const handle = form.instagram_handle.trim().replace(/^@/, "");
    if (!form.display_name.trim() || !handle) return setError("Name and Instagram handle are required.");
    if (form.display_name.length > 120 || handle.length > 60) return setError("That's too long.");

    const rate_card =
      form.rate_post || form.rate_reel || form.rate_story
        ? {
            post: Number(form.rate_post) || null,
            reel: Number(form.rate_reel) || null,
            story: Number(form.rate_story) || null,
          }
        : null;

    setBusy(true);
    const { error: insertError } = await supabase.from("influencer_profiles").insert({
      user_id: user.id,
      display_name: form.display_name.trim(),
      instagram_handle: handle,
      city: form.city || null,
      follower_count: Number(form.follower_count) || null,
      engagement_rate: Number(form.engagement_rate) || null,
      categories: form.categories,
      rate_card,
      approval_status: "pending",
    });
    setBusy(false);
    if (insertError) return setError(insertError.message);
    setDone(true);
  }

  const input = "w-full rounded-md border border-border bg-card px-4 py-3 text-sm";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
        <p className="eyebrow">For creators</p>
        <h1 className="mt-4 text-4xl">Apply as an influencer</h1>

        {loading ? null : !user ? (
          <div className="surface-card mt-10 p-8">
            <p className="text-muted-foreground">
              Create a free account (or sign in) so we can tie your application to you and let you
              check its status later.
            </p>
            <Link
              to="/auth"
              search={{ redirect: "/influencer/onboarding" }}
              className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
            >
              Sign in to apply
            </Link>
          </div>
        ) : done ? (
          <div className="surface-card mt-10 p-10">
            <p className="eyebrow">Submitted</p>
            <h2 className="mt-3 text-2xl">Under review</h2>
            <p className="mt-4 text-muted-foreground">
              Thanks — your profile has been saved but isn't public yet. Our team reviews every
              application manually, so this isn't instant. You can check where it stands any time.
            </p>
            <Link
              to="/influencer/status"
              className="mt-8 inline-block rounded-md border border-accent px-6 py-3 text-sm font-medium text-accent hover:bg-accent-soft"
            >
              Check application status
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="surface-card mt-10 space-y-6 p-8">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Display name</label>
              <input
                required
                className={input}
                value={form.display_name}
                onChange={(e) => set({ display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Instagram handle</label>
              <input
                required
                placeholder="@yourhandle"
                className={input}
                value={form.instagram_handle}
                onChange={(e) => set({ instagram_handle: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                We verify handles manually today. Stats you enter below are shown as self-reported
                until verified.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Followers</label>
                <input
                  type="number"
                  min="0"
                  className={input}
                  value={form.follower_count}
                  onChange={(e) => set({ follower_count: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Engagement rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className={input}
                  value={form.engagement_rate}
                  onChange={(e) => set({ engagement_rate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">City</label>
              <select
                className={input}
                value={form.city}
                onChange={(e) => set({ city: e.target.value })}
              >
                <option value="">Not city-specific</option>
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Categories you post about most</label>
              <div className="flex flex-wrap gap-2">
                {(categories ?? []).map((c) => {
                  const active = form.categories.includes(c.name);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() =>
                        set({
                          categories: active
                            ? form.categories.filter((v) => v !== c.name)
                            : [...form.categories, c.name],
                        })
                      }
                      className={`rounded-full border px-4 py-2 text-sm ${
                        active ? "border-accent bg-accent-soft" : "border-border"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Rate card (optional, ₹)</label>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="number"
                  min="0"
                  placeholder="Post"
                  className={input}
                  value={form.rate_post}
                  onChange={(e) => set({ rate_post: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Reel"
                  className={input}
                  value={form.rate_reel}
                  onChange={(e) => set({ rate_reel: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Story"
                  className={input}
                  value={form.rate_story}
                  onChange={(e) => set({ rate_story: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              disabled={busy}
              className="rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
