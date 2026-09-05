import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Lock, Phone, User as UserIcon, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount, useSession } from "@/hooks/use-session";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { hasErrors, validateEmail, validatePhone } from "@/lib/website-validation";

type Role = "business" | "customer";

/** The two Settings pages (business and customer) are the same form over the same `profiles`
 * row — only the surrounding copy, the delete-account consequences, and the card styling differ
 * (dashboard-card is deliberately business-dashboard-only, per its own comment in styles.css; the
 * rest of the app keeps surface-card). Sharing the form itself means validation, input types and
 * the field-icon treatment only need to exist — and get polished — in one place. */
const STYLE: Record<Role, { card: string; delete: string; heading: string; backTo?: string }> = {
  business: { card: "dashboard-card p-6", delete: "dashboard-card p-6", heading: "mt-2 text-2xl font-medium", backTo: undefined },
  customer: { card: "surface-card p-8", delete: "surface-card p-8", heading: "mt-4 text-4xl", backTo: "/dashboard" },
};

const COPY: Record<Role, { title: string; intro: ReactNode; deleteBody: string }> = {
  business: {
    title: "Settings",
    intro: (
      <>
        Your personal details as the owner of this account. Business-facing details live under{" "}
        <span className="font-medium text-foreground">Profile &amp; Media</span> and{" "}
        <span className="font-medium text-foreground">Website Builder</span>.
      </>
    ),
    deleteBody:
      "Your business profile goes offline immediately. Existing conversations stay visible to the other party. This can be reversed if you contact us.",
  },
  customer: {
    title: "Account settings",
    intro: "Your personal details as a LuvLit customer.",
    deleteBody: "This archives your data and signs you out. It can be reversed if you contact us.",
  },
};

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
      {children}
    </span>
  );
}

export function AccountSettingsForm({ role }: { role: Role }) {
  const { userId } = useAccount();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const style = STYLE[role];
  const copy = COPY[role];

  const { data: profile } = useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle()).data,
  });

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name ?? "", phone: profile.phone ?? "", email: profile.email ?? "" });
    }
  }, [profile]);

  const errors = { phone: validatePhone(form.phone), email: validateEmail(form.email) };

  async function save() {
    if (!userId || hasErrors(errors)) return;
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

  const signInEmail = user?.email ?? "";
  const contactMatchesSignIn = !!form.email && form.email === signInEmail;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <DashboardBackLink to={style.backTo} />
      <p className="eyebrow">Your account</p>
      <h1 className={style.heading}>{copy.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{copy.intro}</p>

      <div className={`${style.card} mt-8 space-y-5`}>
        <label className="block text-sm">
          <span className="flex items-center gap-2.5">
            <FieldIcon>
              <UserIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </FieldIcon>
            Name
          </span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="flex items-center gap-2.5">
            <FieldIcon>
              <Phone className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </FieldIcon>
            Phone
          </span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 98765 43210"
            className={`mt-2 w-full rounded-md border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent ${
              errors.phone ? "border-destructive" : "border-border"
            }`}
          />
          {errors.phone && <span className="mt-1.5 block text-xs text-destructive">{errors.phone}</span>}
        </label>
        <label className="block text-sm">
          <span className="flex items-center gap-2.5">
            <FieldIcon>
              <Mail className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </FieldIcon>
            Contact email
          </span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className={`mt-2 w-full rounded-md border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent ${
              errors.email ? "border-destructive" : "border-border"
            }`}
          />
          {errors.email ? (
            <span className="mt-1.5 block text-xs text-destructive">{errors.email}</span>
          ) : (
            <span className="mt-1.5 block text-xs text-muted-foreground">
              {contactMatchesSignIn
                ? "Currently the same as your sign-in email below — change it here if you'd like people to reach you somewhere else."
                : "Used to reach you personally" + (role === "business" ? " — this doesn't change your business's public contact email." : ".")}
            </span>
          )}
        </label>
        <label className="block text-sm">
          <span className="flex items-center gap-2.5">
            <FieldIcon>
              <Lock className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </FieldIcon>
            Sign-in email
          </span>
          <input
            type="email"
            value={signInEmail}
            disabled
            className="mt-2 w-full rounded-md border border-border bg-secondary px-4 py-2.5 text-sm text-muted-foreground"
          />
          <span className="mt-1.5 block text-xs text-muted-foreground">The email you use to sign in to LuvLit.</span>
        </label>
        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving || hasErrors(errors)}
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-accent">
              <CheckCircle2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
              Saved
            </span>
          )}
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        </div>
      </div>

      <div className={`${style.delete} mt-6`}>
        <h2 className="text-base font-medium">Delete account</h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.deleteBody}</p>
        <button
          onClick={() => setShowDelete(true)}
          className="mt-5 rounded-md border border-destructive px-6 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Delete my account
        </button>
      </div>
      {showDelete && <DeleteAccountDialog role={role} onClose={() => setShowDelete(false)} />}
    </div>
  );
}
