import type { UsernameAvailability } from "@/hooks/use-username-availability";

/** The live checking/available/taken/invalid line shown under a username field — copy kept
 * exact since it's user-facing state, not decoration. */
export function UsernameStatusLine({ state, username }: { state: UsernameAvailability; username: string }) {
  switch (state.status) {
    case "checking":
      return <p className="text-xs text-muted-foreground">Checking availability…</p>;
    case "invalid":
      return (
        <p role="alert" className="text-xs text-destructive">
          {state.reason}
        </p>
      );
    case "available":
      return (
        <p className="text-xs font-medium text-primary">
          ✓ {username}.luvlit.in is available
        </p>
      );
    case "taken":
      return (
        <p role="alert" className="text-xs text-destructive">
          ✕ {username}.luvlit.in is already taken
        </p>
      );
    case "error":
      return <p className="text-xs text-muted-foreground">Couldn't check availability — try again.</p>;
    default:
      return null;
  }
}
