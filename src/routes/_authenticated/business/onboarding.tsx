import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LuvLitLogo } from "@/components/luvlit-logo";
import { HeroMediaUploader, MediaUploader } from "@/components/media-uploader";
import { GalleryEditor } from "@/components/website-builder/gallery-editor";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { ACCENT_COLORS, BUSINESS_TYPES, CITIES, ECO_CATEGORIES } from "@/lib/constants";
import { normalizeUsername, USERNAME_FORMAT_HINT } from "@/lib/username";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { UsernameStatusLine } from "@/components/username-status";
import { StepProgress } from "@/components/onboarding/step-progress";
import {
  CategoriesStepArt,
  ColorStepArt,
  ContactStepArt,
  DeliveryStepArt,
  DomainStepArt,
  LocationStepArt,
  MediaStepArt,
  NameStepArt,
  TypeStepArt,
} from "@/components/onboarding/onboarding-illustrations";

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

// The business row has to exist before uploads (hero, thumbnail, gallery, shorts) have
// somewhere to point — created right before this step, same as before the visual redesign.
const MEDIA_STEP_INDEX = 6;

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-3.5 text-[0.9375rem] text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "block text-sm font-medium text-foreground";
const chipClass = (active: boolean) =>
  `rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ${
    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground hover:border-primary/40"
  }`;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

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
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    name: "",
    description: "",
    categories: [] as string[],
    newCategory: "",
    business_types: [] as string[],
    is_eco_friendly: false,
    address: "",
    city: "",
    state: "",
    pincode: "",
    delivery: [] as string[],
    panIndia: false,
    whatsapp: "",
    contact_email: "",
    instagram_url: "",
    custom_domain: "",
    hero_image_url: null as string | null,
    main_video_url: null as string | null,
    thumbnail_url: null as string | null,
    gallery_urls: [] as string[],
    shorts: [] as (string | null)[],
    accent: ACCENT_COLORS[0].value,
  });
  const reducedMotion = useReducedMotion();
  // Excludes the business's own row once it exists, so re-checking an unchanged username (e.g.
  // after navigating Back to step 1 post-creation) doesn't report itself as taken.
  const usernameAvailability = useUsernameAvailability(form.username, businessId ?? undefined);
  const usernameReady = usernameAvailability.status === "available";

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
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        owner_id: ownerId,
        name: form.name || "Untitled business",
        slug: normalizeUsername(form.username),
        description: form.description,
        categories: form.categories,
        business_types: form.business_types,
        is_eco_friendly: showEco ? form.is_eco_friendly : false,
        brand_accent_color: form.accent,
      })
      .select("id")
      .single();
    if (businessError || !business) {
      // Postgres unique-violation: someone else claimed this exact username between the last
      // live availability check and this submit — a genuine race, not a bug.
      setError(
        businessError?.code === "23505"
          ? "That username was just taken by someone else. Go back to step 1 and choose another."
          : (businessError?.message ?? "Could not save."),
      );
      return null;
    }
    setBusinessId(business.id);
    return business.id;
  }

  async function goNext() {
    setError(null);
    if (step === steps.length - 1) return finish();
    // Create the business row right before the media step so uploads have a valid folder.
    if (step === MEDIA_STEP_INDEX - 1 && !businessId) {
      setSaving(true);
      const id = await ensureBusiness();
      setSaving(false);
      if (!id) return;
    }
    setDirection(1);
    setStep(step + 1);
  }

  function goBack() {
    setDirection(-1);
    setStep(step - 1);
  }

  async function finish() {
    setError(null);
    const id = await ensureBusiness();
    if (!id) return;
    setSaving(true);

    const { error: businessError } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        slug: normalizeUsername(form.username),
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
        thumbnail_url: form.thumbnail_url,
        gallery_urls: form.gallery_urls,
        short_video_urls: form.shorts.filter((s): s is string => !!s).slice(0, 3),
        brand_accent_color: form.accent,
      })
      .eq("id", id);
    if (businessError) {
      setSaving(false);
      return setError(
        businessError.code === "23505"
          ? "That username was just taken by someone else. Go back to step 1 and choose another."
          : businessError.message,
      );
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
        .insert({
          business_id: id,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode || null,
          is_primary: true,
        });
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf6]">
        <p className="text-sm text-muted-foreground">
          {existingBusiness ? "Redirecting to your website builder…" : "Loading…"}
        </p>
      </div>
    );
  }

  const steps = [
    {
      title: "What's your business called?",
      subtitle: "Let's start with the basics.",
      art: <NameStepArt />,
      body: (
        <div className="space-y-5">
          <div className="space-y-2">
            <span className={labelClass}>Username</span>
            <div
              className={`flex items-stretch overflow-hidden rounded-xl border bg-white transition-colors duration-150 ${
                usernameAvailability.status === "invalid" || usernameAvailability.status === "taken"
                  ? "border-destructive"
                  : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
              }`}
            >
              <input
                value={form.username}
                onChange={(e) => set({ username: e.target.value })}
                placeholder="alora"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={usernameAvailability.status === "invalid" || usernameAvailability.status === "taken"}
                className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-[0.9375rem] text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <span className="flex items-center border-l border-border bg-secondary/60 px-3.5 text-[0.9375rem] text-muted-foreground">
                .luvlit.in
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{USERNAME_FORMAT_HINT}</p>
            <UsernameStatusLine state={usernameAvailability} username={normalizeUsername(form.username)} />
          </div>
          <Field label="Business name">
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Alora Gifts"
              className={inputClass}
            />
          </Field>
          <Field label="Describe what you do">
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="e.g. We create and curate beautiful gift hampers, return gifts, and personalised creations for every occasion."
              className={inputClass}
            />
          </Field>
        </div>
      ),
    },
    {
      title: "What do you do?",
      subtitle: "Select categories that best describe your business.",
      art: <CategoriesStepArt />,
      body: (
        <div className="space-y-5">
          <div>
            <p className={labelClass}>Categories</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(categories ?? []).map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => set({ categories: toggle(form.categories, c.name) })}
                  className={chipClass(form.categories.includes(c.name))}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <Field label="Category not listed? Add your own">
            <input
              value={form.newCategory}
              onChange={(e) => set({ newCategory: e.target.value })}
              placeholder="Type your category"
              className={inputClass}
            />
          </Field>
          {showEco && (
            <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-white p-5 text-sm">
              <span>Is your business eco-friendly / sustainable?</span>
              <input
                type="checkbox"
                checked={form.is_eco_friendly}
                onChange={(e) => set({ is_eco_friendly: e.target.checked })}
                className="size-5 accent-primary"
              />
            </label>
          )}
        </div>
      ),
    },
    {
      title: "How do customers buy from you?",
      subtitle: "Select all that apply.",
      art: <TypeStepArt />,
      body: (
        <div className="space-y-3">
          {BUSINESS_TYPES.map((t) => {
            const active = form.business_types.includes(t.value);
            return (
              <button
                type="button"
                key={t.value}
                onClick={() => set({ business_types: toggle(form.business_types, t.value) })}
                className={`flex w-full items-start justify-between gap-4 rounded-xl border p-5 text-left transition-colors duration-150 ${
                  active ? "border-primary bg-accent-soft" : "border-border bg-white hover:border-primary/30"
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">{t.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.hint}</p>
                </div>
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 text-[0.625rem] ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {active ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Where are you based?",
      subtitle: "Add your business location.",
      art: <LocationStepArt />,
      body: (
        <div className="space-y-5">
          <Field label="Address">
            <input
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
              placeholder="e.g. 123, MG Road, Near City Centre"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <select value={form.city} onChange={(e) => set({ city: e.target.value })} className={inputClass}>
                <option value="">Select city</option>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="State">
              <input
                value={form.state}
                onChange={(e) => set({ state: e.target.value })}
                placeholder="e.g. Kerala"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="PIN code">
            <input
              value={form.pincode}
              onChange={(e) => set({ pincode: e.target.value })}
              placeholder="e.g. 682001"
              inputMode="numeric"
              className={inputClass}
            />
          </Field>
        </div>
      ),
    },
    {
      title: "Where do you deliver or serve?",
      subtitle: "Choose the areas you deliver or serve.",
      art: <DeliveryStepArt />,
      body: (
        <div className="space-y-5">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 text-sm">
            <input
              type="checkbox"
              checked={form.panIndia}
              onChange={(e) => set({ panIndia: e.target.checked })}
              className="size-5 accent-primary"
            />
            I deliver / serve all of India
          </label>
          {!form.panIndia && (
            <div>
              <p className={labelClass}>Or select cities</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => set({ delivery: toggle(form.delivery, c) })}
                    className={chipClass(form.delivery.includes(c))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "How can people reach you?",
      subtitle: "Add your contact details.",
      art: <ContactStepArt />,
      body: (
        <div className="space-y-5">
          {(
            [
              ["whatsapp", "WhatsApp number", "+91 98765 43210"],
              ["contact_email", "Email address", "hello@yourbusiness.com"],
              ["instagram_url", "Instagram link", "instagram.com/yourbusiness"],
            ] as const
          ).map(([key, label, placeholder]) => (
            <Field key={key} label={label}>
              <input
                value={form[key]}
                onChange={(e) => set({ [key]: e.target.value } as Partial<typeof form>)}
                placeholder={placeholder}
                className={inputClass}
              />
            </Field>
          ))}
        </div>
      ),
    },
    {
      title: "Add your photos & videos",
      subtitle: "Showcase your business with photos and videos.",
      art: <MediaStepArt />,
      body: businessId ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={labelClass}>Business thumbnail</p>
              <p className="mt-1 text-xs text-muted-foreground">This will appear on LuvLit cards and search results.</p>
              <div className="mt-3">
                <MediaUploader
                  businessId={businessId}
                  kind="thumbnail"
                  value={form.thumbnail_url}
                  onChange={(path) => set({ thumbnail_url: path })}
                  wrapperClassName="rounded-xl border border-border bg-white p-4"
                />
              </div>
            </div>
            <div>
              <p className={labelClass}>Website hero (image or video)</p>
              <p className="mt-1 text-xs text-muted-foreground">This appears on your website only.</p>
              <div className="mt-3">
                <HeroMediaUploader
                  businessId={businessId}
                  value={{ image: form.hero_image_url, video: form.main_video_url }}
                  onChange={({ image, video }) => set({ hero_image_url: image, main_video_url: video })}
                  wrapperClassName="rounded-xl border border-border bg-white p-4"
                />
              </div>
            </div>
          </div>
          <div>
            <p className={labelClass}>Gallery (up to 6 images)</p>
            <div className="mt-3 rounded-xl border border-border bg-white p-4">
              <GalleryEditor
                businessId={businessId}
                value={form.gallery_urls}
                onSaved={(urls) => set({ gallery_urls: urls })}
              />
            </div>
          </div>
          <div>
            <p className={labelClass}>Short videos (up to 3)</p>
            <p className="mt-1 text-xs text-muted-foreground">Max 60s / 15MB each.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                  wrapperClassName="rounded-xl border border-border bg-white p-4"
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Saving your business…</p>
      ),
    },
    {
      title: "Make your page yours",
      subtitle: "Choose an accent colour for your business page.",
      art: <ColorStepArt />,
      body: (
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map((c) => {
            const active = form.accent === c.value;
            return (
              <button
                type="button"
                key={c.value}
                onClick={() => set({ accent: c.value })}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs transition-colors duration-150 ${
                  active ? "border-primary bg-accent-soft" : "border-border bg-white hover:border-primary/30"
                }`}
              >
                <span
                  className={`relative flex size-9 items-center justify-center rounded-full ${active ? "ring-2 ring-primary ring-offset-2" : ""}`}
                  style={{ backgroundColor: c.value }}
                >
                  {active && <span className="size-1.5 rounded-full bg-white" />}
                </span>
                <span className="font-medium text-foreground">{c.name}</span>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Connect your domain",
      subtitleNode: (
        <>
          Use your own domain for your business website. <span className="text-muted-foreground/70">(optional)</span>
        </>
      ),
      art: <DomainStepArt />,
      body: (
        <div className="space-y-4">
          <Field label="Your domain">
            <input
              value={form.custom_domain}
              onChange={(e) => set({ custom_domain: e.target.value })}
              placeholder="yourdomain.com"
              className={inputClass}
            />
          </Field>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-1 rounded-full bg-primary" />
              You can always connect your domain later from settings.
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1 rounded-full bg-primary" />
              We'll help you with the setup.
            </li>
          </ul>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLastStep = step === steps.length - 1;
  const slideOffset = reducedMotion ? 0 : 28;

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfaf6]">
      <header className="px-6 py-6 sm:px-10">
        <Link to="/" className="inline-flex items-center gap-2 text-primary">
          <LuvLitLogo className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-editorial">LuvLit</span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 pb-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_40px_100px_-48px_rgba(31,60,47,0.25)] lg:grid lg:grid-cols-2">
          <div className="hidden items-center justify-center bg-[#fbfaf6] p-10 lg:flex">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction * slideOffset }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * slideOffset }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-full"
              >
                {current.art}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col p-6 sm:p-10 lg:p-12">
            <StepProgress step={step} total={steps.length} />
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Step {step + 1} of {steps.length}
            </p>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction * slideOffset }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * slideOffset }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <h1 className="mt-2 text-2xl font-medium tracking-tight text-foreground sm:text-[1.75rem]">
                  {current.title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {"subtitleNode" in current ? current.subtitleNode : current.subtitle}
                </p>
                <div className="mt-7">{current.body}</div>
              </motion.div>
            </AnimatePresence>

            {error && <p className="mt-5 text-sm text-destructive">{error}</p>}

            <div className="mt-8 flex items-center gap-2 sm:gap-3">
              {step > 0 && (
                <button
                  onClick={goBack}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary sm:px-5"
                >
                  <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  Back
                </button>
              )}
              <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
                {isLastStep && (
                  <button
                    onClick={finish}
                    disabled={saving}
                    className="flex min-h-11 items-center whitespace-nowrap px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60 sm:px-5"
                  >
                    Skip for now
                  </button>
                )}
                <button
                  onClick={goNext}
                  disabled={saving || (step === 0 && !usernameReady)}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:px-6"
                >
                  {saving ? "Saving…" : isLastStep ? "Finish" : "Next"}
                  {!saving && <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">You can always update these details later from your dashboard.</p>
      </main>
    </div>
  );
}
