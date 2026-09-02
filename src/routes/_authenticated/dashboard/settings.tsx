import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { useAccount } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Account settings — LuvLit" },
      {
        name: "description",
        content: "Manage your LuvLit account details.",
      },
      { property: "og:title", content: "Account settings — LuvLit" },
      { property: "og:description", content: "Update your name, phone and email." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { userId } = useAccount();
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
      <DashboardBackLink to="/dashboard" />
      <p className="eyebrow">Your account</p>
        <h1 className="mt-4 text-4xl">Account settings</h1>

        <div className="surface-card mt-10 space-y-5 p-8">
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
              Used to reach you — this doesn't change the email you sign in with.
            </span>
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>
        </div>

        <div className="surface-card mt-8 p-8">
          <h2 className="text-xl">Delete account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This archives your data and signs you out. It can be reversed if you contact us.
          </p>
          <button
            onClick={() => setShowDelete(true)}
            className="mt-5 rounded-md border border-destructive px-6 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            Delete my account
          </button>
        </div>
      {showDelete && <DeleteAccountDialog role="customer" onClose={() => setShowDelete(false)} />}
    </div>
  );
}
