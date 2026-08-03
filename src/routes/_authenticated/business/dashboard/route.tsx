import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { BusinessDashboardSidebar } from "@/components/business-dashboard-sidebar";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";

export const Route = createFileRoute("/_authenticated/business/dashboard")({
  head: () => ({
    meta: [
      { title: "Business dashboard — LuvLit" },
      {
        name: "description",
        content: "Manage appointments, products, leads, requirements and billing for your LuvLit business page.",
      },
      { property: "og:title", content: "Business dashboard — LuvLit" },
      { property: "og:description", content: "Your LuvLit business command centre." },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { data, isLoading } = useDashboardBusiness();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="eyebrow">Almost there</p>
          <h1 className="mt-4 text-3xl">Finish setting up your business</h1>
          <p className="mt-4 text-muted-foreground">
            You need a published business page before you can use the dashboard.
          </p>
          <Link
            to="/business/onboarding"
            className="mt-8 rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground"
          >
            Finish onboarding
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 flex-col md:flex-row">
        <BusinessDashboardSidebar businessName={data.name} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
