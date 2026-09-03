import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Search = { role?: "business" | "customer" | "organizer"; redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    role:
      s.role === "business"
        ? "business"
        : s.role === "customer"
          ? "customer"
          : s.role === "organizer"
            ? "organizer"
            : undefined,
    redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create an account — LuvLit" },
      {
        name: "description",
        content:
          "Sign in to LuvLit to chat with businesses, save favourites and track your quotes — or create a business account to get listed.",
      },
      { property: "og:title", content: "Sign in or create an account — LuvLit" },
      { property: "og:description", content: "Accounts for customers and businesses on LuvLit." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(search.role ? "signup" : "signin");
  const [role, setRole] = useState<"business" | "customer" | "organizer">(search.role ?? "customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({
    type: "idle",
  });
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({
    type: "idle",
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === "signup") {
      // The DB's account_role type only has 'business'/'customer' — organizer status lives
      // entirely in organizer_profiles, not profiles.role — so an organizer signs up as a plain
      // customer account. The post-verify redirect below still sends them to organizer
      // onboarding via the `role` URL param, independent of what's stored in the DB.
      const accountRole = role === "organizer" ? "customer" : role;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { role: accountRole, name } },
      });
      setBusy(false);
      if (error) return setError(error.message);
      setShowVerifyModal(true);
      navigate({ to: "/verify-email", search: { role } });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setError(error.message);
      navigate({ to: search.redirect ?? "/dashboard" });
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setResetBusy(true);
    setResetStatus({ type: "idle" });
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetBusy(false);
    if (error) {
      setResetStatus({ type: "error", message: error.message });
      return;
    }
    // Supabase doesn't reveal whether the email is registered — same message either way, so
    // this can't be used to enumerate accounts.
    setResetStatus({
      type: "success",
      message: "If an account exists for that email, we've sent a password reset link.",
    });
  }

  async function resend() {
    if (!email || resendCooldown > 0) return;
    setResendStatus({ type: "idle" });
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setResendStatus({ type: "error", message: error.message });
    } else {
      setResendStatus({ type: "success", message: "Verification email sent." });
      setResendCooldown(30);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-24">
        <p className="eyebrow">
          {mode === "signup" ? "Create an account" : mode === "reset" ? "Reset your password" : "Welcome back"}
        </p>
        <h1 className="mt-4 text-4xl">
          {mode === "signup" ? "Join LuvLit" : mode === "reset" ? "Forgot your password?" : "Sign in"}
        </h1>

        {mode === "reset" ? (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              Enter the email on your account and we'll send you a link to set a new password.
            </p>
            <form onSubmit={submitReset} className="mt-10 space-y-5">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
              />
              {resetStatus.type === "success" && (
                <p className="text-sm text-accent">{resetStatus.message}</p>
              )}
              {resetStatus.type === "error" && (
                <p className="text-sm text-destructive">{resetStatus.message}</p>
              )}
              <button
                disabled={resetBusy}
                className="w-full rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {resetBusy ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="mt-8 text-sm text-muted-foreground">
              <button
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setMode("signin")}
              >
                Back to sign in
              </button>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={submit} className="mt-10 space-y-5">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {(["customer", "business", "organizer"] as const).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRole(r)}
                        className={`rounded-md border px-4 py-3 text-sm capitalize transition-colors ${
                          role === r ? "border-accent bg-accent-soft" : "border-border"
                        }`}
                      >
                        {r === "business" ? "Business owner" : r === "organizer" ? "Event organizer" : "Customer"}
                      </button>
                    ))}
                  </div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
                  />
                </>
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
              />
              {mode === "signin" && (
                <p className="text-right text-sm">
                  <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={() => {
                      setError(null);
                      setResetEmail(email);
                      setResetStatus({ type: "idle" });
                      setMode("reset");
                    }}
                  >
                    Forgot password?
                  </button>
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                disabled={busy}
                className="w-full rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <p className="mt-8 text-sm text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "New to LuvLit?"}{" "}
              <button
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              >
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              You can browse and book appointments without an account —{" "}
              <Link to="/browse" className="text-primary underline-offset-4 hover:underline">
                keep browsing
              </Link>
              .
            </p>
          </>
        )}
      </main>
      <SiteFooter />

      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check your email</DialogTitle>
            <DialogDescription>
              We&apos;ve sent a verification link to {email}. Click it to activate your account.
            </DialogDescription>
          </DialogHeader>
          {resendStatus.type === "success" && (
            <p className="text-sm text-accent">{resendStatus.message}</p>
          )}
          {resendStatus.type === "error" && (
            <p className="text-sm text-destructive">{resendStatus.message}</p>
          )}
          <DialogFooter className="sm:justify-between">
            <button
              type="button"
              onClick={resend}
              disabled={resendCooldown > 0}
              className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowVerifyModal(false);
                navigate({ to: "/verify-email", search: { role } });
              }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Continue
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
