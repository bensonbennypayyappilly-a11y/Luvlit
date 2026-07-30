import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/page-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — how LuvLit handles your data" },
      {
        name: "description",
        content:
          "What data LuvLit collects from customers, businesses and influencers, how it is used, who it is shared with, and how to request deletion.",
      },
      { property: "og:title", content: "LuvLit Privacy Policy" },
      { property: "og:description", content: "How LuvLit collects, uses and protects your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy Policy"
      intro="A plain-English first draft. It reflects how the platform works today; we'll have it reviewed by a lawyer before launch."
    >
      <Section heading="What we collect">
        <p>
          <strong className="text-foreground">Customers:</strong> your name and phone number when
          you book an appointment (an account is not required), and, if you create an account, your
          email, the requirements you post with any photos you attach, your saved businesses and
          your messages.
        </p>
        <p>
          <strong className="text-foreground">Businesses:</strong> the details you enter during
          setup — business name, description, categories, addresses, delivery areas, contact
          details, links, staff names and working hours — plus billing records from our payment
          processor.
        </p>
        <p>
          <strong className="text-foreground">Influencers:</strong> your display name, Instagram
          handle, self-reported or connected statistics, categories and any rate card you submit.
        </p>
        <p>
          We also record basic usage information such as profile view counts. We do not sell
          personal data.
        </p>
      </Section>

      <Section heading="How we use it">
        <p>
          To show business and influencer profiles publicly (only when live or approved), to match
          requirements with relevant businesses, to deliver appointment bookings and messages, to
          take payments, to prevent abuse, and to improve the product.
        </p>
      </Section>

      <Section heading="Who can see what">
        <p>
          Live business profiles, approved influencer profiles and approved categories are public.
          Your bookings, requirements, quotes and messages are visible only to you and the parties
          you're dealing with. Access is enforced at the database level with row-level security.
        </p>
      </Section>

      <Section heading="Service providers">
        <p>
          We use third parties to run the service: hosting and database infrastructure,
          authentication, and Razorpay for payments. They process data on our instructions only.
        </p>
      </Section>

      <Section heading="Retention and your rights">
        <p>
          We keep data for as long as your account is active and as long as needed for legal or
          accounting obligations. You can ask us to correct or delete your data by writing to{" "}
          <a className="text-primary hover:underline" href="mailto:privacy@luvlit.in">
            privacy@luvlit.in
          </a>
          . Deleting a business profile removes it from public view immediately.
        </p>
      </Section>

      <Section heading="Children">
        <p>LuvLit is not intended for anyone under 18.</p>
      </Section>

      <Section heading="Changes">
        <p>
          If we make material changes to this policy we will note them on this page and, where
          appropriate, notify account holders by email.
        </p>
      </Section>
    </PageShell>
  );
}
