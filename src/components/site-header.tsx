import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

const navItems = [
  { label: "Browse", to: "/browse" as const },
  { label: "Post a Requirement", to: "/post-requirement" as const },
  { label: "Are you an influencer?", to: "/influencer" as const },
];

export function SiteHeader() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-serif text-2xl tracking-editorial text-primary">
          LuvLit
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-soft"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
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
      </div>
    </header>
  );
}
