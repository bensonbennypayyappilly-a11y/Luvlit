import { Link } from "@tanstack/react-router";

/** Standard "back to the dashboard home" link, shown at the top of every dashboard subpage
 * (business and customer) so there's always an explicit way back in addition to the sidebar.
 * Pass `className` to override the default stacked-above-content spacing (e.g. inside an
 * existing flex row), or `to` for a dashboard home other than the business one. */
export function DashboardBackLink({ className = "mb-4", to = "/business/dashboard" }: { className?: string; to?: string }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground ${className}`}
    >
      ← Back to Overview
    </Link>
  );
}
