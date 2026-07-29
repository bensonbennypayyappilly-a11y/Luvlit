import { Link } from "@tanstack/react-router";

const columns = [
  {
    title: "Discover",
    links: ["Browse categories", "Featured businesses", "Find an influencer", "Cities"],
  },
  {
    title: "For businesses",
    links: ["List your business", "Featured placement", "Leads & requirements", "Pricing"],
  },
  {
    title: "Company",
    links: ["About LuvLit", "Contact", "Privacy", "Terms"],
  },
];

export function SiteFooter() {
  return (
    <footer className="hairline mt-32 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Link to="/" className="font-serif text-2xl tracking-editorial text-primary">
              LuvLit
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              A pan-India marketplace for small businesses, brands and influencers — discoverable by
              what they do and where they are.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="font-sans text-xs font-medium uppercase tracking-[0.16em] text-foreground">
                {column.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link
                      to="/"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline mt-16 flex flex-col gap-2 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} LuvLit. Made in India.</p>
          <p>Listing is free for every business until 30 November.</p>
        </div>
      </div>
    </footer>
  );
}
