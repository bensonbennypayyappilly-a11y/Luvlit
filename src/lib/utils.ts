import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Local calendar date as YYYY-MM-DD. Never derive "today" (or any other client-side
 * calendar date) via `date.toISOString().slice(0, 10)` — that renders in UTC, which silently
 * shifts to the wrong day for part of the day in any positive-UTC-offset timezone (IST,
 * this app's primary timezone, is UTC+5:30). */
export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Today's date in IST (Asia/Kolkata) as YYYY-MM-DD, for server-side code — a server process
 * isn't guaranteed to run in IST the way a browser in India is, so `localDateString()`'s "read
 * the runtime's own local time" approach doesn't carry over here. Explicit IST offset instead,
 * regardless of what timezone the server itself happens to be in. en-CA formats as YYYY-MM-DD
 * directly, so no manual padding/joining is needed. */
export function istDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}
