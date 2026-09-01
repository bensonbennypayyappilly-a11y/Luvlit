import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStaffAvailability } from "@/lib/public.functions";
import { supabase } from "@/integrations/supabase/client";

const DATE_LABEL = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return DATE_LABEL.format(d);
}

/** Public appointment booking flow: choose a service, then (optionally) who, then a date, then a
 * time, then contact details — one step visible at a time so it reads as a real booking flow
 * rather than a form full of dropdowns. Falls back to raw specialization tags for a business
 * that hasn't set up formal Services yet, so booking still works either way. */
export function BookingWidget({ businessId, accent }: { businessId: string; accent: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["availability", businessId],
    queryFn: () => getStaffAvailability({ data: { businessId } }),
  });
  const [serviceId, setServiceId] = useState<string | "any" | "">("");
  const [spec, setSpec] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState<string>("");
  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const staff = data?.staff ?? [];
  const services = data?.services ?? [];
  const slots = data?.slots ?? [];
  const specs = [...new Set(staff.flatMap((s) => s.specializations ?? []))];
  const usingRealServices = services.length > 0;
  const serviceChosen = usingRealServices ? serviceId !== "" : true;

  const matchingStaff = spec ? staff.filter((s) => (s.specializations ?? []).includes(spec)) : staff;
  const staffFilteredSlots = slots.filter((s) => (staffId ? s.staff_id === staffId : true));

  const availableDates = useMemo(() => {
    const seen = new Map<string, number>();
    for (const s of staffFilteredSlots) seen.set(s.date, (seen.get(s.date) ?? 0) + 1);
    return Array.from(seen.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 14);
  }, [staffFilteredSlots]);

  const timesForDate = staffFilteredSlots.filter((s) => s.date === date);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBooking(true);
    const { error: rpcError } = await supabase.rpc("book_slot", {
      _slot_id: slotId,
      _customer_name: name,
      _customer_phone: phone,
      _notes: notes || undefined,
    });
    setBooking(false);
    if (rpcError) {
      setError(
        rpcError.message.includes("Slot unavailable")
          ? "That slot was just taken. Please pick another."
          : rpcError.message,
      );
      return;
    }
    setDone(true);
  }

  if (isLoading) {
    return (
      <div className="surface-card mt-8 space-y-3 p-8">
        <div className="h-4 w-1/3 animate-pulse rounded bg-secondary" />
        <div className="h-10 w-full animate-pulse rounded bg-secondary" />
      </div>
    );
  }

  if (done)
    return (
      <p className="mt-8 text-muted-foreground">
        Booked — we've sent your request through. You'll hear from the team shortly.
      </p>
    );

  if (!staff.length)
    return <p className="mt-8 text-muted-foreground">Booking opens here soon.</p>;

  return (
    <form onSubmit={book} className="surface-card mt-8 space-y-6 p-8">
      {/* Step 1 — service */}
      {usingRealServices ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">1. Choose a service</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setServiceId("any")}
              className={`rounded-md border px-3 py-2 text-sm ${serviceId === "any" ? "border-accent bg-accent-soft" : "border-border"}`}
            >
              Not sure yet
            </button>
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${serviceId === s.id ? "border-accent bg-accent-soft" : "border-border"}`}
              >
                <span className="block">{s.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {s.duration_minutes} min{s.price != null ? ` · from ₹${s.price}` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        specs.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">1. Choose a service</p>
            <select
              value={spec}
              onChange={(e) => {
                setSpec(e.target.value);
                setDate("");
                setSlotId("");
              }}
              className="mt-2 w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
              aria-label="Service"
            >
              <option value="">Any service</option>
              {specs.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )
      )}

      {serviceChosen && (
        <>
          {/* Step 2 — who (optional) */}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">2. Choose who (optional)</p>
            <select
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setDate("");
                setSlotId("");
              }}
              className="mt-2 w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
              aria-label="Team member"
            >
              <option value="">Any team member</option>
              {matchingStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3 — date */}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">3. Choose a date</p>
            {availableDates.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No availability right now — please check back soon.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {availableDates.map(([d, count]) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => {
                      setDate(d);
                      setSlotId("");
                    }}
                    className={`rounded-md border px-3 py-2 text-xs ${date === d ? "border-accent bg-accent-soft" : "border-border"}`}
                  >
                    {formatDate(d)}
                    <span className="ml-1 text-muted-foreground">· {count} open</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 4 — time */}
          {date && (
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">4. Choose a time</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {timesForDate.map((s) => {
                  const remaining = Math.max(0, (s.capacity ?? 1) - (s.booked_count ?? 0));
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSlotId(s.id)}
                      className={`rounded-md border px-3 py-2 text-xs ${slotId === s.id ? "border-accent bg-accent-soft" : "border-border"}`}
                    >
                      {String(s.start_time).slice(0, 5)}
                      <span className="ml-1 text-muted-foreground">· {remaining} left</span>
                    </button>
                  );
                })}
                {timesForDate.length === 0 && <p className="text-sm text-muted-foreground">No times left on this date.</p>}
              </div>
            </div>
          )}

          {/* Step 5 — contact */}
          {slotId && (
            <div className="space-y-3 border-t border-border pt-5">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">5. Your details</p>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
              />
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the business should know (optional)"
                rows={2}
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
              />
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        disabled={!slotId || !name.trim() || !phone.trim() || booking}
        className="rounded-md px-7 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {booking ? "Booking…" : "Confirm booking"}
      </button>
      <p className="text-xs text-muted-foreground">No account needed.</p>
    </form>
  );
}
