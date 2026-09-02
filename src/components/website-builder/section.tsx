import { useState } from "react";

/** A collapsible left-sidebar section with a title and one-line muted subtitle, used by the
 * website builder. Kept generic so every editor section shares the same disclosure UI. Content
 * unmounts when collapsed (rather than animating height to 0) so hidden sections' uploaders/
 * queries stay inactive — only the reveal is animated, via the `builder-pop-in` keyframe. */
export function BuilderSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#EEEEEE] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-[#FAFAFA] ${
          open ? "bg-[#FAFAFA]" : ""
        }`}
      >
        <div>
          <p className={`text-[13px] font-medium transition-colors duration-150 ${open ? "text-accent" : "text-foreground"}`}>{title}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{subtitle}</p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`mt-1 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180 text-accent" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="builder-pop-in space-y-5 px-5 pb-6">{children}</div>}
    </div>
  );
}

/** Small inline status indicator for autosave feedback ("Saving…" / "Saved" / error). */
export function SaveStatus({ state, error }: { state: "idle" | "saving" | "saved" | "error"; error?: string | null }) {
  if (state === "idle") return null;
  if (state === "saving") return <p className="text-xs text-muted-foreground">Saving…</p>;
  if (state === "error") return <p className="text-xs text-destructive">{error || "Couldn't save"}</p>;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-accent">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Saved
    </p>
  );
}
