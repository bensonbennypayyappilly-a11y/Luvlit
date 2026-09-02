import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import type { AppRole } from "@/hooks/use-session";

/** Where "Profile" in the account menu goes — there's no single /profile route, each role has
 * its own home for account details. */
const PROFILE_PATH: Record<NonNullable<AppRole>, string> = {
  business: "/business/dashboard/profile",
  customer: "/dashboard/settings",
  influencer: "/influencer/onboarding",
};

export function AccountMenu({ label, role }: { label: string; role: AppRole }) {
  const [open, setOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function signOut() {
    setSignOutError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSignOutError(error.message);
      return;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm font-medium text-foreground transition-colors hover:border-accent"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-primary-foreground">
          {label.trim().charAt(0) || "?"}
        </span>
        <span className="max-w-32 truncate">{label}</span>
        <span aria-hidden className="text-muted-foreground">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-card py-1 text-sm surface-card">
          {role && (
            <Link
              to={PROFILE_PATH[role]}
              className="flex min-h-11 items-center px-4 text-foreground transition-colors hover:bg-accent-soft"
            >
              Profile
            </Link>
          )}
          {role === "business" && (
            <Link
              to="/business/dashboard/billing"
              className="flex min-h-11 items-center px-4 text-foreground transition-colors hover:bg-accent-soft"
            >
              Billing
            </Link>
          )}
          <button
            onClick={signOut}
            className="flex min-h-11 w-full items-center px-4 text-left text-foreground transition-colors hover:bg-accent-soft"
          >
            Sign out
          </button>
          {signOutError && <p className="px-4 pb-2 text-xs text-destructive">{signOutError}</p>}
          <button
            onClick={() => {
              setShowDelete(true);
              setOpen(false);
            }}
            className="flex min-h-11 w-full items-center px-4 text-left text-destructive transition-colors hover:bg-accent-soft"
          >
            Delete account
          </button>
        </div>
      )}
      {showDelete && <DeleteAccountDialog role={role} onClose={() => setShowDelete(false)} />}
    </div>
  );
}
