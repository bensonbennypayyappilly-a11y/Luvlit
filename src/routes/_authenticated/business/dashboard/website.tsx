import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { HeroMediaUploader, MediaUploader } from "@/components/media-uploader";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { type ProfileBusiness } from "@/components/business-profile-preview";
import { BusinessSitePage } from "@/components/website/site-page";
import { BuilderSection, SaveStatus } from "@/components/website-builder/section";
import { ColorField } from "@/components/website-builder/color-field";
import { GalleryEditor } from "@/components/website-builder/gallery-editor";
import { LocationsEditor } from "@/components/website-builder/locations-editor";
import { SectionListEditor } from "@/components/website-builder/section-list-editor";
import { PagesEditor } from "@/components/website-builder/pages-editor";
import type { SitePageRecord } from "@/lib/public.types";
import { ACCENT_COLORS, ECO_CATEGORIES } from "@/lib/constants";
import { normalizeUsername, USERNAME_FORMAT_HINT } from "@/lib/username";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { UsernameStatusLine } from "@/components/username-status";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldError } from "@/components/field-error";
import { buildDefaultSections, newSection, type Section } from "@/lib/website-sections";
import { Switch } from "@/components/ui/switch";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/website-templates";
import { deriveSitePages, pagesForEditing, resolvePages, resolveSections, type PageId } from "@/lib/website-pages";
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
  slug: string;
  name: string;
  description: string | null;
  categories: string[];
  business_types: string[];
  is_eco_friendly: boolean;
  hero_image_url: string | null;
  about_image_url: string | null;
  about_text: string | null;
  logo_url: string | null;
  main_video_url: string | null;
  gallery_urls: string[];
  short_video_urls: string[];
  brand_accent_color: string | null;
  background_color: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  custom_domain: string | null;
  template: TemplateId;
  corner_style: string | null;
  density: string | null;
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
type BusinessPatch = Partial<Draft> | { draft_sections: Section[] } | { draft_pages: SitePageRecord[] };

function useAutosaveField(businessId: string | undefined) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const queryClient = useQueryClient();

  async function commit(patch: BusinessPatch) {
    if (!businessId) return;
    setState("saving");
    const { error: saveError } = await supabase.from("businesses").update(patch).eq("id", businessId!);
    setError(saveError?.message ?? null);
    setState(saveError ? "error" : "saved");
    // Profile & Media (and the dashboard sidebar/Overview) read several of the same fields this
    // saves — gallery, short videos, contact links — so they'd otherwise show stale data until a
    // hard refresh, same bug this mirrors the fix for on the Profile & Media side.
    if (!saveError) {
      queryClient.invalidateQueries({ queryKey: ["dashboard-profile-full", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-business"] });
    }
  }

  function saveImmediate(patch: BusinessPatch) {
    void commit(patch);
  }

  function saveDebounced(key: string, patch: BusinessPatch) {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => commit(patch), 600);
  }

  return { state, error, saveImmediate, saveDebounced };
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
            .select("id,slug,name,description,price,image_url,category,is_active")
            .eq("business_id", businessId!)
            .order("position"),
          supabase
            .from("services")
            .select("id,slug,name,description,price,duration_minutes,category,image_url,is_active")
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

/** A "manage this elsewhere, toggle it here" row — shared by Products, Services and Book
 * Appointments, which all point at their own dedicated page but still need a quick on/off for
 * whether that content shows on the public site. */
function ManageLinkRow({
  to,
  label,
  count,
  visible,
  onToggle,
}: {
  to: string;
  label: string;
  count?: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#EEEEEE] px-4 py-3.5 transition-colors duration-150 hover:border-accent/25">
      <div className="min-w-0">
        <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent/80">
          {label}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        {count && <p className="mt-0.5 text-xs text-muted-foreground">{count}</p>}
      </div>
      <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        On website
        <Switch checked={visible} onCheckedChange={onToggle} />
      </label>
    </div>
  );
}

/** One labeled group of fields inside Website Settings (Brand/Contact/Social/Domain/Locations) —
 * a small uppercase eyebrow + a divider, not another nested bordered card. */
function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#EEEEEE] pt-5 first:border-t-0 first:pt-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function WebsiteBuilder() {
  const { data: dashboardBusiness } = useDashboardBusiness();
  const businessId = dashboardBusiness?.id;
  const { data, isLoading } = useBusinessDraft(businessId);
  const queryClient = useQueryClient();
  const { state: saveState, error: saveError, saveImmediate, saveDebounced } = useAutosaveField(businessId);

  const [draft, setDraft] = useState<Draft | null>(null);
  // Section layout is a separate save cycle from the flat fields above: it's staged in
  // draft_sections and only becomes publicly visible (copied into `sections`) on Publish, so a
  // business can rearrange their page without it going live mid-edit.
  const [draftSections, setDraftSections] = useState<Section[] | null>(null);
  // Pages follow the exact same staged-until-publish pattern as sections. Empty ([]) is a real,
  // meaningful state here — it means "never customized," which is what tells deriveSitePages to
  // keep auto-deriving pages from content instead of applying overrides.
  const [draftPages, setDraftPages] = useState<SitePageRecord[] | null>(null);
  const pagesSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [previewPage, setPreviewPage] = useState<PageId>("home");
  const [publishState, setPublishState] = useState<SaveState>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const sectionsSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Only starts checking once the owner actually types — without this, an existing business
  // whose slug predates the current format rules (shorter than 3 characters, say) would show a
  // false "invalid" error the moment this page loads, for a value nobody is trying to change.
  const [usernameEdited, setUsernameEdited] = useState(false);
  const usernameAvailability = useUsernameAvailability(usernameEdited ? (draft?.slug ?? "") : "", businessId);

  useEffect(() => {
    if (data?.business && !draft) {
      const b = data.business;
      setDraft({
        slug: b.slug,
        name: b.name,
        description: b.description,
        categories: b.categories ?? [],
        business_types: b.business_types ?? [],
        is_eco_friendly: b.is_eco_friendly,
        hero_image_url: b.hero_image_url,
        about_image_url: b.about_image_url,
        about_text: b.about_text,
        logo_url: b.logo_url,
        main_video_url: b.main_video_url,
        gallery_urls: b.gallery_urls ?? [],
        short_video_urls: b.short_video_urls ?? [],
        brand_accent_color: b.brand_accent_color,
        background_color: b.background_color,
        whatsapp: b.whatsapp,
        contact_email: b.contact_email,
        instagram_url: b.instagram_url,
        custom_domain: b.custom_domain,
        template: (b.template as TemplateId) ?? "editorial",
        corner_style: b.corner_style,
        density: b.density,
      });
      const existing = (b.draft_sections as Section[] | null)?.length
        ? (b.draft_sections as Section[])
        : (b.sections as Section[] | null)?.length
          ? (b.sections as Section[])
          : buildDefaultSections({ business_types: b.business_types, items: { length: data.items.length }, services: { length: data.services.length } });
      setDraftSections(existing);
      const existingPages = (b.draft_pages as SitePageRecord[] | null)?.length
        ? (b.draft_pages as SitePageRecord[])
        : ((b.pages as SitePageRecord[] | null) ?? []);
      setDraftPages(existingPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.business]);

  // Saves the username the moment it's confirmed available — not debounced like the other text
  // fields, since a half-typed, not-yet-checked username should never be written.
  useEffect(() => {
    if (!usernameEdited || usernameAvailability.status !== "available" || !draft) return;
    const normalized = normalizeUsername(draft.slug);
    if (normalized === (data?.business?.slug ?? "")) return;
    saveImmediate({ slug: normalized });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameAvailability.status, draft?.slug]);

  if (!businessId || isLoading || !draft || !draftSections || !draftPages) {
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

  /** Only local state here — the actual save is triggered by the availability effect once the
   * new username is confirmed available, not on every keystroke. */
  function onUsernameChange(value: string) {
    setUsernameEdited(true);
    patch({ slug: value });
  }

  /** Fixed 3-slot short-video editor: setting a slot writes/replaces it, clearing one removes it. */
  function setShortVideo(index: number, path: string | null) {
    const next = [...draft!.short_video_urls];
    if (path) next[index] = path;
    else next.splice(index, 1);
    onImmediateChange({ short_video_urls: next.slice(0, 3) });
  }

  function onSectionsChange(next: Section[]) {
    setDraftSections(next);
    if (sectionsSaveTimer.current) clearTimeout(sectionsSaveTimer.current);
    sectionsSaveTimer.current = setTimeout(() => {
      saveImmediate({ draft_sections: next });
    }, 400);
  }

  function onPagesChange(next: SitePageRecord[]) {
    setDraftPages(next);
    if (pagesSaveTimer.current) clearTimeout(pagesSaveTimer.current);
    pagesSaveTimer.current = setTimeout(() => {
      saveImmediate({ draft_pages: next });
    }, 400);
  }

  /** Quick on/off for whether a section shows on the public site, surfaced next to its "Add /
   * Edit" link so a business doesn't need to open Page Layout separately for the common case.
   * Adds the section (visible) the first time it's toggled on if it doesn't exist yet. */
  function isSectionVisible(type: Section["type"]) {
    return draftSections!.some((s) => s.type === type && s.visible);
  }
  function toggleSectionVisible(type: Section["type"]) {
    const existing = draftSections!.find((s) => s.type === type);
    onSectionsChange(
      existing
        ? draftSections!.map((s) => (s.type === type ? { ...s, visible: !s.visible } : s))
        : [...draftSections!, newSection(type)],
    );
  }

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
    custom_domain: validateUrl(draft.custom_domain),
  };
  const blocked = hasErrors(fieldErrors);

  const fieldClass = (hasError?: boolean) =>
    `w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-accent ${
      hasError ? "border-destructive" : "border-[#EAEAEA]"
    }`;
  const uploaderWrapper = "rounded-[10px] border border-[#EAEAEA] bg-white p-4";

  const previewBusiness: ProfileBusiness = {
    id: businessId,
    name: draft.name,
    description: draft.description,
    tagline: data?.business?.tagline ?? null,
    categories: draft.categories,
    specialities: data?.business?.specialities ?? [],
    business_types: draft.business_types,
    instagram_url: draft.instagram_url,
    custom_domain: draft.custom_domain,
    whatsapp: draft.whatsapp,
    phone: data?.business?.phone ?? null,
    preferred_contact: data?.business?.preferred_contact ?? null,
    contact_email: draft.contact_email,
    hero_image_url: draft.hero_image_url,
    about_image_url: draft.about_image_url,
    about_text: draft.about_text,
    logo_url: draft.logo_url,
    gallery_urls: draft.gallery_urls,
    main_video_url: draft.main_video_url,
    short_video_urls: draft.short_video_urls,
    brand_accent_color: draft.brand_accent_color,
    background_color: draft.background_color,
    brand_secondary_color: data?.business?.brand_secondary_color ?? null,
    button_style: data?.business?.button_style ?? null,
    is_eco_friendly: showEco ? draft.is_eco_friendly : false,
    operating_hours: (data?.business?.operating_hours as ProfileBusiness["operating_hours"]) ?? null,
    sections: draftSections,
    pages: draftPages,
    template: draft.template,
    corner_style: draft.corner_style,
    density: draft.density,
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
  const previewPages = deriveSitePages({ ...previewBusiness, sections: resolveSections(previewBusiness) }, resolvePages(previewBusiness));
  const editingPages = pagesForEditing({ ...previewBusiness, sections: resolveSections(previewBusiness) }, resolvePages(previewBusiness));
  const activePreviewPage = previewPages.some((p) => p.id === previewPage) ? previewPage : "home";

  async function publish() {
    if (!draft || !draftSections || !draftPages) return;
    setPublishState("saving");
    setPublishError(null);
    // Self-service publish: a business owner can always take their own site live, no admin
    // approval step involved.
    const patch: {
      sections: Section[];
      draft_sections: Section[];
      pages: SitePageRecord[];
      draft_pages: SitePageRecord[];
      template: TemplateId;
      status: "live";
    } = {
      sections: draftSections,
      draft_sections: draftSections,
      pages: draftPages,
      draft_pages: draftPages,
      template: draft.template,
      status: "live",
    };
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
    // Below `lg` the aside and preview stack vertically and the whole page scrolls together
    // (the aside's own overflow-y-auto is lg-only too — see the aside below), so only bound
    // this to the viewport height — enabling the aside/preview to scroll independently of each
    // other — at `lg` and up.
    <div className="flex flex-col bg-white lg:h-[calc(100dvh-6rem)] lg:overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEEEE] bg-white px-5 py-3.5">
        <DashboardBackLink className="" />
        <div className="flex items-center gap-4">
          <SaveStatus state={saveState} error={saveError} />
          <button
            type="button"
            onClick={publish}
            disabled={publishState === "saving" || blocked}
            title={blocked ? "Fix the highlighted fields first" : undefined}
            className="rounded-[10px] bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-150 hover:shadow-md disabled:opacity-60 disabled:shadow-none"
          >
            {publishState === "saving" ? "Saving…" : "Save and Publish"}
          </button>
        </div>
      </div>
      {blocked && (
        <p className="border-b border-[#EEEEEE] bg-white px-5 py-2.5 text-sm text-destructive">
          Fix the highlighted fields in the editor before publishing.
        </p>
      )}
      {publishError && <p className="border-b border-[#EEEEEE] bg-white px-5 py-2.5 text-sm text-destructive">{publishError}</p>}
      {publishState === "saved" && !publishError && (
        <p className="border-b border-[#EEEEEE] bg-white px-5 py-2.5 text-xs text-muted-foreground">Your website is live.</p>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Editor */}
        <aside className="w-full shrink-0 border-b border-[#EEEEEE] bg-white lg:w-[320px] lg:min-h-0 lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <BuilderSection title="Template" subtitle="Pick a look for your website. Your content stays the same either way." defaultOpen>
            <div className="grid grid-cols-2 gap-2.5">
              {TEMPLATE_LIST.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onImmediateChange({ template: t.id })}
                  className={`group rounded-[12px] border p-2.5 text-left transition-all duration-150 ${
                    draft.template === t.id
                      ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]"
                      : "border-[#EAEAEA] hover:border-accent/40 hover:shadow-sm"
                  }`}
                >
                  <span
                    className="relative block h-11 w-full overflow-hidden rounded-[8px]"
                    style={{ background: `linear-gradient(135deg, ${t.previewSurface}, ${t.previewAccent})` }}
                  >
                    {draft.template === t.id && (
                      <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-white">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className={`mt-2 block text-xs font-medium ${draft.template === t.id ? "text-accent" : "text-foreground"}`}>{t.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{t.suitedFor}</span>
                </button>
              ))}
            </div>
          </BuilderSection>

          <BuilderSection title="Pages" subtitle="Reorder, rename or hide pages — goes live when you press Save and Publish.">
            <PagesEditor pages={editingPages} onChange={onPagesChange} />
          </BuilderSection>

          <BuilderSection title="Page Layout" subtitle="Add, hide, reorder or edit sections — goes live when you press Save and Publish.">
            <SectionListEditor
              sections={draftSections}
              onChange={onSectionsChange}
              items={(data?.items ?? []).map((i) => ({ id: i.id, name: i.name }))}
              templateId={draft.template}
              signals={{
                hasProducts: (data?.items ?? []).some((i) => i.is_active),
                hasServices: (data?.services ?? []).some((s) => s.is_active),
                hasGallery: draft.gallery_urls.length > 0,
                hasReviews: (data?.business?.review_count ?? 0) > 0,
                hasAppointments: draft.business_types.includes("appointment"),
                hasDeliveryAreas: (data?.deliveryAreas ?? []).length > 0,
              }}
            />
          </BuilderSection>

          <BuilderSection title="Hero" subtitle="One photo or video for the top of your page — a video autoplays on loop.">
            <HeroMediaUploader
              businessId={businessId}
              value={{ image: draft.hero_image_url, video: draft.main_video_url }}
              onChange={({ image, video }) => onImmediateChange({ hero_image_url: image, main_video_url: video })}
              wrapperClassName={uploaderWrapper}
            />
            <p className="text-xs text-muted-foreground">
              Want a tagline under your name here? Set it in Page Layout → Hero → Edit.
            </p>
          </BuilderSection>

          <BuilderSection title="Short Videos" subtitle="Up to 3 short clips (max 60s each) shown on your website.">
            {[0, 1, 2].map((i) => (
              <MediaUploader
                key={i}
                businessId={businessId}
                kind="short"
                value={draft.short_video_urls[i] ?? null}
                onChange={(path) => setShortVideo(i, path)}
                wrapperClassName={uploaderWrapper}
              />
            ))}
          </BuilderSection>

          <BuilderSection title="Logo" subtitle="Shown in your site's navigation bar.">
            <MediaUploader
              businessId={businessId}
              kind="logo"
              value={draft.logo_url}
              onChange={(path) => onImmediateChange({ logo_url: path })}
              wrapperClassName={uploaderWrapper}
            />
          </BuilderSection>

          <BuilderSection title="Gallery" subtitle="Up to 6 photos showcasing your work.">
            <GalleryEditor
              businessId={businessId}
              value={draft.gallery_urls}
              onSaved={(urls) => patch({ gallery_urls: urls })}
            />
          </BuilderSection>

          <BuilderSection title="About Your Business" subtitle="Your business's own content — name, story and photo.">
            <div>
              <label className="text-[13px] font-medium text-foreground">Business name</label>
              <input
                value={draft.name}
                onChange={(e) => onTextChange("name", e.target.value, validateBusinessName(e.target.value))}
                placeholder="Business name"
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? "err-name" : undefined}
                className={`mt-2 ${fieldClass(!!fieldErrors.name)}`}
              />
              <span id="err-name">
                <FieldError message={fieldErrors.name} />
              </span>
            </div>
            <div>
              <label className="text-[13px] font-medium text-foreground">Your story</label>
              <textarea
                rows={6}
                value={draft.about_text ?? ""}
                onChange={(e) => onTextChange("about_text", e.target.value)}
                placeholder="Tell your story — this shows in the About section, separate from your hero tagline."
                className={`mt-2 ${fieldClass()}`}
              />
            </div>
            <MediaUploader
              businessId={businessId}
              kind="about"
              value={draft.about_image_url}
              onChange={(path) => onImmediateChange({ about_image_url: path })}
              wrapperClassName={uploaderWrapper}
            />
            <p className="text-xs text-muted-foreground">
              Description, categories, business type and eco-friendly status are set in{" "}
              <Link to="/business/dashboard/profile" className="text-accent hover:underline">
                Profile &amp; Media
              </Link>
              .
            </p>
          </BuilderSection>

          <BuilderSection
            title="Products & Services"
            subtitle={`${data?.items?.length ?? 0} product(s) · ${data?.services?.length ?? 0} service(s)`}
          >
            <ManageLinkRow
              to="/business/dashboard/products"
              label="Add / Edit Products"
              count={`${data?.items?.length ?? 0} product${data?.items?.length === 1 ? "" : "s"}`}
              visible={isSectionVisible("products")}
              onToggle={() => toggleSectionVisible("products")}
            />
            <ManageLinkRow
              to="/business/dashboard/services"
              label="Add / Edit Services"
              count={`${data?.services?.length ?? 0} service${data?.services?.length === 1 ? "" : "s"}`}
              visible={isSectionVisible("services")}
              onToggle={() => toggleSectionVisible("services")}
            />
          </BuilderSection>

          {draft.business_types.includes("appointment") && (
            <BuilderSection title="Book Appointments" subtitle="Manage staff & availability there.">
              <ManageLinkRow
                to="/business/dashboard/staff"
                label="Add / Edit Appointments"
                count={`${data?.staff?.length ?? 0} staff member${data?.staff?.length === 1 ? "" : "s"}`}
                visible={isSectionVisible("booking")}
                onToggle={() => toggleSectionVisible("booking")}
              />
            </BuilderSection>
          )}

          <BuilderSection title="Website Settings" subtitle="Brand, contact, social, domain, locations & delivery.">
            <SettingsGroup label="Brand">
              <div>
                <p className="text-[13px] font-medium text-foreground">Accent colour</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => onImmediateChange({ brand_accent_color: c.value })}
                      title={c.name}
                      aria-label={c.name}
                      aria-pressed={draft.brand_accent_color === c.value}
                      className={`flex size-8 items-center justify-center rounded-full border-2 transition-all duration-150 ${
                        draft.brand_accent_color === c.value ? "border-accent" : "border-transparent hover:border-[#EAEAEA]"
                      }`}
                    >
                      <span className="size-5 rounded-full" style={{ backgroundColor: c.value }} />
                    </button>
                  ))}
                </div>
              </div>
              <ColorField
                label="Page background"
                value={draft.background_color}
                defaultColor="#ffffff"
                onChange={(hex) => onImmediateChange({ background_color: hex })}
                onClear={() => onImmediateChange({ background_color: null })}
                helpText="The default background behind every page. Leave unset to use the template's own background."
              />
              <div>
                <p className="text-[13px] font-medium text-foreground">Corners</p>
                <div className="mt-2 flex gap-1.5">
                  {(
                    [
                      [null, "Template default"],
                      ["soft", "Soft"],
                      ["sharp", "Sharp"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => onImmediateChange({ corner_style: value })}
                      aria-pressed={draft.corner_style === value}
                      className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                        draft.corner_style === value ? "border-accent bg-accent-soft text-accent" : "border-[#EAEAEA] text-muted-foreground hover:border-accent/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">Density</p>
                <div className="mt-2 flex gap-1.5">
                  {(
                    [
                      [null, "Template default"],
                      ["airy", "Airy"],
                      ["compact", "Compact"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => onImmediateChange({ density: value })}
                      aria-pressed={draft.density === value}
                      className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                        draft.density === value ? "border-accent bg-accent-soft text-accent" : "border-[#EAEAEA] text-muted-foreground hover:border-accent/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </SettingsGroup>

            <SettingsGroup label="Contact">
              <div>
                <label className="text-[13px] font-medium text-foreground">WhatsApp number</label>
                <input
                  value={draft.whatsapp ?? ""}
                  onChange={(e) => onTextChange("whatsapp", e.target.value, validatePhone(e.target.value))}
                  placeholder="+91…"
                  inputMode="tel"
                  aria-invalid={!!fieldErrors.whatsapp}
                  className={`mt-2 ${fieldClass(!!fieldErrors.whatsapp)}`}
                />
                <FieldError message={fieldErrors.whatsapp} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-foreground">Contact email</label>
                <input
                  value={draft.contact_email ?? ""}
                  onChange={(e) => onTextChange("contact_email", e.target.value, validateEmail(e.target.value))}
                  placeholder="you@business.com"
                  inputMode="email"
                  aria-invalid={!!fieldErrors.contact_email}
                  className={`mt-2 ${fieldClass(!!fieldErrors.contact_email)}`}
                />
                <FieldError message={fieldErrors.contact_email} />
              </div>
            </SettingsGroup>

            <SettingsGroup label="Social">
              <div>
                <label className="text-[13px] font-medium text-foreground">Instagram link</label>
                <input
                  value={draft.instagram_url ?? ""}
                  onChange={(e) => onTextChange("instagram_url", e.target.value, validateUrl(e.target.value))}
                  placeholder="https://instagram.com/…"
                  inputMode="url"
                  aria-invalid={!!fieldErrors.instagram_url}
                  className={`mt-2 ${fieldClass(!!fieldErrors.instagram_url)}`}
                />
                <FieldError message={fieldErrors.instagram_url} />
              </div>
            </SettingsGroup>

            <SettingsGroup label="Domain">
              <div>
                <label className="text-[13px] font-medium text-foreground">LuvLit address</label>
                <div
                  className={`mt-2 flex items-stretch overflow-hidden rounded-[10px] border bg-white transition-colors duration-150 ${
                    usernameAvailability.status === "invalid" || usernameAvailability.status === "taken"
                      ? "border-destructive"
                      : "border-[#EAEAEA] focus-within:border-accent"
                  }`}
                >
                  <input
                    value={draft.slug}
                    onChange={(e) => onUsernameChange(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-invalid={usernameAvailability.status === "invalid" || usernameAvailability.status === "taken"}
                    className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm text-foreground outline-none"
                  />
                  <span className="flex items-center border-l border-[#EAEAEA] bg-[#FAFAFA] px-3 text-sm text-muted-foreground">
                    .luvlit.in
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{USERNAME_FORMAT_HINT}</p>
                {usernameEdited && <UsernameStatusLine state={usernameAvailability} username={normalizeUsername(draft.slug)} />}
                {usernameEdited &&
                  usernameAvailability.status === "available" &&
                  normalizeUsername(draft.slug) !== (slug ?? "") && (
                    <p className="mt-1.5 text-xs text-amber-700">
                      {isPubliclyLive
                        ? `Changing this moves your published site to ${normalizeUsername(draft.slug)}.luvlit.in — the current address (${slug}.luvlit.in) will stop working.`
                        : `Your site will be published at ${normalizeUsername(draft.slug)}.luvlit.in.`}
                    </p>
                  )}
              </div>
              <div>
                <label className="text-[13px] font-medium text-foreground">Official website (optional)</label>
                <input
                  value={draft.custom_domain ?? ""}
                  onChange={(e) => onTextChange("custom_domain", e.target.value, validateUrl(e.target.value))}
                  placeholder="https://yourbusiness.com"
                  inputMode="url"
                  aria-invalid={!!fieldErrors.custom_domain}
                  className={`mt-2 ${fieldClass(!!fieldErrors.custom_domain)}`}
                />
                <FieldError message={fieldErrors.custom_domain} />
              </div>
            </SettingsGroup>

            <SettingsGroup label="Locations & delivery">
              <LocationsEditor businessId={businessId} />
            </SettingsGroup>
          </BuilderSection>
        </aside>

        {/* Live preview */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFAFA]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEEEE] bg-white px-5 py-2.5">
            <div className="flex items-center gap-0.5 rounded-[10px] bg-[#F5F5F5] p-1">
              {VIEWPORTS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewport(v.id)}
                  aria-label={`${v.label} preview`}
                  aria-pressed={viewport === v.id}
                  className={`rounded-[8px] px-2.5 py-1.5 text-xs transition-all duration-150 ${
                    viewport === v.id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                className="rounded-[8px] border border-[#EAEAEA] px-3 py-1.5 text-xs font-medium transition-colors duration-150 hover:border-accent hover:text-accent"
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
          <div className="flex flex-wrap gap-1 border-b border-[#EEEEEE] bg-white px-5 py-2">
            {previewPages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreviewPage(p.id)}
                className={`rounded-[8px] px-3 py-1.5 text-xs transition-colors duration-150 ${
                  activePreviewPage === p.id
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted-foreground hover:bg-[#FAFAFA] hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="border-b border-[#EEEEEE] bg-white px-5 py-2.5 text-xs text-muted-foreground">
            {isPubliclyLive
              ? "This preview matches your live site. Most edits here save straight to it as you make them — only section layout (Page Layout) stays staged until you press \"Save and Publish.\""
              : "Live preview — nothing here is public yet. Press \"Save and Publish\" to go live."}
          </p>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div
              className={`mx-auto overflow-hidden rounded-[14px] border border-[#EAEAEA] bg-background shadow-[0_8px_30px_-16px_rgba(23,42,30,0.18)] transition-all duration-200 ${VIEWPORT_WIDTH[viewport]}`}
            >
              <BusinessSitePage business={previewBusiness} page={activePreviewPage} preview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
