import { Link } from "@tanstack/react-router";

/** Standard "back to the dashboard home" link, shown at the top of every business dashboard
 * subpage so there's always an explicit way back in addition to the sidebar. Pass `className`
 * to override the default stacked-above-content spacing (e.g. inside an existing flex row). */
export function DashboardBackLink({ className = "mb-4" }: { className?: string }) {
  return (
    <Link
      to="/business/dashboard"
      className={`inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground ${className}`}
    >
      ← Back to Overview
    </Link>
  );
}
