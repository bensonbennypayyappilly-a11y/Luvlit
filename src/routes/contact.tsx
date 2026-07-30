import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/page-shell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact LuvLit — support for customers and businesses" },
      {
        name: "description",
        content:
          "Get in touch with the LuvLit team about listings, billing, influencer applications or anything else.",
      },
      { property: "og:title", content: "Contact LuvLit" },
      { property: "og:description", content: "Reach the LuvLit team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <PageShell
      eyebrow="Company"
      title="Contact us"
      intro="A small team, and a real person reads everything."
    >
      <Section heading="General & support">
        <p>
          Email{" "}
          <a className="text-primary hover:underline" href="mailto:hello@luvlit.in">
            hello@luvlit.in
          </a>{" "}
          — we reply within two working days.
        </p>
      </Section>
      <Section heading="Businesses & billing">
        <p>
          For listing help, featured placement or invoices, write to{" "}
          <a className="text-primary hover:underline" href="mailto:business@luvlit.in">
            business@luvlit.in
          </a>{" "}
          from the email on your account.
        </p>
      </Section>
      <Section heading="Influencer applications">
        <p>
          Applications are reviewed manually. You can check your status any time on the influencer
          page rather than waiting for us to write — email{" "}
          <a className="text-primary hover:underline" href="mailto:creators@luvlit.in">
            creators@luvlit.in
          </a>{" "}
          if something looks wrong.
        </p>
      </Section>
      <Section heading="Report a problem">
        <p>
          If a listing is inaccurate, misleading or shouldn't be on LuvLit, email{" "}
          <a className="text-primary hover:underline" href="mailto:trust@luvlit.in">
            trust@luvlit.in
          </a>{" "}
          with the business name and a link.
        </p>
      </Section>
    </PageShell>
  );
}
