import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Section } from "@/lib/website-sections";

export type DashboardBusiness = {
  id: string;
  name: string;
  view_count: number;
  description: string | null;
  hero_image_url: string | null;
  gallery_urls: string[];
  whatsapp: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  status: string;
  // What the business offers — "product" | "appointment" | "custom" — drives which dashboard
  // nav items and Overview checklist entries are relevant (see business-dashboard-sidebar.tsx
  // and the Overview route). Set at onboarding, editable in Profile & Media.
  business_types: string[];
  // Published/live section layout (see src/lib/website-sections.ts). Not draft_sections —
  // dashboard reads of "what's actually live" should match what's published, same as every
  // other field on this type.
  sections: Section[];
};

export function useDashboardBusiness() {
  return useQuery({
    queryKey: ["dashboard-business"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data: business, error } = await supabase
        .from("businesses")
        .select(
          "id,name,view_count,description,hero_image_url,gallery_urls,whatsapp,contact_email,instagram_url,status,business_types,sections",
        )
        .eq("owner_id", userData.user.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return business as DashboardBusiness | null;
    },
  });
}
