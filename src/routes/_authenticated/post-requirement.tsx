import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CITIES, DELIVERY_PREFERENCES, INTENTS, SPECIALITY_OPTIONS } from "@/lib/constants";
import { MediaUploader } from "@/components/media-uploader";
import { Skeleton } from "@/components/ui/skeleton";

type MatchedBusiness = { id: string; name: string; categories: string[]; score: number | null };
type Phase = "form" | "scanning" | "results";

// Quantity only makes sense for categories where "how many" is a real question — a one-off
// service ask (a haircut, a repair visit) doesn't have a meaningful quantity.
const QUANTITY_RELEVANT_CATEGORIES = new Set([
  "Bakers & Patisserie", "Gifts", "Handmade", "Home Décor", "Jewellery", "Fashion & Boutiques", "Food Stalls",
]);

// A reasonable starting point for "what do you need" — always overridable, never required to
// be accepted as-is.
const DEFAULT_INTENT_BY_CATEGORY: Record<string, string> = {
  "Salons & Spa": "book",
  "Fitness & Wellness": "book",
  "Services & Repair": "repair",
  "Event Planning": "hire",
  Entertainment: "hire",
  Photography: "hire",
  "Bakers & Patisserie": "custom_order",
  Jewellery: "buy",
  "Fashion & Boutiques": "buy",
  "Home Décor": "buy",
  Handmade: "custom_order",
  Gifts: "buy",
  "Food Stalls": "buy",
};

export const Route = createFileRoute("/_authenticated/post-requirement")({
  head: () => ({
    meta: [
      { title: "Post a requirement — LuvLit" },
      {
        name: "description",
        content:
          "Describe what you need, set your city and budget, and get quotes from matching businesses across India.",
      },
      { property: "og:title", content: "Post a requirement — LuvLit" },
      { property: "og:description", content: "Get quotes from matching businesses across India." },
    ],
  }),
  component: PostRequirement,
});

function PostRequirement() {
  const navigate = useNavigate();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("id,name").eq("is_approved", true).order("name"))
        .data ?? [],
  });
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    city: "",
    budget: "",
    intent: "",
    specialityTags: [] as string[],
    deliveryPreference: "",
    quantity: "",
    neededBefore: "",
    urgent: false,
  });
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [posterId, setPosterId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setPosterId(data.user?.id ?? null));
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [matchedBusinesses, setMatchedBusinesses] = useState<MatchedBusiness[]>([]);

  function pickCategory(category: string) {
    setForm({
      ...form,
      category,
      // Only nudge a default in if the owner hasn't already chosen one — never overwrite an
      // intentional pick just because the category changed.
      intent: form.intent || DEFAULT_INTENT_BY_CATEGORY[category] || "",
      specialityTags: [],
    });
  }

  function toggleSpeciality(tag: string) {
    setForm((f) => ({
      ...f,
      specialityTags: f.specialityTags.includes(tag)
        ? f.specialityTags.filter((t) => t !== tag)
        : [...f.specialityTags, tag],
    }));
  }

  const specialityOptions = SPECIALITY_OPTIONS[form.category] ?? [];
  const showQuantity = QUANTITY_RELEVANT_CATEGORIES.has(form.category);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("scanning");
    setError(null);
    const startedAt = Date.now();
    // 1.5–2.5s minimum so the scanning moment never feels like a flicker — but never
    // padded beyond the real wait if the matching engine happens to take longer than this.
    const minDurationMs = 1500 + Math.random() * 1000;

    const { data: userData } = await supabase.auth.getUser();
    setPosterId(userData.user?.id ?? null);

    // The server decides who matches — this only submits what the customer described. No
    // candidate query, no client-supplied business list; the RPC runs the full hard-filter-
    // then-score pass itself.
    const { data: requirementId, error: submitError } = await supabase.rpc("submit_requirement_with_matches", {
      _category: form.category,
      _description: form.description,
      _title: form.title || undefined,
      _city: form.city || undefined,
      _budget: form.budget ? Number(form.budget) : undefined,
      _image_urls: images.filter((i): i is string => !!i),
      _intent: form.intent || undefined,
      _speciality_tags: form.specialityTags,
      _delivery_preference: form.deliveryPreference || undefined,
      _quantity: showQuantity && form.quantity ? Number(form.quantity) : undefined,
      _needed_before: form.neededBefore || undefined,
      _urgent: form.urgent,
    });
    if (submitError) {
      setPhase("form");
      return setError(submitError.message);
    }

    // The RPC only returns the new requirement's id — read back who actually qualified (the
    // customer already has read access to leads on their own requirement via existing RLS).
    const { data: leadRows } = await supabase
      .from("leads")
      .select("match_score,businesses:matched_business_id(id,name,categories)")
      .eq("requirement_id", requirementId)
      .order("match_score", { ascending: false });
    const matches: MatchedBusiness[] = (leadRows ?? [])
      .map((l: any) => (l.businesses ? { id: l.businesses.id, name: l.businesses.name, categories: l.businesses.categories ?? [], score: l.match_score } : null))
      .filter((m: MatchedBusiness | null): m is MatchedBusiness => !!m);

    if (matches.length) {
      const remaining = minDurationMs - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    setMatchedBusinesses(matches);
    setPhase("results");
  }

  if (phase === "scanning") {
    return (
      <div className="flex min-h-screen flex-col bg-dark-bg">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="scan-ring absolute inset-0 rounded-full [mask-image:radial-gradient(farthest-side,transparent_calc(100%-3px),#000_calc(100%-3px))]" />
            <div className="scan-pulse h-4 w-4 rounded-full bg-accent-2" />
          </div>
          <p className="eyebrow mt-8 text-dark-fg/70">Finding your matches</p>
          <h1 className="headline mt-4 text-3xl text-dark-fg md:text-4xl">
            Scanning businesses near you…
          </h1>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (phase === "results") {
    const matchedCount = matchedBusinesses.length;
    if (matchedCount === 0) {
      return (
        <div className="flex min-h-screen flex-col bg-background">
          <SiteHeader />
          <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20 text-center">
            <p className="eyebrow">Requirement posted</p>
            <h1 className="mt-4 text-4xl">No matches yet</h1>
            <p className="mt-4 text-muted-foreground">
              We couldn't find a business that's a genuine fit right now, but your requirement is
              live and new businesses can still respond.
            </p>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="mt-8 rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground"
            >
              Go to dashboard
            </button>
          </main>
          <SiteFooter />
        </div>
      );
    }
    return (
      <div className="flex min-h-screen flex-col bg-dark-bg">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20 text-center">
          <p className="eyebrow text-dark-fg/70">Requirement posted</p>
          <h1 className="headline mt-4 text-4xl text-dark-fg">
            Matched with {matchedCount} business{matchedCount === 1 ? "" : "es"}
          </h1>
          <p className="mt-4 text-dark-fg/70">
            They can now respond with a quote — check your conversations soon.
          </p>

          <motion.div
            className="mt-10 space-y-3 text-left"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.12 } } }}
          >
            {matchedBusinesses.map((b) => (
              <motion.div
                key={b.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="card-glow-once relative overflow-hidden rounded-lg border border-dark-fg/15 bg-dark-card p-5"
              >
                <span className="absolute right-4 top-4 rounded-full bg-success px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-success-foreground">
                  Matched
                </span>
                <h3 className="pr-16 text-lg font-medium text-dark-fg">{b.name}</h3>
                {!!b.categories?.length && (
                  <p className="mt-1 text-sm text-dark-fg/60">{b.categories.join(", ")}</p>
                )}
              </motion.div>
            ))}
          </motion.div>

          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="mt-10 rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground"
          >
            Go to dashboard
          </button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
        <p className="eyebrow">Tell us what you need</p>
        <h1 className="mt-4 text-4xl">Post a requirement</h1>
        <p className="mt-4 text-muted-foreground">
          We'll only send this to businesses that are a genuine fit — not everyone in the category.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-5">
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Short title — e.g. Wedding photographer needed"
            maxLength={120}
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          />
          <select
            required
            value={form.category}
            onChange={(e) => pickCategory(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          >
            <option value="">Choose a category</option>
            {(categories ?? []).map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe what you're looking for…"
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          />

          {form.category && (
            <div className="space-y-5 rounded-lg border border-border bg-card/50 p-5">
              <div>
                <label className="text-sm text-muted-foreground">What do you need?</label>
                <select
                  value={form.intent}
                  onChange={(e) => setForm({ ...form, intent: e.target.value })}
                  className="mt-2 w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
                >
                  <option value="">Not sure — just show my description</option>
                  {INTENTS.map((i) => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </div>

              {specialityOptions.length > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground">Anything specific? (optional)</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {specialityOptions.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleSpeciality(tag)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                          form.specialityTags.includes(tag)
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border text-foreground hover:border-accent/40"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
                >
                  <option value="">Any city</option>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={form.deliveryPreference}
                  onChange={(e) => setForm({ ...form, deliveryPreference: e.target.value })}
                  className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
                >
                  <option value="">How should this reach you?</option>
                  {DELIVERY_PREFERENCES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="Budget (optional, ₹)"
                  className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
                />
                {showQuantity && (
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="Quantity (optional)"
                    className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Needed by (optional)</label>
                  <input
                    type="date"
                    value={form.neededBefore}
                    onChange={(e) => setForm({ ...form, neededBefore: e.target.value })}
                    className="mt-2 w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
                  />
                </div>
                <label className="flex items-center gap-3 self-end rounded-md border border-border bg-card px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.urgent}
                    onChange={(e) => setForm({ ...form, urgent: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                  This is urgent
                </label>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">Add up to 3 photos (optional)</p>
            {posterId ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <MediaUploader
                    key={i}
                    businessId={posterId}
                    kind="gallery"
                    bucket="requirement-media"
                    value={images[i]}
                    onChange={(path) =>
                      setImages((prev) => prev.map((v, idx) => (idx === i ? path : v)))
                    }
                    label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button className="rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground">
            Post requirement
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
