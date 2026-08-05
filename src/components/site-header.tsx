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
];

const customerItems: NavItem[] = [
  { label: "Browse", to: "/browse" },
  { label: "My Requirements", to: "/dashboard/requirements" },
  { label: "Saved Businesses", to: "/dashboard/saved" },
];

const influencerItems: NavItem[] = [
  { label: "Dashboard", to: "/influencer/status" },
  { label: "My Profile", to: "/influencer/onboarding" },
  { label: "Chats", to: "/dashboard/chats" },
];

const KNOWN_ROUTES = new Set([
  "/browse",
  "/influencer",
  "/post-requirement",
  "/dashboard/find-influencer",
  "/influencer/status",
  "/influencer/onboarding",
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

/** Looks up whether the signed-in user has an organizer profile, to route "Post an event" correctly. */
function useOrganizerLink(): string {
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
  if (!user) return "/organizer/onboarding";
  return data ? "/organizer/dashboard" : "/organizer/onboarding";
}

export function SiteHeader() {
  const { loading, role, displayName, businessName } = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const organizerLink = useOrganizerLink();

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
            ];

  const items: NavItem[] = [...roleItems, { label: "Post an event", to: organizerLink }];

  const accountLabel =
    role === "business" ? businessName ?? "Your business" : displayName ?? "Account";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5 text-primary">
          <LuvLitLogo className="h-8 w-8" />
          <span className="font-serif text-2xl tracking-editorial">LuvLit</span>
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
          <nav className="flex flex-col gap-4">
            {items.map((item) => (
              <NavLink key={item.label} item={item} />
            ))}
            {!loading && role && <AccountMenu label={accountLabel} role={role} />}
            {!loading && !role && (
              <>
                <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  search={{ role: "business" }}
                  className="w-fit rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-soft"
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
