import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Image as ImageIcon,
  Instagram,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { MEDIA_LIMITS, useMediaUpload, useMediaUrl } from "@/components/media-uploader";
import { GalleryEditor } from "@/components/website-builder/gallery-editor";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WhatsAppIcon } from "@/components/brand-icons";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { CardListSkeleton } from "@/components/ui/skeleton-shapes";
import { Switch } from "@/components/ui/switch";
import { BUSINESS_TYPES, ECO_CATEGORIES } from "@/lib/constants";
import { hasErrors, validateEmail, validatePhone, validateUrl } from "@/lib/website-validation";

export const Route = createFileRoute("/_authenticated/business/dashboard/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Media — Business dashboard — LuvLit" },
      { name: "description", content: "A summary of your business profile, media and links on LuvLit." },
      { property: "og:title", content: "Profile & Media — Business dashboard — LuvLit" },
      { property: "og:description", content: "Review your LuvLit business profile." },
    ],
  }),
  component: ProfilePage,
});

const SHORT_VIDEO_MAX = 3;

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Shared card shell: a title/subtitle row with an action slot on the right (an Edit button, or
 * Save/Cancel while editing), and content below. Every editable section on this page uses this
 * so "read-only until Edit, then Save/Cancel" looks and behaves identically everywhere. */
function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
    >
      <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      Edit
    </button>
  );
}

function SaveCancelButtons({
  onSave,
  onCancel,
  saving,
  disabled,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
        className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-opacity disabled:opacity-60"
      >
        {saving && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
        Save
      </button>
    </div>
  );
}

function ShortVideoThumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const url = useMediaUrl(path);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="relative w-40 overflow-hidden rounded-lg border border-border">
      {url ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={url} className="h-32 w-full bg-black object-contain" muted />
      ) : (
        <div className="h-32 w-full bg-secondary" />
      )}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Remove video"
        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/95 text-destructive shadow-sm transition-colors hover:bg-white"
      >
        <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      </button>
      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={onRemove}
        title="Remove this video?"
        description="This video will be removed from your public page. This can't be undone."
      />
    </div>
  );
}

function ContactField({
  icon,
  iconBg,
  label,
  value,
  editing,
  draft,
  onChange,
  error,
  placeholder,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string | null | undefined;
  editing: boolean;
  draft: string;
  onChange: (v: string) => void;
  error: string | null;
  placeholder: string;
}) {
  return (
    <div className="rounded-md border border-border p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-white" style={{ background: iconBg }}>
          {icon}
        </span>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      {editing ? (
        <>
          <input
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-accent ${
              error ? "border-destructive" : "border-border"
            }`}
          />
          {error && <p className="mt-1 text-[0.6875rem] text-destructive">{error}</p>}
        </>
      ) : (
        <p className="mt-2 truncate text-sm">{value || "—"}</p>
      )}
    </div>
  );
}

function ProfilePage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const queryClient = useQueryClient();

  // Everything set during onboarding (description, categories, business type, eco-friendly)
  // lives here and only here — Website Builder shows it read-only with a link back to this
  // page, so there's exactly one place these can be edited and never two writers racing. The
  // hero image is the mirror case: fetched nowhere on this page, editable only in Website
  // Builder — so the two truly can't overwrite each other.
  const { data: full, isLoading: fullLoading } = useQuery({
    queryKey: ["dashboard-profile-full", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      (
        await supabase
          .from("businesses")
          .select("name,description,categories,business_types,thumbnail_url,gallery_urls,short_video_urls,whatsapp,contact_email,instagram_url,is_eco_friendly")
          .eq("id", businessId!)
          .single()
      ).data,
  });

  const { data: categories, error: categoriesError } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name").eq("is_approved", true).order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  // Whether unchecking "Products" or "Services / Appointments" would hide a dashboard section
  // that actually has data behind it — drives the warning in saveTypes below, so a business
  // never silently loses sight of products/services/staff they already set up.
  const { data: typeUsage } = useQuery({
    queryKey: ["dashboard-profile-type-usage", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const [{ count: itemsCount }, { count: servicesCount }, { count: staffCount }] = await Promise.all([
        supabase.from("items").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
        supabase.from("staff").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
      ]);
      return {
        hasProducts: (itemsCount ?? 0) > 0,
        hasAppointmentData: (servicesCount ?? 0) > 0 || (staffCount ?? 0) > 0,
      };
    },
  });

  // Direct-action media (no Save/Cancel — upload/remove apply immediately, per spec).
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailStatus, setThumbnailStatus] = useState<string | null>(null);
  const [confirmThumbDelete, setConfirmThumbDelete] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [gallery, setGallery] = useState<string[]>([]);
  const [shortVideos, setShortVideos] = useState<string[]>([]);
  const shortVideoInputRef = useRef<HTMLInputElement>(null);

  // Edit → Save/Cancel fields: local drafts, only committed on Save.
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  const [editingTypes, setEditingTypes] = useState(false);
  const [categoriesDraft, setCategoriesDraft] = useState<string[]>([]);
  const [businessTypesDraft, setBusinessTypesDraft] = useState<string[]>([]);
  const [ecoDraft, setEcoDraft] = useState(false);
  const [savingTypes, setSavingTypes] = useState(false);
  const [typeWarning, setTypeWarning] = useState<{ losingProduct: boolean; losingAppointment: boolean } | null>(null);

  const [editingContact, setEditingContact] = useState(false);
  const [whatsappDraft, setWhatsappDraft] = useState("");
  const [instagramDraft, setInstagramDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    if (!full) return;
    setThumbnail(full.thumbnail_url ?? null);
    setGallery(full.gallery_urls ?? []);
    setShortVideos(full.short_video_urls ?? []);
    // Only re-sync drafts when NOT actively editing that section, so a background refetch
    // (our own invalidation, or another tab's save) never clobbers text mid-edit.
    if (!editingDescription) setDescriptionDraft(full.description ?? "");
    if (!editingTypes) {
      setCategoriesDraft(full.categories ?? []);
      setBusinessTypesDraft(full.business_types ?? []);
      setEcoDraft(full.is_eco_friendly ?? false);
    }
    if (!editingContact) {
      setWhatsappDraft(full.whatsapp ?? "");
      setInstagramDraft(full.instagram_url ?? "");
      setEmailDraft(full.contact_email ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  type BusinessPatch = {
    thumbnail_url?: string | null;
    description?: string;
    categories?: string[];
    business_types?: string[];
    is_eco_friendly?: boolean;
    whatsapp?: string | null;
    instagram_url?: string | null;
    contact_email?: string | null;
    short_video_urls?: string[];
  };

  /** Every field here is also read (read-only) by Website Builder's live preview and by the
   * dashboard sidebar/Overview — invalidate all three so a save shows up everywhere immediately,
   * instead of only on this page until a hard refresh. */
  async function commit(patch: BusinessPatch) {
    if (!businessId) return null;
    const { error } = await supabase.from("businesses").update(patch).eq("id", businessId);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["dashboard-profile-full", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-business"] });
      queryClient.invalidateQueries({ queryKey: ["website-builder-business", businessId] });
    }
    return error;
  }

  const thumbnailPreview = useMediaUrl(thumbnail);
  const {
    upload: uploadThumbnail,
    progress: thumbnailProgress,
    error: thumbnailUploadError,
  } = useMediaUpload({
    businessId: businessId ?? "",
    kind: "thumbnail",
    onUploaded: (path) => void saveThumbnail(path),
  });

  async function saveThumbnail(path: string | null) {
    setThumbnail(path);
    setThumbnailStatus("Saving…");
    const error = await commit({ thumbnail_url: path });
    setThumbnailStatus(error ? error.message : path ? "Thumbnail updated — it now shows on your listing card." : "Thumbnail removed.");
  }

  function onGallerySaved(urls: string[]) {
    setGallery(urls);
    queryClient.invalidateQueries({ queryKey: ["dashboard-profile-full", businessId] });
    queryClient.invalidateQueries({ queryKey: ["website-builder-business", businessId] });
  }

  const {
    upload: uploadShortVideo,
    progress: shortVideoProgress,
    error: shortVideoUploadError,
  } = useMediaUpload({
    businessId: businessId ?? "",
    kind: "short",
    onUploaded: (path) => void saveShortVideos([...shortVideos, path]),
  });

  async function saveShortVideos(next: string[]) {
    setShortVideos(next);
    await commit({ short_video_urls: next });
  }

  function startEditingDescription() {
    setDescriptionDraft(full?.description ?? "");
    setEditingDescription(true);
  }
  function cancelEditingDescription() {
    setEditingDescription(false);
  }
  async function saveDescription() {
    setSavingDescription(true);
    const error = await commit({ description: descriptionDraft });
    setSavingDescription(false);
    if (!error) setEditingDescription(false);
  }

  const businessCategories = full?.categories ?? [];
  const businessTypes = full?.business_types ?? [];
  const showEco = businessCategories.some((c) => ECO_CATEGORIES.includes(c));
  const showEcoDraft = categoriesDraft.some((c) => ECO_CATEGORIES.includes(c));

  function startEditingTypes() {
    setCategoriesDraft(full?.categories ?? []);
    setBusinessTypesDraft(full?.business_types ?? []);
    setEcoDraft(full?.is_eco_friendly ?? false);
    setEditingTypes(true);
  }
  function cancelEditingTypes() {
    setEditingTypes(false);
  }
  async function performSaveTypes() {
    setSavingTypes(true);
    const stillEco = categoriesDraft.some((c) => ECO_CATEGORIES.includes(c));
    const error = await commit({
      categories: categoriesDraft,
      business_types: businessTypesDraft,
      is_eco_friendly: stillEco ? ecoDraft : false,
    });
    setSavingTypes(false);
    if (!error) {
      setEditingTypes(false);
      setTypeWarning(null);
    }
  }
  /** Business type strictly controls what shows in the dashboard sidebar (see
   * business-dashboard-sidebar.tsx) — so unchecking a type that has real data behind it doesn't
   * delete anything, but does hide that section from the nav. Warn before that happens, rather
   * than let it be a surprise; "Go back" leaves the draft as-is so the owner can add the other
   * type instead of removing this one. */
  function saveTypes() {
    const losingProduct =
      businessTypes.includes("product") && !businessTypesDraft.includes("product") && !!typeUsage?.hasProducts;
    const losingAppointment =
      businessTypes.includes("appointment") && !businessTypesDraft.includes("appointment") && !!typeUsage?.hasAppointmentData;
    if (losingProduct || losingAppointment) {
      setTypeWarning({ losingProduct, losingAppointment });
      return;
    }
    void performSaveTypes();
  }

  function startEditingContact() {
    setWhatsappDraft(full?.whatsapp ?? "");
    setInstagramDraft(full?.instagram_url ?? "");
    setEmailDraft(full?.contact_email ?? "");
    setEditingContact(true);
  }
  function cancelEditingContact() {
    setEditingContact(false);
  }
  const contactErrors = {
    whatsapp: validatePhone(whatsappDraft),
    instagram: validateUrl(instagramDraft),
    email: validateEmail(emailDraft),
  };
  async function saveContact() {
    setSavingContact(true);
    const error = await commit({
      whatsapp: whatsappDraft || null,
      instagram_url: instagramDraft || null,
      contact_email: emailDraft || null,
    });
    setSavingContact(false);
    if (!error) setEditingContact(false);
  }

  return (
    <div>
      <DashboardBackLink />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Profile & Media</p>
          <h1 className="mt-2 text-2xl font-medium">Your business page</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage how your business appears across LuvLit and your website.
          </p>
        </div>
        <Link
          to="/business/dashboard/website"
          className="flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" />
          Open Website Builder
        </Link>
      </div>

      {businessId && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            <div className="dashboard-card p-5">
              <p className="text-sm font-semibold text-foreground">Listing thumbnail</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This is the image shown on your business card in browse & search results.
              </p>
              <p className="text-xs text-muted-foreground">
                For the hero (cover) image, use{" "}
                <Link to="/business/dashboard/website" className="text-accent hover:underline">
                  Website Builder
                </Link>
                .
              </p>

              <div className="mt-4 flex flex-wrap items-start gap-4">
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="flex w-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-8 text-center transition-colors hover:border-accent"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <ImageIcon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="rounded-md bg-accent px-4 py-2 text-xs font-medium text-accent-foreground">
                    Choose image
                  </span>
                  <span className="text-[0.6875rem] text-muted-foreground">JPG, PNG or WebP</span>
                  <span className="text-[0.6875rem] text-muted-foreground">Recommended: 1200 × 800px</span>
                </button>

                {thumbnail && thumbnailPreview && (
                  <div className="relative h-[168px] w-56 overflow-hidden rounded-lg border border-border">
                    <img src={thumbnailPreview} alt="Listing thumbnail" className="h-full w-full object-cover" />
                    <div className="absolute right-2 top-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
                        aria-label="Replace thumbnail"
                        className="flex size-7 items-center justify-center rounded-full bg-white/95 text-foreground shadow-sm transition-colors hover:bg-white"
                      >
                        <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmThumbDelete(true)}
                        aria-label="Remove thumbnail"
                        className="flex size-7 items-center justify-center rounded-full bg-white/95 text-destructive shadow-sm transition-colors hover:bg-white"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void uploadThumbnail(file);
                  }}
                />
              </div>

              {thumbnailProgress != null && (
                <div className="mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary transition-all" style={{ width: `${thumbnailProgress}%` }} />
                </div>
              )}
              {thumbnailUploadError && <p className="mt-2 text-xs text-destructive">{thumbnailUploadError}</p>}
              {thumbnailStatus && <p className="mt-2 text-xs text-muted-foreground">{thumbnailStatus}</p>}

              <ConfirmDeleteDialog
                open={confirmThumbDelete}
                onOpenChange={setConfirmThumbDelete}
                onConfirm={() => {
                  setConfirmThumbDelete(false);
                  void saveThumbnail(null);
                }}
                title="Remove your listing thumbnail?"
                description="Your business card will show your logo or initials instead, until you upload a new one."
              />
            </div>

            <SectionCard
              title="Description"
              subtitle="Shown on your listing card and used as your page's default tagline unless you set a custom one in Website Builder's Hero section."
              action={
                !editingDescription ? (
                  <EditButton onClick={startEditingDescription} />
                ) : (
                  <SaveCancelButtons onSave={saveDescription} onCancel={cancelEditingDescription} saving={savingDescription} />
                )
              }
            >
              {editingDescription ? (
                <>
                  <textarea
                    rows={3}
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    maxLength={500}
                    placeholder="Describe what you do, in a couple of sentences."
                    autoFocus
                    className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
                  />
                  <p className="mt-1 text-right text-[0.6875rem] text-muted-foreground">{descriptionDraft.length} / 500</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{full?.description || "No description yet."}</p>
              )}
            </SectionCard>

            <SectionCard
              title="Categories & business type"
              subtitle="Help customers discover what you offer."
              action={
                !editingTypes ? (
                  <EditButton onClick={startEditingTypes} />
                ) : (
                  <SaveCancelButtons onSave={saveTypes} onCancel={cancelEditingTypes} saving={savingTypes} />
                )
              }
            >
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Categories</p>
                  {editingTypes && categoriesError && (
                    <p className="mt-1.5 text-xs text-destructive">Couldn't load categories: {categoriesError.message}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {editingTypes
                      ? (categories ?? []).map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => setCategoriesDraft(toggle(categoriesDraft, c.name))}
                            className={`rounded-full border px-3 py-1.5 text-xs transition-colors duration-150 ${
                              categoriesDraft.includes(c.name)
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-border hover:border-accent/40"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))
                      : businessCategories.length
                        ? businessCategories.map((c) => (
                            <span key={c} className="rounded-full border border-accent bg-accent-soft px-3 py-1.5 text-xs text-accent">
                              {c}
                            </span>
                          ))
                        : <p className="text-sm text-muted-foreground">None selected.</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Business type</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {editingTypes
                      ? BUSINESS_TYPES.map((t) => (
                          <button
                            type="button"
                            key={t.value}
                            onClick={() => setBusinessTypesDraft(toggle(businessTypesDraft, t.value))}
                            title={t.hint}
                            className={`rounded-full border px-3 py-1.5 text-xs transition-colors duration-150 ${
                              businessTypesDraft.includes(t.value)
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-border hover:border-accent/40"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))
                      : businessTypes.length
                        ? BUSINESS_TYPES.filter((t) => businessTypes.includes(t.value)).map((t) => (
                            <span key={t.value} className="rounded-full border border-accent bg-accent-soft px-3 py-1.5 text-xs text-accent">
                              {t.label}
                            </span>
                          ))
                        : <p className="text-sm text-muted-foreground">None selected.</p>}
                  </div>
                </div>
                {(editingTypes ? showEcoDraft : showEco) && (
                  <label className="flex items-center justify-between rounded-md border border-border px-4 py-3.5 text-sm">
                    <span>Eco-friendly / sustainable?</span>
                    {editingTypes ? (
                      <Switch checked={ecoDraft} onCheckedChange={setEcoDraft} />
                    ) : (
                      <span className="text-muted-foreground">{full?.is_eco_friendly ? "Yes" : "No"}</span>
                    )}
                  </label>
                )}
              </div>
            </SectionCard>

            <AlertDialog open={!!typeWarning} onOpenChange={(open) => !open && setTypeWarning(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>This will hide part of your dashboard</AlertDialogTitle>
                  <AlertDialogDescription>
                    {typeWarning?.losingProduct &&
                      "You have products saved. Turning off \"Products\" hides the Products page from your sidebar — your product data stays safe and comes back the moment you turn it back on. "}
                    {typeWarning?.losingAppointment &&
                      "You have staff or services saved. Turning off \"Services / Appointments\" hides Services, Staff & Availability and Appointments from your sidebar — your data stays safe and comes back the moment you turn it back on. "}
                    If you'd rather keep using both, leave this type checked and just add the other one instead of removing it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setTypeWarning(null)}>Go back</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void performSaveTypes()}>Save anyway</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="dashboard-card h-fit p-5 lg:sticky lg:top-6">
            <ul className="space-y-4">
              {[
                { title: "Thumbnail tips", body: "Use a clear, high-quality image that represents your business." },
                { title: "Recommended size", body: "1200 × 800px works best." },
                { title: "Where it appears", body: "Shown on listing cards in search results and browse pages." },
              ].map((tip) => (
                <li key={tip.title} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <ImageIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{tip.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{tip.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {fullLoading && <CardListSkeleton rows={1} />}

      {businessId && (
        <div className="mt-5">
          <SectionCard title="Gallery pictures" subtitle="Extra photos shown on your public page's gallery section.">
            <GalleryEditor businessId={businessId} value={gallery} onSaved={onGallerySaved} />
          </SectionCard>
        </div>
      )}

      {businessId && (
        <div className="mt-5">
          <SectionCard title="Short videos" subtitle="Show off your work with short videos on your public page.">
            <div className="flex flex-wrap gap-3">
              {shortVideos.map((path, i) => (
                <ShortVideoThumb
                  key={`${path}-${i}`}
                  path={path}
                  onRemove={() => void saveShortVideos(shortVideos.filter((_, idx) => idx !== i))}
                />
              ))}
              {shortVideos.length < SHORT_VIDEO_MAX && (
                <button
                  type="button"
                  onClick={() => shortVideoInputRef.current?.click()}
                  className="flex h-32 w-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 transition-colors hover:border-accent"
                >
                  <Plus className="size-5 text-accent" strokeWidth={1.75} aria-hidden="true" />
                  <span className="text-xs font-medium text-accent">Add video</span>
                </button>
              )}
            </div>
            <input
              ref={shortVideoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadShortVideo(file);
              }}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              MP4, MOV or WebM · max {Math.round(MEDIA_LIMITS.short.maxBytes / 1024 / 1024)}MB · max{" "}
              {MEDIA_LIMITS.short.maxSeconds}s
            </p>
            {shortVideoProgress != null && (
              <div className="mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary transition-all" style={{ width: `${shortVideoProgress}%` }} />
              </div>
            )}
            {shortVideoUploadError && <p className="mt-2 text-xs text-destructive">{shortVideoUploadError}</p>}
          </SectionCard>
        </div>
      )}

      {businessId && (
        <div className="mt-5">
          <SectionCard
            title="Contact & social links"
            subtitle="These links will be shown on your public page."
            action={
              !editingContact ? (
                <EditButton onClick={startEditingContact} />
              ) : (
                <SaveCancelButtons
                  onSave={saveContact}
                  onCancel={cancelEditingContact}
                  saving={savingContact}
                  disabled={hasErrors(contactErrors)}
                />
              )
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <ContactField
                icon={<WhatsAppIcon className="size-4" />}
                iconBg="#25D366"
                label="WhatsApp"
                value={full?.whatsapp}
                editing={editingContact}
                draft={whatsappDraft}
                onChange={setWhatsappDraft}
                error={contactErrors.whatsapp}
                placeholder="+91 98765 43210"
              />
              <ContactField
                icon={<Instagram className="size-4" strokeWidth={1.75} />}
                iconBg="linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)"
                label="Instagram"
                value={full?.instagram_url}
                editing={editingContact}
                draft={instagramDraft}
                onChange={setInstagramDraft}
                error={contactErrors.instagram}
                placeholder="https://instagram.com/yourbusiness"
              />
              <ContactField
                icon={<Mail className="size-4" strokeWidth={1.75} />}
                iconBg="var(--color-accent)"
                label="Email"
                value={full?.contact_email}
                editing={editingContact}
                draft={emailDraft}
                onChange={setEmailDraft}
                error={contactErrors.email}
                placeholder="hello@yourbusiness.com"
              />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
