/**
 * Subdomains/slugs a business can never claim — either because they'd shadow an
 * existing top-level route on luvlit.in, or because they're standard infra names.
 * Kept in sync by hand with the identical list in the slug-backfill migration
 * (supabase/migrations/20260827140000_fdec847b-9feb-4535-982f-ba441d780112.sql),
 * since SQL and TS can't share a literal array.
 */
export const RESERVED_SLUGS = [
  // explicitly called out
  "www",
  "api",
  "app",
  "admin",
  "dashboard",
  "auth",
  "mail",
  "staging",
  "luvlit",
  "luvlit-in",
  // top-level route segments in src/routes/
  "browse",
  "business",
  "cities",
  "contact",
  "events",
  "influencer",
  "privacy",
  "terms",
  "pricing",
  "about",
  "post-requirement",
  "organizer",
  "sitemap",
  "robots",
  "favicon",
  "verify-email",
  // standard infra subdomains
  "ftp",
  "ns1",
  "ns2",
  "smtp",
  "imap",
  "pop",
  "mx",
  "cdn",
  "static",
  "assets",
  "dev",
  "test",
  "blog",
  "help",
  "support",
  "docs",
  "status",
  "cname",
  "webmail",
  "autodiscover",
  "autoconfig",
] as const;

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}
