import { createFileRoute } from "@tanstack/react-router";
import { NotificationsList } from "@/components/notifications-list";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { useAccount } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — LuvLit" },
      { name: "description", content: "New quotes and messages from businesses you've contacted." },
      { property: "og:title", content: "Notifications — LuvLit" },
      { property: "og:description", content: "Your LuvLit activity in one place." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { userId } = useAccount();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <DashboardBackLink to="/dashboard" />
      <p className="eyebrow">Activity</p>
      <h1 className="mt-4 text-4xl">Notifications</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Quotes and messages from businesses you've contacted.</p>
      <div className="surface-card mt-10 p-2">
        <NotificationsList recipientType="customer" recipientId={userId} />
      </div>
    </div>
  );
}
