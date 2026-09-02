import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { CustomerDashboardSidebar } from "@/components/customer-dashboard-sidebar";
import { useAccount } from "@/hooks/use-session";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

/** find-influencer.tsx lives under this same /dashboard route tree but is a business tool, not
 * a customer page — a signed-in business owner reaches it from their own (separate) sidebar.
 * Showing them the customer sidebar here would be actively wrong, so a business-role visitor
 * gets the plain header-only shell instead of the customer chrome. */
function DashboardLayout() {
  const { loading, displayName, role } = useAccount();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <div className="flex flex-1 flex-col md:flex-row">
          <div className="w-full shrink-0 space-y-2 border-b border-border p-4 md:w-60 md:border-b-0 md:border-r md:p-6">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <main className="flex-1 space-y-4 px-4 py-6 md:px-8 md:py-8">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-32 w-full" />
          </main>
        </div>
      </div>
    );
  }

  if (role === "business") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 flex-col md:flex-row">
        <CustomerDashboardSidebar displayName={displayName ?? "Your account"} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
