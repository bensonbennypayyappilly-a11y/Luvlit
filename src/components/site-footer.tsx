import { Link } from "@tanstack/react-router";

type FooterLink = { label: string; to: string; search?: Record<string, string> };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Discover",
    links: [
      { label: "Browse categories", to: "/browse" },
      { label: "Cities", to: "/cities" },
      { label: "Post a requirement", to: "/post-requirement" },
    ],
  },
  {
    title: "For businesses",
    links: [
      { label: "List your business", to: "/auth" },
      { label: "Pricing & featured placement", to: "/pricing" },
      { label: "Find an influencer", to: "/dashboard/find-influencer" },
      { label: "Post a requirement", to: "/post-requirement" },
      { label: "Are you an event organizer?", to: "/organizer/onboarding" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About LuvLit", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="hairline mt-4 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Link to="/" className="text-lg font-semibold tracking-editorial text-primary">
              LuvLit
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Discover India&rsquo;s local businesses.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-foreground">
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline mt-8 flex flex-col gap-2 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} LuvLit. Made in India.</p>
          <p>Listing is free for every business until 30 November.</p>
        </div>
      </div>
    </footer>
  );
}
