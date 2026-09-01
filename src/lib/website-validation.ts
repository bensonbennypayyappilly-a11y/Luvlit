/**
 * Field validation for the website builder and catalogue editors. Pure and side-effect free so
 * it can be unit-tested and reused by any form: each function returns an error message to show
 * next to the field, or null when the value is acceptable.
 *
 * Deliberately lenient about formats that are genuinely ambiguous — an Indian phone number is
 * written a dozen valid ways, so this checks digit count rather than rejecting punctuation, and
 * optional fields are only validated once the owner has actually typed something.
 */

export function validateBusinessName(value: string): string | null {
  const v = value.trim();
  if (!v) return "Your business name is required — it's the title of your website.";
  if (v.length > 120) return "Keep the name under 120 characters.";
  return null;
}

export function validateEmail(value: string | null): string | null {
  const v = (value ?? "").trim();
  if (!v) return null; // optional
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "That doesn't look like a valid email address.";
  if (v.length > 255) return "That email address is too long.";
  return null;
}

/** Indian mobile numbers are 10 digits; allow an optional country code, and ignore spaces,
 * dashes, brackets and a leading +, since owners type all of those. */
export function validatePhone(value: string | null): string | null {
  const v = (value ?? "").trim();
  if (!v) return null; // optional
  if (!/^\+?[\d\s()-]+$/.test(v)) return "Use only digits, spaces, brackets, + or -.";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 10) return "That number looks too short — include all 10 digits.";
  if (digits.length > 15) return "That number looks too long.";
  return null;
}

export function validateUrl(value: string | null): string | null {
  const v = (value ?? "").trim();
  if (!v) return null; // optional
  if (!/^https?:\/\/.+\..+/.test(v)) return "Enter a full link, starting with https://";
  return null;
}

export function validateCatalogueName(value: string, label: "product" | "service"): string | null {
  const v = value.trim();
  if (!v) return `Give this ${label} a name.`;
  if (v.length > 120) return "Keep the name under 120 characters.";
  return null;
}

/** Price is optional throughout (a business can list "enquire for pricing"), but a value that IS
 * entered has to be a sane, non-negative number. */
export function validatePrice(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return "Enter a number, or leave this blank.";
  if (n < 0) return "Price can't be negative.";
  if (n > 10_000_000) return "That price looks too high — check the number.";
  return null;
}

export function validateDuration(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined) return "Choose how long this service takes.";
  if (!Number.isFinite(minutes) || minutes <= 0) return "Duration must be more than 0 minutes.";
  if (minutes > 8 * 60) return "That's longer than 8 hours — check the duration.";
  return null;
}

/** Blocked dates and appointment dates must not be in the past — comparing ISO date strings
 * (YYYY-MM-DD) directly, since both sides are already local calendar dates with no timezone. */
export function validateFutureDate(iso: string, todayIso: string): string | null {
  if (!iso) return "Choose a date.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "That date isn't valid.";
  if (iso < todayIso) return "That date has already passed.";
  return null;
}

/** Collapses a set of per-field errors into "is this form safe to submit". */
export function hasErrors(errors: Record<string, string | null>): boolean {
  return Object.values(errors).some((e) => !!e);
}
