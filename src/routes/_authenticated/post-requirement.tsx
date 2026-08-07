import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CITIES } from "@/lib/constants";
import { MediaUploader } from "@/components/media-uploader";

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
  const [form, setForm] = useState({ category: "", description: "", city: "", budget: "" });
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [posterId, setPosterId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setPosterId(data.user?.id ?? null));
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matchedCount, setMatchedCount] = useState<number | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    setPosterId(userData.user?.id ?? null);
    const { data: ownBusiness } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userData.user!.id)
      .is("deleted_at", null)
      .maybeSingle();

    const posterType = ownBusiness ? "business" : "customer";
    const posterId = ownBusiness ? ownBusiness.id : userData.user!.id;

    const { data: requirement, error: insertError } = await supabase
      .from("requirements")
      .insert({
        posted_by_type: posterType,
        posted_by_user_id: userData.user!.id,
        posted_by_business_id: ownBusiness?.id ?? null,
        category: form.category,
        description: form.description,
        city: form.city || null,
        budget: form.budget ? Number(form.budget) : null,
        image_urls: images.filter((i): i is string => !!i),
      })
      .select("id")
      .single();

    if (insertError || !requirement) {
      setBusy(false);
      return setError(insertError?.message ?? "Could not post requirement.");
    }

    // Find matching live businesses: same category AND (location in that city OR delivery area for that city OR pan-India delivery).
    let matches: { id: string }[] = [];
    let query = supabase
      .from("businesses")
      .select("id,locations(city),delivery_areas(city,is_pan_india)")
      .eq("is_live", true)
      .is("deleted_at", null)
      .contains("categories", [form.category]);
    if (ownBusiness) query = query.neq("id", ownBusiness.id);
    const { data: candidates } = await query;

    matches = (candidates ?? []).filter((b: any) => {
      if (!form.city) return true;
      const inCity = (b.locations ?? []).some((l: any) => l.city === form.city);
      const delivers = (b.delivery_areas ?? []).some(
        (d: any) => d.is_pan_india || d.city === form.city,
      );
      return inCity || delivers;
    });

    if (matches.length) {
      await supabase.from("leads").insert(
        matches.map((m) => ({
          requirement_id: requirement.id,
          matched_business_id: m.id,
          status: "new",
        })),
      );
      await supabase.from("conversations").insert(
        matches.map((m) => ({
          party_a_id: posterId,
          party_a_type: posterType,
          party_b_id: m.id,
          party_b_type: "business",
          requirement_id: requirement.id,
        })),
      );
    }

    setBusy(false);
    setMatchedCount(matches.length);
  }

  if (matchedCount !== null) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20 text-center">
          <p className="eyebrow">Requirement posted</p>
          <h1 className="mt-4 text-4xl">
            {matchedCount > 0
              ? `Matched with ${matchedCount} business${matchedCount === 1 ? "" : "es"}`
              : "No matches yet"}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {matchedCount > 0
              ? "They can now respond with a quote — check your conversations soon."
              : "We couldn't find a matching business right now, but your requirement is live and new businesses can still respond."}
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
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
        <p className="eyebrow">Tell us what you need</p>
        <h1 className="mt-4 text-4xl">Post a requirement</h1>
        <p className="mt-4 text-muted-foreground">
          Matching businesses in your city will be able to respond with a quote.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-5">
          <select
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
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
          <input
            type="number"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            placeholder="Budget (optional, ₹)"
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          />
          <div>
            <p className="text-sm text-muted-foreground">Add up to 3 photos (optional)</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <MediaUploader
                  key={i}
                  businessId={posterId ?? "pending"}
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
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            disabled={busy}
            className="rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Post requirement
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
