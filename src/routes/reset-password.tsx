import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/reset-password")({
  // The recovery token Supabase puts in the URL is a hash fragment, which the server never
  // sees anyway — this has to resolve client-side, same as verify-email.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password — LuvLit" },
      { name: "description", content: "Set a new password for your LuvLit account." },
      { property: "og:title", content: "Reset your password — LuvLit" },
      { property: "og:description", content: "Set a new password for your LuvLit account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  // Waits for an actual auth event (or a short timeout) instead of trusting a single
  // getSession() read — the recovery link's session is established asynchronously as the
  // Supabase client parses the URL fragment on load, so reading too early would wrongly show
  // "invalid link" for a split second on every legitimate reset.
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setChecked(true);
    });
    const timeout = setTimeout(() => setChecked(true), 2500);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        setChecked(true);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate({ to: "/dashboard" }), 1800);
    return () => clearTimeout(t);
  }, [done, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-24">
        <p className="eyebrow">Account security</p>
        <h1 className="mt-4 text-4xl">Set a new password</h1>

        {!checked ? (
          <p className="mt-8 text-sm text-muted-foreground">Checking your reset link…</p>
        ) : done ? (
          <p className="mt-8 text-sm text-accent">
            Your password has been updated. Taking you to your dashboard…
          </p>
        ) : !session ? (
          <>
            <p className="mt-6 text-sm text-muted-foreground">
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Link
              to="/auth"
              className="mt-8 inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-5">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
            />
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              disabled={busy}
              className="w-full rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
