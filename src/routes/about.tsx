import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/page-shell";
import { PLANS } from "@/lib/constants";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About LuvLit — why we built a marketplace for small businesses" },
      {
        name: "description",
        content:
          "LuvLit is a pan-India marketplace where small businesses, brands and makers get a page that feels like their own website — not a classifieds listing.",
      },
      { property: "og:title", content: "About LuvLit" },
      {
        property: "og:description",
        content: "A pan-India marketplace for small businesses, brands and influencers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <PageShell
      eyebrow="Company"
      title="About LuvLit"
      intro="India's small businesses deserve better than a row in a directory."
    >
      <Section heading="Why we exist">
        <p>
          Most of the country's best makers, studios, salons and boutiques are invisible online.
          They either have no website, or they're buried inside dense classifieds sites that make
          every business look identical. LuvLit exists to fix that — a place where discovery is
          genuinely pleasant, and where each business gets a page that reads like their own site.
        </p>
      </Section>
      <Section heading="What we do">
        <p>
          Customers browse by category and city, book appointments without needing an account, and
          post custom requirements to get quotes from matching businesses. Businesses get a guided
          setup, appointment scheduling with staff and slots, a lead inbox, and chat — plus the
          option to be featured in a chosen city or nationally.
        </p>
        <p>
          Brands can also find and reach out to reviewed Indian creators through our influencer
          directory, which lives inside the business dashboard.
        </p>
      </Section>
      <Section heading="How we make money">
        <p>
          Listing is free for every business until 30 November. After that it's ₹{PLANS.base.introPrice} for the first
          billing month and ₹{PLANS.base.price} per month afterwards, with optional featured placement. Customers
          never pay us anything, and we don't take a cut of what a business earns.
        </p>
      </Section>
    </PageShell>
  );
}
