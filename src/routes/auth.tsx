import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Search = { role?: "business" | "customer"; redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    role: s.role === "business" ? "business" : s.role === "customer" ? "customer" : undefined,
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
  const [mode, setMode] = useState<"signin" | "signup">(search.role ? "signup" : "signin");
  const [role, setRole] = useState<"business" | "customer">(search.role ?? "customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { role, name } },
      });
      setBusy(false);
      if (error) return setError(error.message);
      navigate({ to: "/verify-email", search: { role } });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setError(error.message);
      navigate({ to: search.redirect ?? "/dashboard" });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-24">
        <p className="eyebrow">{mode === "signup" ? "Create an account" : "Welcome back"}</p>
        <h1 className="mt-4 text-4xl">{mode === "signup" ? "Join LuvLit" : "Sign in"}</h1>

        <form onSubmit={submit} className="mt-10 space-y-5">
          {mode === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {(["customer", "business"] as const).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-md border px-4 py-3 text-sm capitalize transition-colors ${
                      role === r ? "border-accent bg-accent-soft" : "border-border"
                    }`}
                  >
                    {r === "business" ? "Business owner" : "Customer"}
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
      </main>
      <SiteFooter />
    </div>
  );
}
