import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CITIES } from "@/lib/constants";

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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userData.user!.id)
      .maybeSingle();

    const { error: insertError } = await supabase.from("requirements").insert({
      posted_by_type: business ? "business" : "customer",
      posted_by_user_id: userData.user!.id,
      posted_by_business_id: business?.id ?? null,
      category: form.category,
      description: form.description,
      city: form.city || null,
      budget: form.budget ? Number(form.budget) : null,
    });
    setBusy(false);
    if (insertError) return setError(insertError.message);
    navigate({ to: "/dashboard" });
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
