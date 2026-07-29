import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ACCENT_COLORS, BUSINESS_TYPES, CITIES, ECO_CATEGORIES } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/business/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your business — LuvLit" },
      {
        name: "description",
        content:
          "A guided setup that builds your LuvLit business page — categories, locations, delivery area, videos and brand colour.",
      },
      { property: "og:title", content: "Set up your business — LuvLit" },
      { property: "og:description", content: "Guided setup for your LuvLit business page." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("id,name").eq("is_approved", true).order("name"))
        .data ?? [],
  });

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    categories: [] as string[],
    newCategory: "",
    business_types: [] as string[],
    is_eco_friendly: false,
    address: "",
    city: "",
    state: "",
    delivery: [] as string[],
    panIndia: false,
    whatsapp: "",
    contact_email: "",
    instagram_url: "",
    main_video_url: "",
    shorts: "",
    accent: ACCENT_COLORS[0].value,
  });

  const showEco = form.categories.some((c) => ECO_CATEGORIES.includes(c));
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  async function finish() {
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user!.id;

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        owner_id: ownerId,
        name: form.name,
        description: form.description,
        categories: form.categories,
        business_types: form.business_types,
        is_eco_friendly: showEco ? form.is_eco_friendly : false,
        whatsapp: form.whatsapp,
        contact_email: form.contact_email,
        instagram_url: form.instagram_url,
        main_video_url: form.main_video_url,
        short_video_urls: form.shorts
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3),
        brand_accent_color: form.accent,
        is_live: true,
      })
      .select("id")
      .single();
    if (businessError || !business) return setError(businessError?.message ?? "Could not save.");

    if (form.newCategory.trim()) {
      await supabase
        .from("categories")
        .insert({ name: form.newCategory.trim(), is_approved: false, suggested_by_business_id: business.id });
    }
    if (form.city) {
      await supabase
        .from("locations")
        .insert({ business_id: business.id, address: form.address, city: form.city, state: form.state, is_primary: true });
    }
    if (form.panIndia || form.delivery.length) {
      const areas: { business_id: string; city: string | null; is_pan_india: boolean }[] =
        form.panIndia
          ? [{ business_id: business.id, city: null, is_pan_india: true }]
          : form.delivery.map((city) => ({ business_id: business.id, city, is_pan_india: false }));
      await supabase.from("delivery_areas").insert(areas);
    }
    await supabase.from("subscriptions").insert({ business_id: business.id, plan: "base", status: "active" });

    navigate({ to: form.business_types.includes("appointment") ? "/business/setup-staff" : "/dashboard" });
  }

  const steps = [
    {
      title: "What's your business called?",
      body: (
        <div className="space-y-4">
          <input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Business name"
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          />
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Describe what you do, in a couple of sentences."
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          />
        </div>
      ),
    },
    {
      title: "What do you do?",
      body: (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {(categories ?? []).map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => set({ categories: toggle(form.categories, c.name) })}
                className={`rounded-full border px-4 py-2 text-sm ${
                  form.categories.includes(c.name) ? "border-accent bg-accent-soft" : "border-border"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <input
            value={form.newCategory}
            onChange={(e) => set({ newCategory: e.target.value })}
            placeholder="Category not listed? Add your own"
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          />
          {showEco && (
            <label className="surface-card flex items-center justify-between gap-4 p-5 text-sm">
              <span>Is your business eco-friendly / sustainable?</span>
              <input
                type="checkbox"
                checked={form.is_eco_friendly}
                onChange={(e) => set({ is_eco_friendly: e.target.checked })}
              />
            </label>
          )}
        </div>
      ),
    },
    {
      title: "How do customers buy from you?",
      body: (
        <div className="space-y-3">
          {BUSINESS_TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => set({ business_types: toggle(form.business_types, t.value) })}
              className={`w-full rounded-md border p-5 text-left ${
                form.business_types.includes(t.value) ? "border-accent bg-accent-soft" : "border-border"
              }`}
            >
              <p>{t.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.hint}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Where are you based?",
      body: (
        <div className="space-y-4">
          <input
            value={form.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="Address"
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          />
          <select
            value={form.city}
            onChange={(e) => set({ city: e.target.value })}
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          >
            <option value="">City</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            value={form.state}
            onChange={(e) => set({ state: e.target.value })}
            placeholder="State"
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          />
        </div>
      ),
    },
    {
      title: "Where do you deliver or serve?",
      body: (
        <div className="space-y-4">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.panIndia}
              onChange={(e) => set({ panIndia: e.target.checked })}
            />
            I deliver / serve all of India
          </label>
          {!form.panIndia && (
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => set({ delivery: toggle(form.delivery, c) })}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    form.delivery.includes(c) ? "border-accent bg-accent-soft" : "border-border"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "How can people reach you?",
      body: (
        <div className="space-y-4">
          {(
            [
              ["whatsapp", "WhatsApp number"],
              ["contact_email", "Email"],
              ["instagram_url", "Instagram link"],
              ["main_video_url", "Main video link"],
            ] as const
          ).map(([key, label]) => (
            <input
              key={key}
              value={form[key]}
              onChange={(e) => set({ [key]: e.target.value } as Partial<typeof form>)}
              placeholder={label}
              className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
            />
          ))}
          <textarea
            rows={3}
            value={form.shorts}
            onChange={(e) => set({ shorts: e.target.value })}
            placeholder="Up to 3 short video links (Reels / Shorts), one per line"
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          />
        </div>
      ),
    },
    {
      title: "Pick a colour for your page",
      body: (
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => set({ accent: c.value })}
              className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm ${
                form.accent === c.value ? "border-accent" : "border-border"
              }`}
            >
              <span className="size-5 rounded-full" style={{ backgroundColor: c.value }} />
              {c.name}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
        <p className="eyebrow">
          Setup · step {step + 1} of {steps.length}
        </p>
        <h1 className="mt-4 text-4xl">{current.title}</h1>
        <div className="mt-10">{current.body}</div>
        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}
        <div className="mt-10 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="rounded-md border border-border px-6 py-3 text-sm"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}
            className="rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground"
          >
            {step === steps.length - 1 ? "Publish my page" : "Continue"}
          </button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
