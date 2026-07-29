import { Link } from "@tanstack/react-router";

const navItems = [
  { label: "Browse", to: "/" },
  { label: "Find an Influencer", to: "/" },
  { label: "Post a Requirement", to: "/" },
  { label: "For Businesses", to: "/" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-serif text-2xl tracking-editorial text-primary">
          LuvLit
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link
            to="/"
            className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-soft"
          >
            List your business
          </Link>
        </div>
      </div>
    </header>
  );
}
