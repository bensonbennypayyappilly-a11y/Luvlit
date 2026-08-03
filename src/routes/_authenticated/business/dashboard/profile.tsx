import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Profile & Media</p>
          <h1 className="mt-2 text-2xl font-medium">Your business page</h1>
        </div>
        <Link to="/business/onboarding" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          Edit profile & media
        </Link>
      </div>

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
