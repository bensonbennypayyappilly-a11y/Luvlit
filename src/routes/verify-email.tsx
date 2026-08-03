import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useSession } from "@/hooks/use-session";

type Search = { role?: "business" | "customer" | "influencer" };

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    role:
      s.role === "business" ? "business" : s.role === "customer" ? "customer" : s.role === "influencer" ? "influencer" : undefined,
  }),
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verify your email — LuvLit" },
      { name: "description", content: "Verify your email address to finish setting up your LuvLit account." },
      { property: "og:title", content: "Verify your email — LuvLit" },
      { property: "og:description", content: "Confirm your email to continue on LuvLit." },
    ],
  }),
  component: VerifyEmailPage,
});

function destinationFor(role: string | undefined) {
  if (role === "business") return "/business/onboarding";
  if (role === "influencer") return "/influencer/onboarding";
  return "/dashboard";
}

function VerifyEmailPage() {
  const search = Route.useSearch();
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({
    type: "idle",
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (user.email_confirmed_at) {
      resolveDestination();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next?.user?.email_confirmed_at) {
        resolveDestination();
      }
    });
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) {
        clearInterval(interval);
        resolveDestination();
      }
    }, 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveDestination() {
    if (search.role) {
      navigate({ to: destinationFor(search.role), replace: true });
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    navigate({ to: destinationFor(profile?.role as string | undefined), replace: true });
  }

  async function resend() {
    if (!user?.email || cooldown > 0) return;
    setStatus({ type: "idle" });
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "success", message: "Verification email sent." });
      setCooldown(30);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-24 text-center">
        <p className="eyebrow">One more step</p>
        <h1 className="mt-4 text-4xl">Check your email to verify your account</h1>
        <p className="mt-6 text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{user?.email ?? "your email address"}</span>.
          Click the link to continue.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Don&apos;t see it? Check your spam or promotions folder.
        </p>

        {status.type === "success" && (
          <p className="mt-6 text-sm text-accent-foreground">{status.message}</p>
        )}
        {status.type === "error" && (
          <p className="mt-6 text-sm text-destructive">{status.message}</p>
        )}

        <button
          onClick={resend}
          disabled={cooldown > 0}
          className="mt-8 rounded-md border border-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-soft disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend verification email (${cooldown}s)` : "Resend verification email"}
        </button>
      </main>
      <SiteFooter />
    </div>
  );
}
