import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

const NAV: { to: string; label: string; exact?: boolean }[] = [
  { to: "/business/dashboard", label: "Overview", exact: true },
  { to: "/business/dashboard/website", label: "Website Builder" },
  { to: "/business/dashboard/appointments", label: "Appointments" },
  { to: "/business/dashboard/staff", label: "Staff & Availability" },
  { to: "/business/dashboard/products", label: "Products" },
  { to: "/business/dashboard/leads", label: "Leads & Chats" },
  { to: "/business/dashboard/requirements", label: "Requirements" },
  { to: "/dashboard/find-influencer", label: "Find an Influencer" },
  { to: "/business/dashboard/profile", label: "Profile & Media" },
  { to: "/business/dashboard/featured", label: "Featured Placement" },
  { to: "/business/dashboard/billing", label: "Billing" },
];



export function BusinessDashboardSidebar({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`flex min-h-11 items-center rounded-md px-3 text-sm transition-colors ${
              active
                ? "bg-accent-soft text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <p className="text-sm font-medium">{businessName}</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 items-center rounded-md border border-border px-4 text-sm"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="border-b border-border px-4 py-3 md:hidden">{items}</div>
      )}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card px-4 py-6 md:flex md:flex-col md:gap-6">
        <div>
          <p className="eyebrow">Business</p>
          <p className="mt-1 truncate text-sm font-medium">{businessName}</p>
        </div>
        {items}
      </aside>
    </>
  );
}
