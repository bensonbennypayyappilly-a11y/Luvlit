import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount, useSession } from "@/hooks/use-session";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { DashboardBackLink } from "@/components/dashboard-back-link";

export const Route = createFileRoute("/_authenticated/business/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Business dashboard — LuvLit" },
      { name: "description", content: "Manage your personal account details for LuvLit." },
      { property: "og:title", content: "Settings — Business dashboard — LuvLit" },
      { property: "og:description", content: "Update your name, phone and contact email." },
    ],
  }),
  component: Settings,
});

/**
 * Owner-level account settings, distinct from Profile & Media (the public business page) and
 * Website Builder's Website Settings (brand/contact/domain). This page only covers the
 * `profiles` row for the signed-in owner — same table and shape as the customer settings page.
 */
function Settings() {
  const { userId } = useAccount();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle()).data,
  });

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name ?? "", phone: profile.phone ?? "", email: profile.email ?? "" });
    }
  }, [profile]);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ name: form.name || null, phone: form.phone || null, email: form.email || null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setSaved(true);
    queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <DashboardBackLink />
      <p className="eyebrow">Your account</p>
      <h1 className="mt-2 text-2xl font-medium">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your personal details as the owner of this account. Business-facing details live under{" "}
        <span className="font-medium text-foreground">Profile &amp; Media</span> and{" "}
        <span className="font-medium text-foreground">Website Builder</span>.
      </p>

      <div className="surface-card mt-8 space-y-5 p-6">
        <label className="block text-sm">
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          Phone
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          Contact email
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm"
          />
          <span className="mt-1.5 block text-xs text-muted-foreground">
            Used to reach you personally — this doesn't change your business's public contact email.
          </span>
        </label>
        <label className="block text-sm">
          Sign-in email
          <input
            value={user?.email ?? ""}
            disabled
            className="mt-2 w-full rounded-md border border-border bg-secondary px-4 py-2.5 text-sm text-muted-foreground"
          />
          <span className="mt-1.5 block text-xs text-muted-foreground">
            The email you use to sign in to LuvLit.
          </span>
        </label>
        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        </div>
      </div>

      <div className="surface-card mt-6 p-6">
        <h2 className="text-base font-medium">Delete account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your business profile goes offline immediately. Existing conversations stay visible to the other
          party. This can be reversed if you contact us.
        </p>
        <button
          onClick={() => setShowDelete(true)}
          className="mt-5 rounded-md border border-destructive px-6 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Delete my account
        </button>
      </div>
      {showDelete && <DeleteAccountDialog role="business" onClose={() => setShowDelete(false)} />}
    </div>
  );
}
