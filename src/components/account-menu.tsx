import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import type { AppRole } from "@/hooks/use-session";

export function AccountMenu({ label, role }: { label: string; role: AppRole }) {
  const [open, setOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
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
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent"
      >
        {label} <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-card py-1 text-sm surface-card">
          <a
            href="/profile"
            className="block px-4 py-2.5 text-foreground transition-colors hover:bg-accent-soft"
          >
            Profile
          </a>
          {role === "business" && (
            <a
              href="/business/dashboard/billing"
              className="block px-4 py-2.5 text-foreground transition-colors hover:bg-accent-soft"
            >
              Billing
            </a>
          )}
          <button
            onClick={signOut}
            className="block w-full px-4 py-2.5 text-left text-foreground transition-colors hover:bg-accent-soft"
          >
            Sign out
          </button>
          <button
            onClick={() => {
              setShowDelete(true);
              setOpen(false);
            }}
            className="block w-full px-4 py-2.5 text-left text-destructive transition-colors hover:bg-accent-soft"
          >
            Delete account
          </button>
        </div>
      )}
      {showDelete && <DeleteAccountDialog role={role} onClose={() => setShowDelete(false)} />}
    </div>
  );
}
