import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { CardListSkeleton } from "@/components/ui/skeleton-shapes";

export const Route = createFileRoute("/_authenticated/business/dashboard/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — Business dashboard — LuvLit" },
      { name: "description", content: "View and filter your upcoming and past appointments by staff member." },
      { property: "og:title", content: "Appointments — Business dashboard — LuvLit" },
      { property: "og:description", content: "Your booking calendar on LuvLit." },
    ],
  }),
  component: AppointmentsPage,
});

type BookingRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  slot_id: string;
  slots: { id: string; date: string; start_time: string; staff_id: string; capacity: number; booked_count: number; staff: { id: string; name: string } | null } | null;
};

function AppointmentsPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const qc = useQueryClient();
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const { data: staff } = useQuery({
    queryKey: ["dashboard-staff", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      (await supabase.from("staff").select("id,name").eq("business_id", businessId!)).data ?? [],
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["dashboard-bookings", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const staffRows = (await supabase.from("staff").select("id,name").eq("business_id", businessId!)).data ?? [];
      const staffMap = new Map(staffRows.map((s) => [s.id, s.name]));
      const staffIds = staffRows.map((s) => s.id);
      if (!staffIds.length) return [] as BookingRow[];
      const { data: slots } = await supabase
        .from("slots")
        .select("id,date,start_time,staff_id,capacity,booked_count")
        .in("staff_id", staffIds);
      const slotMap = new Map((slots ?? []).map((s) => [s.id, s]));
      const slotIds = (slots ?? []).map((s) => s.id);
      if (!slotIds.length) return [] as BookingRow[];
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("id,customer_name,customer_phone,status,slot_id")
        .in("slot_id", slotIds);
      return (bookingRows ?? []).map((b) => {
        const slot = slotMap.get(b.slot_id);
        return {
          ...b,
          slots: slot
            ? { ...slot, staff: { id: slot.staff_id, name: staffMap.get(slot.staff_id) ?? "Staff" } }
            : null,
        } as BookingRow;
      });
    },
  });

  const filtered = useMemo(() => {
    const rows = bookings ?? [];
    const scoped = staffFilter === "all" ? rows : rows.filter((r) => r.slots?.staff_id === staffFilter);
    return scoped.slice().sort((a, b) => {
      const da = a.slots ? `${a.slots.date}T${a.slots.start_time}` : "";
      const db = b.slots ? `${b.slots.date}T${b.slots.start_time}` : "";
      return da.localeCompare(db);
    });
  }, [bookings, staffFilter]);

  const byDate = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of filtered) {
      const date = b.slots?.date ?? "Unscheduled";
      map.set(date, [...(map.get(date) ?? []), b]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["dashboard-bookings", businessId] });
  }

  async function cancel(bookingId: string) {
    if (!confirm("Cancel this appointment? This reopens the slot for other customers.")) return;
    setRowError(null);
    setBusyId(bookingId);
    const { error } = await supabase.rpc("cancel_booking", { _booking_id: bookingId });
    setBusyId(null);
    if (error) return setRowError(error.message);
    refresh();
  }

  async function setStatus(bookingId: string, status: "completed" | "no_show") {
    setRowError(null);
    setBusyId(bookingId);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    setBusyId(null);
    if (error) return setRowError(error.message);
    refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Appointments</p>
          <h1 className="mt-2 text-2xl font-medium">Booking calendar</h1>
        </div>
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="all">All staff</option>
          {(staff ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <CardListSkeleton />}
      {!isLoading && byDate.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">No appointments yet.</p>
      )}
      {rowError && <p className="mt-3 text-sm text-destructive">{rowError}</p>}

      <div className="mt-6 space-y-6">
        {byDate.map(([date, rows]) => (
          <div key={date} className="surface-card p-5">
            <p className="text-sm font-medium">
              {date === "Unscheduled" ? (
                <span className="text-muted-foreground">Date unavailable</span>
              ) : (
                new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
              )}
            </p>
            <div className="mt-3 divide-y divide-border">
              {rows.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {b.slots?.start_time ? (
                        b.slots.start_time.slice(0, 5)
                      ) : (
                        <span className="text-muted-foreground">Time unavailable</span>
                      )}{" "}
                      · {b.customer_name}
                    </p>
                    <p className="text-muted-foreground">
                      {b.customer_phone} · {b.slots?.staff?.name ?? "Staff unavailable"}
                      {b.slots && (
                        <> · {b.slots.booked_count} of {b.slots.capacity} booked</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs capitalize ${
                        b.status === "cancelled"
                          ? "border-border text-muted-foreground"
                          : b.status === "completed"
                            ? "border-accent bg-accent-soft text-accent"
                            : b.status === "no_show"
                              ? "border-destructive/40 text-destructive"
                              : "border-border text-muted-foreground"
                      }`}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                    {b.status === "confirmed" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setStatus(b.id, "completed")}
                          disabled={busyId === b.id}
                          className="text-xs text-accent hover:underline disabled:opacity-50"
                        >
                          Mark done
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(b.id, "no_show")}
                          disabled={busyId === b.id}
                          className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
                        >
                          No-show
                        </button>
                        <button
                          type="button"
                          onClick={() => cancel(b.id)}
                          disabled={busyId === b.id}
                          className="text-xs text-destructive hover:underline disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
