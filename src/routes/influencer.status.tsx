import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getInfluencerApplicationStatus } from "@/lib/public.functions";

export const Route = createFileRoute("/influencer/status")({
  head: () => ({
    meta: [
      { title: "Check your influencer application status — LuvLit" },
      {
        name: "description",
        content:
          "Look up your LuvLit influencer application with the email or phone number you applied with, and see whether it is pending, approved or rejected.",
      },
      { property: "og:title", content: "Check your influencer application status — LuvLit" },
      { property: "og:description", content: "Pending, approved or rejected — check any time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StatusLookup,
});

const COPY: Record<string, { label: string; body: string }> = {
  pending: {
    label: "Under review",
    body: "Your application is with our team. Reviews are manual, so this can take a few days — nothing more is needed from you right now.",
  },
  approved: {
    label: "Approved",
    body: "You're live. Brands with a business account can now find you by category, city and follower range, and message you directly.",
  },
  rejected: {
    label: "Not approved",
    body: "We couldn't approve this application. This is usually because the handle couldn't be verified or the stated reach didn't match. You're welcome to write to us and reapply.",
  },
};

function StatusLookup() {
  const [contact, setContact] = useState("");
  const [result, setResult] = useState<null | { found: boolean; status?: string; submitted_at?: string }>(
    null,
  );
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const res = await getInfluencerApplicationStatus({ data: { contact } });
    setResult(res);
    setBusy(false);
  }

  const copy = result?.status ? COPY[result.status] : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
        <p className="eyebrow">For creators</p>
        <h1 className="mt-4 text-4xl">Check application status</h1>
        <p className="mt-6 text-muted-foreground">
          Enter the email address or phone number on your LuvLit account.
        </p>

        <form onSubmit={lookup} className="surface-card mt-10 space-y-5 p-8">
          <input
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email or phone number"
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
            aria-label="Email or phone number"
          />
          <button
            disabled={busy}
            className="rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Looking up…" : "Check status"}
          </button>
        </form>

        {result && !result.found && (
          <div className="surface-card mt-8 p-8">
            <p className="text-muted-foreground">
              We couldn't find an application for that email or phone number. Make sure it matches
              the one on your account, or{" "}
              <Link to="/influencer/onboarding" className="text-primary hover:underline">
                start an application
              </Link>
              .
            </p>
          </div>
        )}

        {result?.found && copy && (
          <div className="surface-card mt-8 p-8">
            <p className="eyebrow">Status</p>
            <h2 className="mt-3 text-2xl">{copy.label}</h2>
            <p className="mt-4 text-muted-foreground">{copy.body}</p>
            {result.submitted_at && (
              <p className="mt-4 text-sm text-muted-foreground">
                Submitted {new Date(result.submitted_at).toLocaleDateString("en-IN")}
              </p>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
