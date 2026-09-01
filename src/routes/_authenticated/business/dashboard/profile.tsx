import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { MediaUploader } from "@/components/media-uploader";
import { DashboardBackLink } from "@/components/dashboard-back-link";

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

function ProfilePage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const queryClient = useQueryClient();
  const [thumb, setThumb] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { data: full } = useQuery({
    queryKey: ["dashboard-profile-full", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      (
        await supabase
          .from("businesses")
          .select("name,description,categories,business_types,hero_image_url,main_video_url,short_video_urls,whatsapp,contact_email,instagram_url,is_eco_friendly")
          .eq("id", businessId!)
          .single()
      ).data,
  });

  useEffect(() => {
    if (full) setThumb(full.hero_image_url ?? null);
  }, [full]);

  async function saveThumb(path: string | null) {
    setThumb(path);
    if (!businessId) return;
    setStatus("Saving…");
    // The hero is a single slot — setting a photo here replaces a video hero, if one was set.
    const { error } = await supabase
      .from("businesses")
      .update(path ? { hero_image_url: path, main_video_url: null } : { hero_image_url: null })
      .eq("id", businessId);
    setStatus(error ? error.message : "Thumbnail updated — it now shows on your listing card.");
    if (!error) await queryClient.invalidateQueries({ queryKey: ["dashboard-profile-full", businessId] });
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
          Edit profile & media
        </Link>
      </div>

      {businessId && (
        <div className="mt-6">
          <p className="text-sm font-medium">Listing thumbnail</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This image is the cover on your card in browse & search results, and the hero on your
            own page. Landscape works best.
          </p>
          <div className="mt-4">
            <MediaUploader
              businessId={businessId}
              kind="hero"
              value={thumb}
              onChange={(path) => void saveThumb(path)}
            />
          </div>
          {status && <p className="mt-2 text-xs text-muted-foreground">{status}</p>}
        </div>
      )}

      {full && (
        <div className="surface-card mt-6 space-y-4 p-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="mt-1">{full.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="mt-1 text-muted-foreground">{full.description || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Categories</p>
            <p className="mt-1">{(full.categories ?? []).join(", ") || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Business types</p>
            <p className="mt-1">{(full.business_types ?? []).join(", ") || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Eco-friendly</p>
            <p className="mt-1">{full.is_eco_friendly ? "Yes" : "No"}</p>
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
        To change any of this, use the guided editor via "Edit profile & media" above.
      </p>
    </div>
  );
}
