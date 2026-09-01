import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { MediaUploader } from "@/components/media-uploader";
import { type ProfileBusiness } from "@/components/business-profile-preview";
import { BusinessSitePage } from "@/components/website/site-page";
import { BuilderSection, SaveStatus } from "@/components/website-builder/section";
import { GalleryEditor } from "@/components/website-builder/gallery-editor";
import { LocationsEditor } from "@/components/website-builder/locations-editor";
import { SectionListEditor } from "@/components/website-builder/section-list-editor";
import { ACCENT_COLORS, ECO_CATEGORIES } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldError } from "@/components/field-error";
import { buildDefaultSections, type Section } from "@/lib/website-sections";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/website-templates";
import { deriveSitePages, resolveSections, type PageId } from "@/lib/website-pages";
import {
  hasErrors,
  validateBusinessName,
  validateEmail,
  validatePhone,
  validateUrl,
} from "@/lib/website-validation";

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
  template: TemplateId;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type ViewportId = "desktop" | "tablet" | "mobile";

const VIEWPORTS: { id: ViewportId; label: string; icon: string }[] = [
  { id: "desktop", label: "Desktop", icon: "🖥" },
  { id: "tablet", label: "Tablet", icon: "▭" },
  { id: "mobile", label: "Mobile", icon: "📱" },
];

const VIEWPORT_WIDTH: Record<ViewportId, string> = {
  desktop: "w-full",
  tablet: "max-w-[768px]",
  mobile: "max-w-[390px]",
};

/** Patches accepted here are either a subset of Draft's flat fields, or `draft_sections` — the
 * one other column this page autosaves outside the Draft type (see onSectionsChange below). */
type BusinessPatch = Partial<Draft> | { draft_sections: Section[] };

function useAutosaveField(businessId: string | undefined) {
  const [state, setState] = useState<SaveState>("idle");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function commit(patch: BusinessPatch) {
    if (!businessId) return;
    setState("saving");
    const { error } = await supabase.from("businesses").update(patch).eq("id", businessId!);
    setState(error ? "error" : "saved");
  }

  function saveImmediate(patch: BusinessPatch) {
    void commit(patch);
  }

  function saveDebounced(key: string, patch: BusinessPatch) {
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
      const [{ data: business }, { data: locations }, { data: deliveryAreas }, { data: items }, { data: services }, { data: staff }] =
        await Promise.all([
          supabase.from("businesses").select("*").eq("id", businessId!).single(),
          supabase.from("locations").select("*").eq("business_id", businessId!),
          supabase.from("delivery_areas").select("*").eq("business_id", businessId!),
          supabase
            .from("items")
            .select("id,name,description,price,image_url,category,is_active")
            .eq("business_id", businessId!)
            .order("position"),
          supabase
            .from("services")
            .select("id,name,description,price,duration_minutes,category,image_url,is_active")
            .eq("business_id", businessId!)
            .order("position"),
          supabase.from("staff").select("id,name,specializations,slot_duration_minutes").eq("business_id", businessId!),
        ]);
      return {
        business,
        locations: locations ?? [],
        deliveryAreas: deliveryAreas ?? [],
        items: items ?? [],
        services: services ?? [],
        staff: staff ?? [],
      };
    },
  });
}

function WebsiteBuilder() {
  const { data: dashboardBusiness } = useDashboardBusiness();
  const businessId = dashboardBusiness?.id;
  const { data, isLoading } = useBusinessDraft(businessId);
  const queryClient = useQueryClient();
  const { state: saveState, saveImmediate, saveDebounced } = useAutosaveField(businessId);

  const [draft, setDraft] = useState<Draft | null>(null);
  // Section layout is a separate save cycle from the flat fields above: it's staged in
  // draft_sections and only becomes publicly visible (copied into `sections`) on Publish, so a
  // business can rearrange their page without it going live mid-edit.
  const [draftSections, setDraftSections] = useState<Section[] | null>(null);
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [previewPage, setPreviewPage] = useState<PageId>("home");
  const [publishState, setPublishState] = useState<SaveState>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const sectionsSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
        template: (b.template as TemplateId) ?? "editorial",
      });
      const existing = (b.draft_sections as Section[] | null)?.length
        ? (b.draft_sections as Section[])
        : (b.sections as Section[] | null)?.length
          ? (b.sections as Section[])
          : buildDefaultSections({ business_types: b.business_types, items: { length: data.items.length } });
      setDraftSections(existing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.business]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("id,name").eq("is_approved", true).order("name")).data ?? [],
  });

  if (!businessId || isLoading || !draft || !draftSections) {
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

  /** Always updates the local draft so typing feels normal, but only persists a value that
   * passes validation — an invalid email or a blank business name stays visible with its error
   * rather than being silently written to the live record. */
  function onTextChange(key: keyof Draft, value: string, error?: string | null) {
    patch({ [key]: value } as Partial<Draft>);
    if (error) return;
    saveDebounced(key, { [key]: value } as Partial<Draft>);
  }

  function onImmediateChange(fields: Partial<Draft>) {
    patch(fields);
    saveImmediate(fields);
  }

  function onSectionsChange(next: Section[]) {
    setDraftSections(next);
    if (sectionsSaveTimer.current) clearTimeout(sectionsSaveTimer.current);
    sectionsSaveTimer.current = setTimeout(() => {
      saveImmediate({ draft_sections: next });
    }, 400);
  }

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const showEco = draft.categories.some((c) => ECO_CATEGORIES.includes(c));
  const status = data?.business?.status ?? "draft";
  const slug = data?.business?.slug ?? null;
  const isPubliclyLive = status === "live";

  // Recomputed on every keystroke from the draft itself, so an error clears the moment the
  // owner fixes the field rather than waiting for a save round-trip.
  const fieldErrors = {
    name: validateBusinessName(draft.name),
    whatsapp: validatePhone(draft.whatsapp),
    contact_email: validateEmail(draft.contact_email),
    instagram_url: validateUrl(draft.instagram_url),
  };
  const blocked = hasErrors(fieldErrors);

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
    brand_secondary_color: data?.business?.brand_secondary_color ?? null,
    button_style: data?.business?.button_style ?? null,
    is_eco_friendly: showEco ? draft.is_eco_friendly : false,
    operating_hours: (data?.business?.operating_hours as ProfileBusiness["operating_hours"]) ?? null,
    sections: draftSections,
    template: draft.template,
    review_count: data?.business?.review_count ?? 0,
    review_avg: data?.business?.review_avg ?? null,
    reviews: [],
    owner_email_verified: data?.business?.owner_email_verified ?? false,
    locations: data?.locations ?? [],
    delivery_areas: data?.deliveryAreas ?? [],
    items: data?.items ?? [],
    services: data?.services ?? [],
    staff: data?.staff ?? [],
  };

  // Same derivation the public nav uses, fed the *draft* — so hiding a section or adding a
  // product changes the previewable page list immediately, exactly as it will once published.
  const previewPages = deriveSitePages({ ...previewBusiness, sections: resolveSections(previewBusiness) });
  const activePreviewPage = previewPages.some((p) => p.id === previewPage) ? previewPage : "home";

  async function publish() {
    if (!draft || !draftSections) return;
    setPublishState("saving");
    setPublishError(null);
    const patch: { sections: Section[]; draft_sections: Section[]; template: TemplateId; status?: "live" } = {
      sections: draftSections,
      draft_sections: draftSections,
      template: draft.template,
    };
    // Publishing website content never changes whether the business is publicly listed —
    // that's a separate admin-approval step. Only flip live once already approved; otherwise
    // this just saves the layout so it's ready the moment approval lands.
    if (status === "approved") patch.status = "live";
    const { error } = await supabase.from("businesses").update(patch).eq("id", businessId!);
    if (error) {
      setPublishState("error");
      setPublishError(error.message);
      return;
    }
    setPublishState("saved");
    void queryClient.invalidateQueries({ queryKey: ["website-builder-business", businessId] });
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
            disabled={publishState === "saving" || blocked}
            title={blocked ? "Fix the highlighted fields first" : undefined}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {publishState === "saving" ? "Saving…" : status === "live" || status === "approved" ? "Publish Website" : "Save Website"}
          </button>
        </div>
      </div>
      {blocked && (
        <p className="px-4 pt-3 text-sm text-destructive">
          Fix the highlighted fields in the editor before publishing.
        </p>
      )}
      {publishError && <p className="px-4 pt-3 text-sm text-destructive">{publishError}</p>}
      {publishState === "saved" && !publishError && (
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          {status === "approved"
            ? "Your website is now live."
            : status === "live"
              ? "Your changes are live."
              : "Saved — your website will go live once your business listing is approved."}
        </p>
      )}
      {publishState !== "saved" && status !== "live" && status !== "approved" && (
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          Your business listing is {status === "pending" ? "awaiting approval" : "still in draft"} — you can keep
          building your website now, and it goes live as soon as it's approved.
        </p>
      )}

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Editor */}
        <aside className="w-full shrink-0 border-b border-border bg-card lg:w-[320px] lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <BuilderSection title="Template" subtitle="Pick a look for your website. Your content stays the same either way." defaultOpen>
            <div className="grid grid-cols-2 gap-2.5">
              {TEMPLATE_LIST.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onImmediateChange({ template: t.id })}
                  className={`rounded-md border p-2.5 text-left transition-colors ${
                    draft.template === t.id ? "border-accent bg-accent-soft" : "border-border hover:border-accent/60"
                  }`}
                >
                  <span
                    className="block h-10 w-full rounded-sm"
                    style={{ background: `linear-gradient(135deg, ${t.previewSurface}, ${t.previewAccent})` }}
                  />
                  <span className="mt-2 block text-xs font-medium">{t.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{t.suitedFor}</span>
                </button>
              ))}
            </div>
          </BuilderSection>

          <BuilderSection title="Page Layout" subtitle="Add, hide, reorder or edit the sections of your website.">
            <SectionListEditor sections={draftSections} onChange={onSectionsChange} items={(data?.items ?? []).map((i) => ({ id: i.id, name: i.name }))} />
          </BuilderSection>

          <BuilderSection title="Main Video" subtitle="Upload a single video for your website.">
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
              onChange={(e) => onTextChange("name", e.target.value, validateBusinessName(e.target.value))}
              placeholder="Business name"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "err-name" : undefined}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                fieldErrors.name ? "border-destructive" : "border-border"
              }`}
            />
            <span id="err-name">
              <FieldError message={fieldErrors.name} />
            </span>
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

          <BuilderSection
            title="Products & Services"
            subtitle={`${data?.items?.length ?? 0} product(s) · ${data?.services?.length ?? 0} service(s)`}
          >
            <Link
              to="/business/dashboard/products"
              className="inline-block rounded-md border border-accent px-4 py-2.5 text-sm"
            >
              Go to Products →
            </Link>
            <Link
              to="/business/dashboard/services"
              className="inline-block rounded-md border border-accent px-4 py-2.5 text-sm"
            >
              Go to Services →
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
              onChange={(e) => onTextChange("whatsapp", e.target.value, validatePhone(e.target.value))}
              placeholder="WhatsApp number"
              inputMode="tel"
              aria-invalid={!!fieldErrors.whatsapp}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                fieldErrors.whatsapp ? "border-destructive" : "border-border"
              }`}
            />
            <FieldError message={fieldErrors.whatsapp} />
            <input
              value={draft.contact_email ?? ""}
              onChange={(e) => onTextChange("contact_email", e.target.value, validateEmail(e.target.value))}
              placeholder="Contact email"
              inputMode="email"
              aria-invalid={!!fieldErrors.contact_email}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                fieldErrors.contact_email ? "border-destructive" : "border-border"
              }`}
            />
            <FieldError message={fieldErrors.contact_email} />
            <input
              value={draft.instagram_url ?? ""}
              onChange={(e) => onTextChange("instagram_url", e.target.value, validateUrl(e.target.value))}
              placeholder="Instagram link"
              inputMode="url"
              aria-invalid={!!fieldErrors.instagram_url}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                fieldErrors.instagram_url ? "border-destructive" : "border-border"
              }`}
            />
            <FieldError message={fieldErrors.instagram_url} />
            <LocationsEditor businessId={businessId} />
          </BuilderSection>
        </aside>

        {/* Live preview */}
        <div className="flex min-w-0 flex-1 flex-col bg-secondary/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
            <div className="flex items-center gap-1">
              {VIEWPORTS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewport(v.id)}
                  aria-label={`${v.label} preview`}
                  aria-pressed={viewport === v.id}
                  className={`rounded-md border px-2.5 py-1.5 text-xs ${
                    viewport === v.id ? "border-accent bg-accent-soft" : "border-border"
                  }`}
                >
                  {v.icon}
                </button>
              ))}
            </div>
            {isPubliclyLive && slug ? (
              <a
                href={`https://${slug}.luvlit.in/`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-accent"
              >
                Open live site ↗
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">Not published yet</span>
            )}
          </div>

          {/* Page switcher — exactly the pages this business's nav will show, from the same
              deriveSitePages() the public site uses, so previewing can't show a page visitors
              won't get (or miss one they will). */}
          <div className="flex flex-wrap gap-1 border-b border-border bg-card px-4 py-2">
            {previewPages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreviewPage(p.id)}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  activePreviewPage === p.id
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="border-b border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
            Live preview of your unsaved changes — press {status === "live" || status === "approved" ? "Publish" : "Save"}{" "}
            to apply them to your real site.
          </p>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div
              className={`mx-auto overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-all ${VIEWPORT_WIDTH[viewport]}`}
            >
              <BusinessSitePage business={previewBusiness} page={activePreviewPage} preview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
