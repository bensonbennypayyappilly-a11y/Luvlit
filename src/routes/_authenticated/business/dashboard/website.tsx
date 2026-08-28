import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { MediaUploader } from "@/components/media-uploader";
import { BusinessProfilePreview, type ProfileBusiness } from "@/components/business-profile-preview";
import { BuilderSection, SaveStatus } from "@/components/website-builder/section";
import { GalleryEditor } from "@/components/website-builder/gallery-editor";
import { LocationsEditor } from "@/components/website-builder/locations-editor";
import { ACCENT_COLORS, ECO_CATEGORIES } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/business/dashboard/website")({
  head: () => ({
    meta: [
      { title: "Website builder — Business dashboard — LuvLit" },
      {
        name: "description",
        content: "Edit your LuvLit business page — photos, videos, gallery, colours and contact details — with a live preview.",
      },
      { property: "og:title", content: "Website builder — Business dashboard — LuvLit" },
      { property: "og:description", content: "Build and preview your LuvLit business page." },
    ],
  }),
  component: WebsiteBuilder,
});

type Draft = {
  name: string;
  description: string | null;
  categories: string[];
  business_types: string[];
  is_eco_friendly: boolean;
  hero_image_url: string | null;
  logo_url: string | null;
  main_video_url: string | null;
  gallery_urls: string[];
  short_video_urls: string[];
  brand_accent_color: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  instagram_url: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function useAutosaveField(businessId: string | undefined) {
  const [state, setState] = useState<SaveState>("idle");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function commit(patch: Partial<Draft>) {
    if (!businessId) return;
    setState("saving");
    const { error } = await supabase.from("businesses").update(patch).eq("id", businessId!);
    setState(error ? "error" : "saved");
  }

  function saveImmediate(patch: Partial<Draft>) {
    void commit(patch);
  }

  function saveDebounced(key: string, patch: Partial<Draft>) {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => commit(patch), 600);
  }

  return { state, saveImmediate, saveDebounced };
}

function useBusinessDraft(businessId: string | undefined) {
  return useQuery({
    queryKey: ["website-builder-business", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const [{ data: business }, { data: locations }, { data: deliveryAreas }, { data: items }] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", businessId!).single(),
        supabase.from("locations").select("*").eq("business_id", businessId!),
        supabase.from("delivery_areas").select("*").eq("business_id", businessId!),
        supabase.from("items").select("id,name,description,price,image_url,is_active").eq("business_id", businessId!),
      ]);
      return { business, locations: locations ?? [], deliveryAreas: deliveryAreas ?? [], items: items ?? [] };
    },
  });
}

function WebsiteBuilder() {
  const { data: dashboardBusiness } = useDashboardBusiness();
  const businessId = dashboardBusiness?.id;
  const { data, isLoading } = useBusinessDraft(businessId);
  const { state: saveState, saveImmediate, saveDebounced } = useAutosaveField(businessId);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [publishState, setPublishState] = useState<SaveState>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.business && !draft) {
      const b = data.business;
      setDraft({
        name: b.name,
        description: b.description,
        categories: b.categories ?? [],
        business_types: b.business_types ?? [],
        is_eco_friendly: b.is_eco_friendly,
        hero_image_url: b.hero_image_url,
        logo_url: b.logo_url,
        main_video_url: b.main_video_url,
        gallery_urls: b.gallery_urls ?? [],
        short_video_urls: b.short_video_urls ?? [],
        brand_accent_color: b.brand_accent_color,
        whatsapp: b.whatsapp,
        contact_email: b.contact_email,
        instagram_url: b.instagram_url,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.business]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("id,name").eq("is_approved", true).order("name")).data ?? [],
  });

  if (!businessId || isLoading || !draft) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6 lg:flex-row">
        <div className="w-full space-y-3 lg:w-[320px]">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-96 flex-1" />
      </div>
    );
  }

  function patch(fields: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...fields } : d));
  }

  function onTextChange(key: keyof Draft, value: string) {
    patch({ [key]: value } as Partial<Draft>);
    saveDebounced(key, { [key]: value } as Partial<Draft>);
  }

  function onImmediateChange(fields: Partial<Draft>) {
    patch(fields);
    saveImmediate(fields);
  }

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const showEco = draft.categories.some((c) => ECO_CATEGORIES.includes(c));

  const previewBusiness: ProfileBusiness = {
    id: businessId,
    name: draft.name,
    description: draft.description,
    categories: draft.categories,
    business_types: draft.business_types,
    instagram_url: draft.instagram_url,
    whatsapp: draft.whatsapp,
    contact_email: draft.contact_email,
    hero_image_url: draft.hero_image_url,
    logo_url: draft.logo_url,
    gallery_urls: draft.gallery_urls,
    main_video_url: draft.main_video_url,
    short_video_urls: draft.short_video_urls,
    brand_accent_color: draft.brand_accent_color,
    is_eco_friendly: showEco ? draft.is_eco_friendly : false,
    locations: data?.locations ?? [],
    delivery_areas: data?.deliveryAreas ?? [],
    items: data?.items ?? [],
  };

  async function publish() {
    setPublishState("saving");
    setPublishError(null);
    const { error } = await supabase.from("businesses").update({ is_live: true }).eq("id", businessId!);
    if (error) {
      setPublishState("error");
      setPublishError(error.message);
      return;
    }
    setPublishState("saved");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
        <Link to="/business/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← My Website
        </Link>
        <div className="flex items-center gap-3">
          <SaveStatus state={saveState} />
          <button
            type="button"
            onClick={publish}
            disabled={publishState === "saving"}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {publishState === "saving" ? "Publishing…" : "Publish Website"}
          </button>
        </div>
      </div>
      {publishError && <p className="px-4 pt-3 text-sm text-destructive">{publishError}</p>}
      {publishState === "saved" && !publishError && (
        <p className="px-4 pt-3 text-xs text-muted-foreground">Your website is live.</p>
      )}

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Editor */}
        <aside className="w-full shrink-0 border-b border-border bg-card lg:w-[320px] lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <BuilderSection title="Main Video" subtitle="Upload a single video for your website." defaultOpen>
            <MediaUploader
              businessId={businessId}
              kind="main"
              value={draft.main_video_url}
              onChange={(path) => onImmediateChange({ main_video_url: path })}
            />
          </BuilderSection>

          <BuilderSection title="Main Image" subtitle="This is the hero image at the top of your page.">
            <MediaUploader
              businessId={businessId}
              kind="hero"
              value={draft.hero_image_url}
              onChange={(path) => onImmediateChange({ hero_image_url: path })}
            />
            <MediaUploader
              businessId={businessId}
              kind="logo"
              value={draft.logo_url}
              onChange={(path) => onImmediateChange({ logo_url: path })}
            />
          </BuilderSection>

          <BuilderSection title="Gallery" subtitle="Up to 6 photos showcasing your work.">
            <GalleryEditor
              businessId={businessId}
              value={draft.gallery_urls}
              onSaved={(urls) => patch({ gallery_urls: urls })}
            />
          </BuilderSection>

          <BuilderSection title="About Your Business" subtitle="Name, description, categories and business type.">
            <input
              value={draft.name}
              onChange={(e) => onTextChange("name", e.target.value)}
              placeholder="Business name"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <textarea
              rows={3}
              value={draft.description ?? ""}
              onChange={(e) => onTextChange("description", e.target.value)}
              placeholder="Describe what you do"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {(categories ?? []).map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => onImmediateChange({ categories: toggle(draft.categories, c.name) })}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    draft.categories.includes(c.name) ? "border-accent bg-accent-soft" : "border-border"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {["product", "appointment", "custom"].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => onImmediateChange({ business_types: toggle(draft.business_types, t) })}
                  className={`rounded-full border px-3 py-1.5 text-xs capitalize ${
                    draft.business_types.includes(t) ? "border-accent bg-accent-soft" : "border-border"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {showEco && (
              <label className="flex items-center justify-between rounded-md border border-border p-4 text-sm">
                <span>Eco-friendly / sustainable?</span>
                <input
                  type="checkbox"
                  checked={draft.is_eco_friendly}
                  onChange={(e) => onImmediateChange({ is_eco_friendly: e.target.checked })}
                />
              </label>
            )}
          </BuilderSection>

          <BuilderSection title="Products/Services" subtitle="Manage your catalogue in Products.">
            <Link
              to="/business/dashboard/products"
              className="inline-block rounded-md border border-accent px-4 py-2.5 text-sm"
            >
              Go to Products →
            </Link>
          </BuilderSection>

          <BuilderSection title="Book Appointments" subtitle="Manage staff & availability there.">
            <Link
              to="/business/dashboard/staff"
              className="inline-block rounded-md border border-accent px-4 py-2.5 text-sm"
            >
              Go to Staff & Availability →
            </Link>
          </BuilderSection>

          <BuilderSection title="Website Settings" subtitle="Colour, contact info, locations & delivery.">
            <div>
              <p className="text-sm font-medium">Brand accent colour</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ACCENT_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => onImmediateChange({ brand_accent_color: c.value })}
                    title={c.name}
                    className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                      draft.brand_accent_color === c.value ? "border-accent" : "border-border"
                    }`}
                  >
                    <span className="size-4 rounded-full" style={{ backgroundColor: c.value }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={draft.whatsapp ?? ""}
              onChange={(e) => onTextChange("whatsapp", e.target.value)}
              placeholder="WhatsApp number"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={draft.contact_email ?? ""}
              onChange={(e) => onTextChange("contact_email", e.target.value)}
              placeholder="Contact email"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={draft.instagram_url ?? ""}
              onChange={(e) => onTextChange("instagram_url", e.target.value)}
              placeholder="Instagram link"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <LocationsEditor businessId={businessId} />
          </BuilderSection>
        </aside>

        {/* Live preview */}
        <div className="flex flex-1 flex-col bg-secondary/30">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                aria-label="Desktop preview"
                className={`rounded-md border px-2.5 py-1.5 text-xs ${
                  viewport === "desktop" ? "border-accent bg-accent-soft" : "border-border"
                }`}
              >
                🖥
              </button>
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                aria-label="Mobile preview"
                className={`rounded-md border px-2.5 py-1.5 text-xs ${
                  viewport === "mobile" ? "border-accent bg-accent-soft" : "border-border"
                }`}
              >
                📱
              </button>
            </div>
            <a
              href={`/business/${businessId}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border px-3 py-1.5 text-xs"
            >
              Preview ↗
            </a>
          </div>
          <p className="border-b border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
            The "Preview" tab shows your last-saved / published page, not unsaved draft changes.
          </p>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div
              className={`mx-auto overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-all ${
                viewport === "mobile" ? "max-w-[390px]" : "w-full"
              }`}
            >
              <BusinessProfilePreview business={previewBusiness} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
