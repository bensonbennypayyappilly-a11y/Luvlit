import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/page-shell";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — free until 30 November, then ₹20 and ₹199/month | LuvLit" },
      {
        name: "description",
        content:
          "LuvLit is free for every business until 30 November. After that: ₹20 for your first billing month, ₹199/month afterwards. Featured placement from ₹499/month.",
      },
      { property: "og:title", content: "LuvLit pricing for businesses" },
      {
        property: "og:description",
        content: "Free until 30 November, then ₹20 first month and ₹199/month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <PageShell
      eyebrow="For businesses"
      title="Pricing"
      intro="Free to list until 30 November. Simple, honest pricing after that — no commission on anything you earn."
    >
      <Section heading="Base listing">
        <p>
          <strong className="text-foreground">Free for every business until 30 November.</strong>{" "}
          Your business page, guided setup, multiple locations and categories, delivery areas,
          appointments with staff and slots, the lead inbox and chat are all included.
        </p>
        <p>
          If your subscription starts after 30 November, your{" "}
          <strong className="text-foreground">first billing month is ₹20</strong>, and then{" "}
          <strong className="text-foreground">₹199 per month</strong> from the second month onward.
          Yearly billing is available at a two-months-free equivalent discount.
        </p>
      </Section>

      <Section heading="Featured placement">
        <p>
          <strong className="text-foreground">Featured — Custom Location: ₹499/month.</strong> Your
          business pins to the top of its category in one city you choose.
        </p>
        <p>
          <strong className="text-foreground">Featured — All India: ₹999/month.</strong> Pinned
          nationally in your category.
        </p>
        <p>
          Featured slots are capped per category and location. When a combination is full you can
          join the waitlist and we'll offer the spot when it opens.
        </p>
      </Section>

      <Section heading="Customers and influencers">
        <p>
          Customers never pay. Browsing, guest appointment booking, posting requirements and
          messaging are always free. Influencer profiles are also free — applications are reviewed
          manually before going live.
        </p>
      </Section>

      <Section heading="Billing details">
        <p>
          Payments are processed through Razorpay. Subscriptions renew automatically and can be
          cancelled from your business dashboard; your page stays live to the end of the paid
          period. Prices are in Indian rupees and inclusive of applicable taxes unless stated
          otherwise on the invoice.
        </p>
        <p>
          <Link className="text-primary hover:underline" to="/auth" search={{ role: "business" }}>
            List your business →
          </Link>
        </p>
      </Section>
    </PageShell>
  );
}
