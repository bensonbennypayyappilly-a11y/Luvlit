import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuvLit — Discover India's Small Businesses & Brands" },
      {
        name: "description",
        content:
          "LuvLit connects you with small businesses, brands and influencers across India — browse by category and city, book appointments, and request quotes.",
      },
      { property: "og:title", content: "LuvLit — Discover India's Small Businesses & Brands" },
      {
        property: "og:description",
        content:
          "Browse small businesses, brands and influencers by category and city. Book appointments and post requirements to get quotes.",
      },
    ],
  }),
  component: Index,
});

const categories = [
  "Salons & Spa",
  "Home Décor",
  "Bakers & Patisserie",
  "Fashion & Boutiques",
  "Photography",
  "Fitness & Wellness",
  "Jewellery",
  "Event Planning",
];

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-24 md:pt-32">
          <p className="eyebrow">Pan-India marketplace</p>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[1.08] md:text-7xl">
            The small businesses worth
            <span className="text-primary"> knowing</span>, near you.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground">
            Discover makers, studios, salons and brands by category and city. Book an appointment,
            request a quote, or find the right influencer for your brand.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <button className="rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Start browsing
            </button>
            <button className="rounded-md border border-accent px-7 py-3.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-soft">
              List your business
            </button>
          </div>
        </section>

        {/* Category preview */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="hairline flex items-end justify-between gap-6 pt-14">
            <div>
              <p className="eyebrow">Browse</p>
              <h2 className="mt-3 text-3xl md:text-4xl">Categories</h2>
            </div>
            <p className="hidden max-w-xs text-sm text-muted-foreground sm:block">
              A curated set of categories, growing as businesses join.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <article
                key={category}
                className="surface-card group p-7 transition-colors hover:border-accent"
              >
                <h3 className="text-xl">{category}</h3>
                <p className="mt-3 text-sm text-muted-foreground">Explore across India</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
