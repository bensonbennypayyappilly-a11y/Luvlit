import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NotificationsList } from "@/components/notifications-list";
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
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
        <p className="eyebrow">Activity</p>
        <h1 className="mt-4 text-4xl">Notifications</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">Quotes and messages from businesses you've contacted.</p>
        <div className="surface-card mt-10 p-2">
          <NotificationsList recipientType="customer" recipientId={userId} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
