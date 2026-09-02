import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Calendar,
  ClipboardList,
  CreditCard,
  Globe,
  Handshake,
  Home,
  Image,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
  Star,
  UserSearch,
  Users,
  type LucideIcon,
} from "lucide-react";

type NavItemDef = { to: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItemDef[] = [
  { to: "/business/dashboard", label: "Overview", icon: Home, exact: true },
  { to: "/business/dashboard/leads", label: "Leads & Chats", icon: MessageSquare },
  { to: "/business/dashboard/requirements", label: "Requirements", icon: ClipboardList },
  { to: "/business/dashboard/appointments", label: "Appointments", icon: Calendar },
  { to: "/business/dashboard/products", label: "Products", icon: Package },
  { to: "/business/dashboard/services", label: "Services", icon: Sparkles },
  { to: "/business/dashboard/staff", label: "Staff & Availability", icon: Users },
  { to: "/dashboard/find-influencer", label: "Find an Influencer", icon: UserSearch },
  { to: "/business/dashboard/collaborations", label: "Collaborations", icon: Handshake },
  { to: "/business/dashboard/profile", label: "Profile & Media", icon: Image },
  { to: "/business/dashboard/featured", label: "Featured Placement", icon: Star },
  { to: "/business/dashboard/billing", label: "Billing", icon: CreditCard },
  { to: "/business/dashboard/website", label: "Website Builder", icon: Globe },
];

const SETTINGS_ITEM: NavItemDef = { to: "/business/dashboard/settings", label: "Settings", icon: Settings };

function NavRow({ item, pathname, onNavigate }: { item: NavItemDef; pathname: string; onNavigate: () => void }) {
  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 ${
        active ? "bg-white/15 font-medium text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
      }`}
    >
      <Icon className={`size-[18px] shrink-0 ${active ? "text-white" : "text-white/50"}`} strokeWidth={1.75} aria-hidden="true" />
      {item.label}
    </Link>
  );
}

/** Single shared list of main-nav rows — used for both the desktop rail and the mobile drawer,
 * so there's exactly one navigation system re-rendered at two widths, never two separate ones. */
function NavList({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => (
        <NavRow key={item.to} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export function BusinessDashboardSidebar({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <div className="flex items-center justify-between bg-primary px-4 py-3 md:hidden">
        <p className="text-sm font-medium text-white">{businessName}</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 items-center rounded-md border border-white/25 px-4 text-sm text-white transition-colors hover:bg-white/10"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="space-y-3 bg-primary px-4 py-3 md:hidden">
          <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
          <div className="border-t border-white/10 pt-3">
            <NavRow item={SETTINGS_ITEM} pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <aside className="hidden w-64 shrink-0 bg-primary px-4 py-6 md:flex md:h-full md:flex-col md:gap-6">
        <div className="px-3">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-white/50">Business</p>
          <p className="mt-1 truncate text-sm font-medium text-white">{businessName}</p>
        </div>
        <NavList pathname={pathname} onNavigate={() => {}} />
        <div className="mt-auto border-t border-white/10 pt-3">
          <NavRow item={SETTINGS_ITEM} pathname={pathname} onNavigate={() => {}} />
        </div>
      </aside>
    </>
  );
}
