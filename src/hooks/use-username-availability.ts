import { useEffect, useRef, useState } from "react";
import { checkUsernameAvailability } from "@/lib/public.functions";
import { getUsernameLocalError } from "@/lib/username";

export type UsernameAvailability =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "invalid"; reason: string }
  | { status: "available" }
  | { status: "taken" }
  | { status: "error" };

/**
 * Debounced (400ms) live availability check for a business username/subdomain. Format and
 * reserved-word errors show instantly (no DB round trip); only the actual uniqueness check is
 * debounced, so typing doesn't fire a request per keystroke.
 *
 * `excludeBusinessId` treats that business's own current slug as available to itself — pass the
 * business's id when editing an existing business, omit it during onboarding before one exists.
 */
export function useUsernameAvailability(rawUsername: string, excludeBusinessId?: string): UsernameAvailability {
  const [state, setState] = useState<UsernameAvailability>({ status: "idle" });
  const requestId = useRef(0);

  useEffect(() => {
    if (!rawUsername.trim()) {
      setState({ status: "idle" });
      return;
    }
    const localError = getUsernameLocalError(rawUsername);
    if (localError) {
      setState({ status: "invalid", reason: localError });
      return;
    }
    setState({ status: "checking" });
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability({ data: { username: rawUsername, excludeBusinessId } });
        if (requestId.current !== id) return; // a newer keystroke already superseded this check
        setState({ status: res.available ? "available" : "taken" });
      } catch {
        if (requestId.current !== id) return;
        setState({ status: "error" });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [rawUsername, excludeBusinessId]);

  return state;
}
