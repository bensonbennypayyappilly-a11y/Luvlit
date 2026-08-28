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
  "/influencer/status",
  "/influencer/onboarding",
  "/influencer/requests",
  "/events",
  "/organizer/dashboard",
]);

function NavLink({ item }: { item: NavItem }) {
  const className = "text-sm text-muted-foreground transition-colors hover:text-foreground";
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
    role === "business" ? businessName ?? "Your business" : displayName ?? "Account";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5 text-primary">
          <LuvLitLogo className="h-8 w-8" />
          <span className="text-2xl font-semibold tracking-editorial">LuvLit</span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {items.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 md:flex">
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
                  className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-soft"
                >
                  List your business
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-md border border-border px-3 py-2 text-sm md:hidden"
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border px-6 py-4 md:hidden">
          <nav className="flex flex-col">
            {items.map((item) => (
              <div key={item.label} className="py-2.5">
                <NavLink item={item} />
              </div>
            ))}
            {!loading && role && (
              <div className="py-2.5">
                <AccountMenu label={accountLabel} role={role} />
              </div>
            )}
            {!loading && !role && (
              <>
                <Link
                  to="/auth"
                  className="py-2.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  search={{ role: "business" }}
                  className="my-2.5 w-fit rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-soft"
                >
                  List your business
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
