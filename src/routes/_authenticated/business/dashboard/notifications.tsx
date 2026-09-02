import { createFileRoute } from "@tanstack/react-router";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { NotificationsList } from "@/components/notifications-list";
import { DashboardBackLink } from "@/components/dashboard-back-link";

export const Route = createFileRoute("/_authenticated/business/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Business dashboard — LuvLit" },
      { name: "description", content: "New leads, messages and reviews for your business." },
      { property: "og:title", content: "Notifications — Business dashboard — LuvLit" },
      { property: "og:description", content: "Activity on your LuvLit business page." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: business } = useDashboardBusiness();

  return (
    <div>
      <DashboardBackLink />
      <p className="eyebrow">Notifications</p>
      <h1 className="mt-2 text-2xl font-medium">Activity</h1>
      <div className="dashboard-card mt-6 p-2">
        <NotificationsList recipientType="business" recipientId={business?.id ?? null} />
      </div>
    </div>
  );
}
