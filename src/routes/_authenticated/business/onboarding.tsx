import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MediaUploader } from "@/components/media-uploader";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { ACCENT_COLORS, BUSINESS_TYPES, CITIES, ECO_CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/slugify";
import { isReservedSlug } from "@/lib/reserved-slugs";

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
  // An owner who already has a business must never be able to insert a second one here —
  // redirect straight to the website builder instead of letting the wizard run again.
  const { data: existingBusiness, isLoading: checkingExisting } = useDashboardBusiness();
  useEffect(() => {
    if (existingBusiness) {
      navigate({ to: "/business/dashboard/website", replace: true });
    }
  }, [existingBusiness, navigate]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("id,name").eq("is_approved", true).order("name"))
        .data ?? [],
  });

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
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
    custom_domain: "",
    hero_image_url: null as string | null,
    main_video_url: null as string | null,
    shorts: [] as (string | null)[],
    accent: ACCENT_COLORS[0].value,
  });

  const showEco = form.categories.some((c) => ECO_CATEGORIES.includes(c));
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  /** Creates the business row (once) so media uploads can target its storage folder. */
  async function ensureBusiness() {
    if (businessId) return businessId;
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;
    if (!ownerId) {
      setError("You need to be signed in to continue.");
      return null;
    }
    const initialSlug = await generateUniqueSlug(form.name || "Untitled business");
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        owner_id: ownerId,
        name: form.name || "Untitled business",
        slug: initialSlug,
        description: form.description,
        categories: form.categories,
        business_types: form.business_types,
        is_eco_friendly: showEco ? form.is_eco_friendly : false,
        brand_accent_color: form.accent,
      })
      .select("id")
      .single();
    if (businessError || !business) {
      setError(businessError?.message ?? "Could not save.");
      return null;
    }
    setBusinessId(business.id);
    return business.id;
  }

  async function goNext() {
    setError(null);
    if (step === steps.length - 1) return finish();
    // Create the business row right before the media step so uploads have a valid folder.
    if (step === steps.length - 2 && !businessId) {
      setSaving(true);
      const id = await ensureBusiness();
      setSaving(false);
      if (!id) return;
    }
    setStep(step + 1);
  }

  /** Generates a slug from `name`, retrying with -2/-3/... until it's neither reserved nor taken.
   * `ownId` excludes the business's own (already-inserted) row from the collision check —
   * omit it when generating a slug for a row that doesn't exist yet. */
  async function generateUniqueSlug(name: string, ownId?: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 1;
    for (;;) {
      if (!isReservedSlug(candidate)) {
        let query = supabase.from("businesses").select("id").eq("slug", candidate);
        if (ownId) query = query.neq("id", ownId);
        const { data: taken } = await query.maybeSingle();
        if (!taken) return candidate;
      }
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }

  async function finish() {
    setError(null);
    const id = await ensureBusiness();
    if (!id) return;
    setSaving(true);

    const slug = await generateUniqueSlug(form.name || "Untitled business", id);

    const { error: businessError } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        slug,
        description: form.description,
        categories: form.categories,
        business_types: form.business_types,
        is_eco_friendly: showEco ? form.is_eco_friendly : false,
        whatsapp: form.whatsapp,
        contact_email: form.contact_email,
        instagram_url: form.instagram_url,
        custom_domain: form.custom_domain || null,
        hero_image_url: form.hero_image_url,
        main_video_url: form.main_video_url,
        short_video_urls: form.shorts.filter((s): s is string => !!s).slice(0, 3),
        brand_accent_color: form.accent,
      })
      .eq("id", id);
    if (businessError) {
      setSaving(false);
      return setError(businessError.message);
    }

    if (form.newCategory.trim()) {
      const { error: categoryError } = await supabase
        .from("categories")
        .insert({ name: form.newCategory.trim(), is_approved: false, suggested_by_business_id: id });
      if (categoryError) {
        setSaving(false);
        return setError(categoryError.message);
      }
    }
    if (form.city) {
      const { error: locationError } = await supabase
        .from("locations")
        .insert({ business_id: id, address: form.address, city: form.city, state: form.state, is_primary: true });
      if (locationError) {
        setSaving(false);
        return setError(locationError.message);
      }
    }
    if (form.panIndia || form.delivery.length) {
      const areas: { business_id: string; city: string | null; is_pan_india: boolean }[] =
        form.panIndia
          ? [{ business_id: id, city: null, is_pan_india: true }]
          : form.delivery.map((city) => ({ business_id: id, city, is_pan_india: false }));
      const { error: deliveryError } = await supabase.from("delivery_areas").insert(areas);
      if (deliveryError) {
        setSaving(false);
        return setError(deliveryError.message);
      }
    }
    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({ business_id: id, plan: "base", status: "active" });
    if (subscriptionError) {
      setSaving(false);
      return setError(subscriptionError.message);
    }

    setSaving(false);
    navigate({ to: form.business_types.includes("appointment") ? "/business/setup-staff" : "/dashboard" });
  }

  if (checkingExisting || existingBusiness) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-muted-foreground">
            {existingBusiness ? "Redirecting to your website builder…" : "Loading…"}
          </p>
        </main>
        <SiteFooter />
      </div>
    );
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
              ["custom_domain", "Official website link (optional)"],
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
        </div>
      ),
    },
    {
      title: "Add your photo & videos",
      body: businessId ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Upload a hero image, up to 3 short videos (max 60s / 15MB each) and one main feature
            video (max 3 min / 150MB). These play directly on your page.
          </p>
          <MediaUploader
            businessId={businessId}
            kind="hero"
            value={form.hero_image_url}
            onChange={(path) => set({ hero_image_url: path })}
          />
          <div className="space-y-4">
            <p className="text-sm font-medium">Short videos (up to 3)</p>
            {[0, 1, 2].map((i) => (
              <MediaUploader
                key={i}
                businessId={businessId}
                kind="short"
                value={form.shorts[i] ?? null}
                onChange={(path) => {
                  const shorts = [...form.shorts];
                  shorts[i] = path;
                  set({ shorts });
                }}
              />
            ))}
          </div>
          <MediaUploader
            businessId={businessId}
            kind="main"
            value={form.main_video_url}
            onChange={(path) => set({ main_video_url: path })}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Saving your business…</p>
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
        <Link
          to="/business/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Save & exit
        </Link>
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
            onClick={goNext}
            disabled={saving}
            className="rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : step === steps.length - 1 ? "Finish setup" : "Continue"}
          </button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
