import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useSession } from "@/hooks/use-session";
import { AccountMenu } from "@/components/account-menu";
import { LuvLitLogo } from "@/components/luvlit-logo";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { label: string; to: string };

const businessItems: NavItem[] = [
  { label: "Dashboard", to: "/business/dashboard" },
  { label: "Appointments", to: "/business/dashboard/appointments" },
  { label: "Leads", to: "/business/dashboard/leads" },
  { label: "Post a Requirement", to: "/post-requirement" },
  { label: "Find an Influencer", to: "/dashboard/find-influencer" },
  { label: "Events", to: "/events" },
];

const customerItems: NavItem[] = [
  { label: "Browse", to: "/browse" },
  { label: "Post a Requirement", to: "/post-requirement" },
  { label: "My Requirements", to: "/dashboard/requirements" },
  { label: "Saved Businesses", to: "/dashboard/saved" },
  { label: "Events", to: "/events" },
];

const influencerItems: NavItem[] = [
  { label: "Dashboard", to: "/influencer/status" },
  { label: "My Profile", to: "/influencer/onboarding" },
  { label: "Requests", to: "/influencer/requests" },
  { label: "Chats", to: "/dashboard/chats" },
  { label: "Events", to: "/events" },
];

const KNOWN_ROUTES = new Set([
  "/browse",
  "/influencer",
  "/post-requirement",
  "/dashboard/find-influencer",
  "/dashboard/requirements",
  "/dashboard/saved",
  "/dashboard/chats",
  "/influencer/status",
  "/influencer/onboarding",
  "/influencer/requests",
  "/events",
  "/organizer/dashboard",
  "/business/dashboard",
  "/business/dashboard/appointments",
  "/business/dashboard/leads",
]);

function NavLink({ item, block = false }: { item: NavItem; block?: boolean }) {
  const className = block
    ? "flex min-h-11 w-full items-center text-sm text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
    : "text-sm text-muted-foreground transition-colors hover:text-foreground";
  if (KNOWN_ROUTES.has(item.to)) {
    return (
      <Link to={item.to} className={className}>
        {item.label}
      </Link>
    );
  }
  return (
    <a href={item.to} className={className}>
      {item.label}
    </a>
  );
}

/** Whether the signed-in user has an organizer_profiles row, so we can surface "Post an event" only to them. */
function useIsOrganizer(): boolean {
  const { user } = useSession();
  const { data } = useQuery({
    queryKey: ["organizer-profile", user?.id ?? null],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });
  return !!data;
}

export function SiteHeader() {
  const { loading, role, displayName, businessName } = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isOrganizer = useIsOrganizer();

  const roleItems = loading
    ? []
    : role === "business"
      ? businessItems
      : role === "customer"
        ? customerItems
        : role === "influencer"
          ? influencerItems
          : [
              { label: "Browse", to: "/browse" },
              { label: "Are you an influencer?", to: "/influencer" },
              { label: "Post a Requirement", to: "/post-requirement" },
              { label: "Events", to: "/events" },
            ];

  const items: NavItem[] = [...roleItems];
  if (isOrganizer) {
    items.push({ label: "Post an event", to: "/organizer/dashboard" });
  }

  const accountLabel =
    role === "business" ? (businessName ?? "Your business") : (displayName ?? "Account");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5 text-primary">
          <LuvLitLogo className="h-8 w-8" />
          <span className="text-2xl font-semibold tracking-editorial">LuvLit</span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {items.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 lg:flex">
            {!loading && role && <AccountMenu label={accountLabel} role={role} />}
            {!loading && !role && (
              <>
                <Link
                  to="/auth"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  search={{ role: "business" }}
                  className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
                >
                  List your business
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-base lg:hidden"
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border px-6 py-2 lg:hidden">
          <nav className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <NavLink key={item.label} item={item} block />
            ))}
            {!loading && role && (
              <div className="flex min-h-11 w-full items-center">
                <AccountMenu label={accountLabel} role={role} />
              </div>
            )}
            {!loading && !role && (
              <>
                <Link
                  to="/auth"
                  className="flex min-h-11 w-full items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Link>
                <div className="flex items-center py-2.5">
                  <Link
                    to="/auth"
                    search={{ role: "business" }}
                    className="flex min-h-11 w-fit items-center rounded-md border border-accent px-4 text-sm font-medium text-accent hover:bg-accent-soft"
                  >
                    List your business
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
