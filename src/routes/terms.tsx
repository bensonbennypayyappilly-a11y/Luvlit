import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/page-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — using LuvLit as a customer or business" },
      {
        name: "description",
        content:
          "The rules for using LuvLit: accounts, listings, bookings, requirements, payments, content standards and liability.",
      },
      { property: "og:title", content: "LuvLit Terms of Use" },
      { property: "og:description", content: "The rules for using LuvLit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of Use"
      intro="A plain-English first draft covering how LuvLit works. We'll have it reviewed by a lawyer before launch."
    >
      <Section heading="1. Who we are">
        <p>
          LuvLit is a marketplace that helps people in India discover small businesses, brands and
          creators. We are an introduction platform: the services and goods themselves are provided
          by the businesses listed, not by us.
        </p>
      </Section>

      <Section heading="2. Accounts">
        <p>
          You can browse and book appointments without an account. An account is required to chat,
          save favourites, post requirements or list a business. Keep your credentials secure; you
          are responsible for activity under your account. You must be 18 or older.
        </p>
      </Section>

      <Section heading="3. Business listings">
        <p>
          Businesses are responsible for the accuracy of everything on their page — descriptions,
          prices, locations, delivery areas, staff availability and media rights. We may remove or
          unpublish a listing that is misleading, unlawful, or the subject of credible complaints.
          Suggested categories are reviewed before being offered to other businesses.
        </p>
      </Section>

      <Section heading="4. Bookings, requirements and quotes">
        <p>
          A booking made through LuvLit is an appointment request with that business; the contract
          for the service is between you and them. Quotes received against a requirement are offers
          from those businesses. We do not guarantee availability, quality, pricing or outcomes.
        </p>
      </Section>

      <Section heading="5. Payments">
        <p>
          Base listings are free until 30 November. Subscriptions started after that are billed ₹20
          for the first month and ₹199 per month thereafter; featured placement is ₹499/month for a
          city or ₹999/month all-India. Payments are handled by Razorpay. Fees already paid are
          non-refundable except where required by law; you can cancel at any time and keep access
          until the end of the paid period.
        </p>
      </Section>

      <Section heading="6. Influencer profiles">
        <p>
          Influencer applications are reviewed manually and only appear publicly once approved.
          Self-reported statistics are shown as unverified. Misrepresenting reach or engagement is
          grounds for removal.
        </p>
      </Section>

      <Section heading="7. Acceptable use">
        <p>
          Don't post unlawful, hateful, deceptive or infringing content; don't scrape the platform;
          don't spam businesses or customers; don't attempt to access data that isn't yours. We may
          suspend accounts that break these rules.
        </p>
      </Section>

      <Section heading="8. Liability">
        <p>
          LuvLit is provided "as is". To the extent permitted by law, we are not liable for
          disputes between users, or for indirect or consequential loss. Nothing here limits
          liability that cannot be limited under Indian law.
        </p>
      </Section>

      <Section heading="9. Changes and contact">
        <p>
          We may update these terms; material changes will be noted on this page. Questions go to{" "}
          <a className="text-primary hover:underline" href="mailto:legal@luvlit.in">
            legal@luvlit.in
          </a>
          . These terms are governed by Indian law.
        </p>
      </Section>
    </PageShell>
  );
}
