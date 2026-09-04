import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Query keys deliberately match what NotificationsList.markRead() already invalidates
 * (see src/components/notifications-list.tsx), so marking a notification read anywhere
 * updates this badge immediately with no extra wiring. */
function queryKeyFor(recipientType: "business" | "customer" | "influencer", recipientId: string | null) {
  if (recipientType === "business") return ["sidebar-unread-notifications", recipientId] as const;
  if (recipientType === "influencer") return ["influencer-unread-notifications", recipientId] as const;
  return ["customer-unread-notifications", recipientId] as const;
}

export function useUnreadNotifications(recipientType: "business" | "customer" | "influencer", recipientId: string | null) {
  return useQuery({
    queryKey: queryKeyFor(recipientType, recipientId),
    enabled: !!recipientId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_type", recipientType)
        .eq("recipient_id", recipientId!)
        .is("read_at", null);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });
}
