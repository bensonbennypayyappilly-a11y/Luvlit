import { isReservedSlug } from "@/lib/reserved-slugs";

/**
 * The business "username" IS `businesses.slug` — the same column that already backs
 * {slug}.luvlit.in subdomain routing (see businessSlugFromHostname/getSubdomainBusiness in
 * public.functions.ts). This module just adds the strict, user-facing format rules for the case
 * where a business owner types it directly, instead of it being derived from the business name.
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_FORMAT_HINT = "Use 3–30 characters: letters, numbers, and hyphens.";

const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Canonical stored form: trimmed and lowercased, so `Alora`, `alora` and `ALORA` are the same
 * username. Always normalize before comparing or writing to `businesses.slug`. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Instant, DB-free validation: format + reserved words. Returns a specific error message, or
 * null when the username is well-formed and unreserved — callers still need a live uniqueness
 * check on top of this, since two different usernames can each be individually valid.
 */
export function getUsernameLocalError(raw: string): string | null {
  if (/\s/.test(raw.trim())) return "Username cannot contain spaces.";
  const value = normalizeUsername(raw);
  if (!value) return "Username is required.";
  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) return USERNAME_FORMAT_HINT;
  if (value.startsWith("-") || value.endsWith("-")) return "Username can't start or end with a hyphen.";
  if (value.includes("--")) return "Username can't contain consecutive hyphens.";
  if (!USERNAME_PATTERN.test(value)) return "Username must contain only letters, numbers, or hyphens.";
  if (isReservedSlug(value)) return "That username is reserved. Please choose another.";
  return null;
}
