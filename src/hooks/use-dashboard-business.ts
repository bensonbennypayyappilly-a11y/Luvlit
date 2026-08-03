import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardBusiness() {
  return useQuery({
    queryKey: ["dashboard-business"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data: business } = await supabase
        .from("businesses")
        .select("id,name,view_count")
        .eq("owner_id", userData.user.id)
        .is("deleted_at", null)
        .maybeSingle();
      return business as { id: string; name: string; view_count: number } | null;
    },
  });
}
