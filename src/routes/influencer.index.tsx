import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/influencer/")({
  head: () => ({
    meta: [
      { title: "Are you an influencer? Apply to join LuvLit" },
      {
        name: "description",
        content:
          "Indian creators can apply to join LuvLit's reviewed influencer directory — free to list, and brands reach out to you directly. Check your application status any time.",
      },
      { property: "og:title", content: "Are you an influencer? Apply to join LuvLit" },
      {
        property: "og:description",
        content: "Free listing for reviewed Indian creators. Brands come to you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InfluencerLanding,
});

function InfluencerLanding() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-20">
        <p className="eyebrow">For creators</p>
        <h1 className="mt-4 text-4xl md:text-5xl">Are you an influencer?</h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Join LuvLit's reviewed creator directory. It's free, and only brands with a business
          account can browse it — so the enquiries you get are real ones.
        </p>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          <Link
            to="/influencer/onboarding"
            className="surface-card group flex flex-col p-9 transition-colors hover:border-accent"
          >
            <h2 className="text-2xl">Apply as an influencer</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Share your Instagram handle, the categories you post about most, and an optional rate
              card. Takes about three minutes.
            </p>
            <span className="eyebrow mt-8">Start application →</span>
          </Link>

          <Link
            to="/influencer/status"
            className="surface-card group flex flex-col p-9 transition-colors hover:border-accent"
          >
            <h2 className="text-2xl">Check application status</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Already applied? Look up where your application stands using the email or phone number
              you applied with — no waiting on us to write.
            </p>
            <span className="eyebrow mt-8">Check status →</span>
          </Link>
        </div>

        <section className="hairline mt-16 pt-10">
          <h2 className="text-2xl">How review works</h2>
          <ol className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">1. You apply.</strong> Your profile is saved but
              stays private — nothing is public yet.
            </li>
            <li>
              <strong className="text-foreground">2. We review manually.</strong> We check the
              handle is real and the stated reach is plausible. This isn't instant.
            </li>
            <li>
              <strong className="text-foreground">3. You go live.</strong> Once approved, brands can
              find you by category, city and follower range, and message you directly.
            </li>
          </ol>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
