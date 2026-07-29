import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStaffAvailability } from "@/lib/public.functions";
import { supabase } from "@/integrations/supabase/client";

export function BookingWidget({ businessId, accent }: { businessId: string; accent: string }) {
  const { data } = useQuery({
    queryKey: ["availability", businessId],
    queryFn: () => getStaffAvailability({ data: { businessId } }),
  });
  const [spec, setSpec] = useState("");
  const [staffId, setStaffId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staff = data?.staff ?? [];
  const slots = data?.slots ?? [];
  const specs = [...new Set(staff.flatMap((s) => s.specializations ?? []))];
  const matchingStaff = spec ? staff.filter((s) => (s.specializations ?? []).includes(spec)) : staff;
  const openSlots = slots.filter((s) => (staffId ? s.staff_id === staffId : true)).slice(0, 24);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: slotError } = await supabase
      .from("slots")
      .update({ status: "booked" })
      .eq("id", slotId)
      .eq("status", "open");
    if (slotError) return setError("That slot was just taken. Please pick another.");
    const { error: bookingError } = await supabase.from("bookings").insert({
      slot_id: slotId,
      business_id: businessId,
      customer_name: name,
      customer_phone: phone,
    });
    if (bookingError) return setError(bookingError.message);
    setDone(true);
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
    <form onSubmit={book} className="surface-card mt-8 space-y-5 p-8">
      {specs.length > 0 && (
        <select
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
          aria-label="Service"
        >
          <option value="">Any service</option>
          {specs.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      )}
      <select
        value={staffId}
        onChange={(e) => setStaffId(e.target.value)}
        className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
        aria-label="Team member"
      >
        <option value="">Any team member</option>
        {matchingStaff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2">
        {openSlots.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => setSlotId(s.id)}
            className={`rounded-md border px-3 py-2 text-xs ${
              slotId === s.id ? "border-accent bg-accent-soft" : "border-border"
            }`}
          >
            {s.date} · {String(s.start_time).slice(0, 5)}
          </button>
        ))}
        {openSlots.length === 0 && (
          <p className="text-sm text-muted-foreground">No open slots right now.</p>
        )}
      </div>
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        disabled={!slotId}
        className="rounded-md px-7 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        Confirm booking
      </button>
      <p className="text-xs text-muted-foreground">No account needed.</p>
    </form>
  );
}
