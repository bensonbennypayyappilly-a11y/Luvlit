import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

/** Subtle sustainability marker — quiet by design, never a loud sticker. */
export function EcoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/50 px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-primary",
        className,
      )}
    >
      <Leaf className="size-3" strokeWidth={1.75} aria-hidden />
      Eco-friendly
    </span>
  );
}
