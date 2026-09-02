import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { MediaUploader } from "@/components/media-uploader";
import { GalleryEditor } from "@/components/website-builder/gallery-editor";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { CardListSkeleton } from "@/components/ui/skeleton-shapes";
import { Switch } from "@/components/ui/switch";
import { BUSINESS_TYPES, ECO_CATEGORIES } from "@/lib/constants";

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

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function ProfilePage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const queryClient = useQueryClient();

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [thumbnailStatus, setThumbnailStatus] = useState<string | null>(null);
  const [descriptionStatus, setDescriptionStatus] = useState<string | null>(null);

  // Everything set during onboarding (description, categories, business type, eco-friendly)
  // lives here and only here — Website Builder shows it read-only with a link back to this
  // page, so there's exactly one place these can be edited and never two writers racing.
  // The hero image is the mirror case: fetched nowhere on this page, editable only in
  // Website Builder — so the two truly can't overwrite each other.
  const { data: full, isLoading: fullLoading } = useQuery({
    queryKey: ["dashboard-profile-full", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      (
        await supabase
          .from("businesses")
          .select("name,description,categories,business_types,thumbnail_url,gallery_urls,main_video_url,short_video_urls,whatsapp,contact_email,instagram_url,is_eco_friendly")
          .eq("id", businessId!)
          .single()
      ).data,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("id,name").eq("is_approved", true).order("name")).data ?? [],
  });

  useEffect(() => {
    if (full) {
      setThumbnail(full.thumbnail_url ?? null);
      setGallery(full.gallery_urls ?? []);
      setDescription(full.description ?? "");
    }
  }, [full]);

  const businessCategories = full?.categories ?? [];
  const businessTypes = full?.business_types ?? [];
  const showEco = businessCategories.some((c) => ECO_CATEGORIES.includes(c));

  type BusinessPatch = {
    thumbnail_url?: string | null;
    description?: string;
    categories?: string[];
    business_types?: string[];
    is_eco_friendly?: boolean;
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

  async function saveThumbnail(path: string | null) {
    setThumbnail(path);
    setThumbnailStatus("Saving…");
    const error = await commit({ thumbnail_url: path });
    setThumbnailStatus(error ? error.message : "Thumbnail updated — it now shows on your listing card.");
  }

  function onGallerySaved(urls: string[]) {
    setGallery(urls);
    queryClient.invalidateQueries({ queryKey: ["dashboard-profile-full", businessId] });
  }

  async function saveDescription() {
    if (description === (full?.description ?? "")) return;
    setDescriptionStatus("Saving…");
    const error = await commit({ description });
    setDescriptionStatus(error ? error.message : "Saved.");
  }

  async function saveCategories(next: string[]) {
    const wasEco = businessCategories.some((c) => ECO_CATEGORIES.includes(c));
    const stillEco = next.some((c) => ECO_CATEGORIES.includes(c));
    // Eco-friendly only makes sense for a category that supports it — dropping the last
    // qualifying category clears the flag too, same rule onboarding applies.
    await commit(wasEco && !stillEco ? { categories: next, is_eco_friendly: false } : { categories: next });
  }

  return (
    <div>
      <DashboardBackLink />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Profile & Media</p>
          <h1 className="mt-2 text-2xl font-medium">Your business page</h1>
        </div>
        <Link
          to="/business/dashboard/website"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Open Website Builder
        </Link>
      </div>

      {businessId && (
        <div className="mt-6">
          <p className="text-sm font-medium">Thumbnail picture</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The cover image on your card in browse & search results. This is separate from your
            page's hero image, which is set in{" "}
            <Link to="/business/dashboard/website" className="text-accent hover:underline">
              Website Builder
            </Link>
            . Landscape works best.
          </p>
          <div className="mt-4">
            <MediaUploader
              businessId={businessId}
              kind="thumbnail"
              value={thumbnail}
              onChange={(path) => void saveThumbnail(path)}
              wrapperClassName="dashboard-card p-5"
            />
          </div>
          {thumbnailStatus && <p className="mt-2 text-xs text-muted-foreground">{thumbnailStatus}</p>}
        </div>
      )}

      {businessId && (
        <div className="mt-6">
          <p className="text-sm font-medium">Description</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Shown on your listing card and used as your page's default tagline unless you set a
            custom one in Website Builder's Hero section.
          </p>
          <div className="mt-4 dashboard-card p-5">
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Describe what you do, in a couple of sentences."
              className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
            {descriptionStatus && <p className="mt-2 text-xs text-muted-foreground">{descriptionStatus}</p>}
          </div>
        </div>
      )}

      {businessId && (
        <div className="mt-6">
          <p className="text-sm font-medium">Categories & business type</p>
          <p className="mt-1 text-xs text-muted-foreground">
            What you offer and how customers buy from you — set during onboarding, editable here
            any time.
          </p>
          <div className="mt-4 dashboard-card space-y-5 p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Categories</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(categories ?? []).map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => void saveCategories(toggle(businessCategories, c.name))}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors duration-150 ${
                      businessCategories.includes(c.name) ? "border-accent bg-accent-soft text-accent" : "border-border hover:border-accent/40"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Business type</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BUSINESS_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => void commit({ business_types: toggle(businessTypes, t.value) })}
                    title={t.hint}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors duration-150 ${
                      businessTypes.includes(t.value) ? "border-accent bg-accent-soft text-accent" : "border-border hover:border-accent/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {showEco && (
              <label className="flex items-center justify-between rounded-md border border-border px-4 py-3.5 text-sm">
                <span>Eco-friendly / sustainable?</span>
                <Switch
                  checked={full?.is_eco_friendly ?? false}
                  onCheckedChange={(checked) => void commit({ is_eco_friendly: checked })}
                />
              </label>
            )}
          </div>
        </div>
      )}

      {businessId && (
        <div className="mt-6">
          <p className="text-sm font-medium">Gallery pictures</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Extra photos shown on your public page's gallery section. Separate from your thumbnail
            and hero image.
          </p>
          <div className="mt-4 dashboard-card p-5">
            <GalleryEditor businessId={businessId} value={gallery} onSaved={onGallerySaved} />
          </div>
        </div>
      )}

      {fullLoading && <CardListSkeleton rows={1} />}

      {full && (
        <div className="dashboard-card mt-6 space-y-4 p-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="mt-1">{full.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Main video</p>
            <p className="mt-1 truncate">{full.main_video_url || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Short videos</p>
            <p className="mt-1">{(full.short_video_urls ?? []).length} added</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Contact</p>
            <p className="mt-1 text-muted-foreground">
              {full.whatsapp || "—"} · {full.contact_email || "—"} · {full.instagram_url || "—"}
            </p>
          </div>
        </div>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        Name, main video, short videos, contact links and colours are set in Website Builder.
      </p>
    </div>
  );
}
