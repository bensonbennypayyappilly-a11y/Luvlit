import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** The one real, non-fake trust signal this app can currently back up: the business owner
 * has confirmed their email address (see the owner_email_verified migration). The `title`
 * spells out exactly what's verified, since "Verified" alone could be read as implying more
 * (identity, licensing) than is actually true. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      title="This business owner has confirmed their email address"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-transparent px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      <BadgeCheck className="size-3 text-accent" strokeWidth={1.75} aria-hidden />
      Verified
    </span>
  );
}
