import { useState } from "react";

/** A collapsible left-sidebar section with a title and one-line muted subtitle, used by the
 * website builder. Kept generic so every editor section shares the same disclosure UI. */
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
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-5 text-left"
      >
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="mt-0.5 shrink-0 text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="space-y-5 px-4 pb-6">{children}</div>}
    </div>
  );
}

/** Small inline status indicator for autosave feedback ("Saving…" / "Saved" / error). */
export function SaveStatus({ state }: { state: "idle" | "saving" | "saved" | "error"; error?: string }) {
  if (state === "idle") return null;
  if (state === "saving") return <p className="text-xs text-muted-foreground">Saving…</p>;
  if (state === "error") return <p className="text-xs text-destructive">Couldn't save</p>;
  return <p className="text-xs text-muted-foreground">Saved</p>;
}
