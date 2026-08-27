/**
 * Same algorithm as the slug-backfill migration
 * (supabase/migrations/20260827140000_fdec847b-9feb-4535-982f-ba441d780112.sql):
 * lowercase, non-alphanumeric runs become a single hyphen, trim leading/trailing
 * hyphens, fall back to "business" if nothing alphanumeric survives.
 */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "business";
}
