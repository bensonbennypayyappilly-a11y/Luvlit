import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-session";

const CONSEQUENCES: Record<string, string> = {
  business:
    "Your business profile goes offline immediately. Existing conversations stay visible to the other party, marked “This business account has been deleted”.",
  customer: "Your saved businesses and requirement history are removed from view.",
  influencer: "Your profile is removed from Find an Influencer results immediately.",
};

export function DeleteAccountDialog({
  role,
  onClose,
}: {
  role: AppRole;
  onClose: () => void;
}) {
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function confirm() {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("soft_delete_account");
    if (rpcError) {
      setBusy(false);
      return setError(rpcError.message);
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8">
        <h2 className="text-2xl">Delete your account</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          {CONSEQUENCES[role ?? "customer"] ?? CONSEQUENCES.customer}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          We keep your data archived rather than erasing it, so a deletion can be reversed if you
          contact us.
        </p>
        <label className="mt-6 block text-sm">
          Type <span className="font-medium">DELETE</span> to confirm
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm"
          />
        </label>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-5 py-2.5 text-sm hover:border-accent"
          >
            Cancel
          </button>
          <button
            disabled={phrase !== "DELETE" || busy}
            onClick={confirm}
            className="rounded-md bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
