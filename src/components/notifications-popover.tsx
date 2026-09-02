import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { NotificationsList } from "@/components/notifications-list";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";

/** Bell trigger + scrollable dropdown, mirroring the outside-click/Escape pattern already
 * established by AccountMenu. Wraps the existing NotificationsList rather than reimplementing
 * notification rendering/read-state logic. */
export function NotificationsPopover({
  recipientType,
  recipientId,
  viewAllHref,
}: {
  recipientType: "business" | "customer";
  recipientId: string | null;
  viewAllHref: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: unreadCount } = useUnreadNotifications(recipientType, recipientId);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        <Bell className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
        {!!unreadCount && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-semibold leading-none text-accent-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg surface-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">Notifications</p>
            <Link
              to={viewAllHref}
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-accent transition-colors hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="max-h-96 overflow-y-auto px-3">
            <NotificationsList recipientType={recipientType} recipientId={recipientId} />
          </div>
        </div>
      )}
    </div>
  );
}
