import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { WEEKDAYS } from "@/lib/constants";
import { CardListSkeleton } from "@/components/ui/skeleton-shapes";
import { localDateString } from "@/lib/utils";
import { validateFutureDate } from "@/lib/website-validation";
import { FieldError } from "@/components/field-error";

export const Route = createFileRoute("/_authenticated/business/dashboard/staff")({
  head: () => ({
    meta: [
      { title: "Staff & availability — Business dashboard — LuvLit" },
      {
        name: "description",
        content: "Manage your team, working hours and bookable slots for appointments on LuvLit.",
      },
      { property: "og:title", content: "Staff & availability — Business dashboard — LuvLit" },
      { property: "og:description", content: "Manage your team's working hours and slots on LuvLit." },
    ],
  }),
  component: StaffPage,
});

type DayHours = { start: string; end: string } | null;
type WorkingHours = {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
  _capacity?: number;
} & Record<string, DayHours | number | undefined>;

type Staff = {
  id: string;
  business_id: string;
  name: string;
  specializations: string[];
  slot_duration_minutes: number;
  working_hours: unknown;
  blocked_dates: string[];
  buffer_minutes: number;
};

const DEFAULT_HOURS: WorkingHours = {
  mon: { start: "10:00", end: "19:00" },
  tue: { start: "10:00", end: "19:00" },
  wed: { start: "10:00", end: "19:00" },
  thu: { start: "10:00", end: "19:00" },
  fri: { start: "10:00", end: "19:00" },
  sat: { start: "10:00", end: "19:00" },
  sun: null,
  _capacity: 1,
};

/** Normalises legacy shapes ({ start, end, days: number[] }) and new per-day shapes into a consistent structure. */
function normalizeWorkingHours(raw: unknown): WorkingHours {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_HOURS };
  const obj = raw as Record<string, unknown>;
  // Legacy shape: { start, end, days: [1,2,3,4,5,6] } where days are JS getDay() numbers, 0 = Sunday
  if (typeof obj.start === "string" && typeof obj.end === "string" && Array.isArray(obj.days)) {
    const dayIndexToKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const result: WorkingHours = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null };
    for (const d of obj.days as number[]) {
      const key = dayIndexToKey[d];
      if (key) result[key] = { start: obj.start as string, end: obj.end as string };
    }
    result._capacity = 1;
    return result;
  }
  // New per-day shape
  const result: WorkingHours = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null };
  for (const { key } of WEEKDAYS) {
    const val = obj[key];
    if (val && typeof val === "object" && "start" in (val as object) && "end" in (val as object)) {
      result[key] = { start: (val as DayHours)!.start, end: (val as DayHours)!.end };
    } else {
      result[key] = null;
    }
  }
  result._capacity = typeof obj._capacity === "number" ? obj._capacity : 1;
  return result;
}

function StaffPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const qc = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["dashboard-business-categories", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      (
        (await supabase.from("businesses").select("categories").eq("id", businessId!).maybeSingle()).data
          ?.categories ?? []
      ) as string[],
  });

  const { data: staff, isLoading } = useQuery({
    queryKey: ["dashboard-staff-full", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      ((await supabase.from("staff").select("*").eq("business_id", businessId!).order("name")).data ??
        []) as Staff[],
  });

  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    specializations: string[];
    slot_duration_minutes: number;
    hours: WorkingHours;
    blockedDates: string[];
    bufferMinutes: number;
  } | null>(null);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [regenMsg, setRegenMsg] = useState<Record<string, string>>({});
  const [regenBusy, setRegenBusy] = useState<Record<string, boolean>>({});
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [regenError, setRegenError] = useState<Record<string, string>>({});

  // Blocking a date that's already passed does nothing useful (slots are only generated for
  // today onward), so it's rejected rather than silently accepted.
  const todayIso = localDateString(new Date());
  const blockedDateError = newBlockedDate ? validateFutureDate(newBlockedDate, todayIso) : null;

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["dashboard-staff-full", businessId] });
  }

  async function addStaff() {
    if (!businessId || !draftName.trim()) return;
    setBusy(true);
    setAddError(null);
    const { error } = await supabase.from("staff").insert({
      business_id: businessId,
      name: draftName.trim(),
      specializations: [],
      slot_duration_minutes: 30,
      working_hours: DEFAULT_HOURS,
    });
    setBusy(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setDraftName("");
    refresh();
  }

  function startEdit(s: Staff) {
    setEditError(null);
    setEditingId(s.id);
    setNewBlockedDate("");
    setEditDraft({
      name: s.name,
      specializations: s.specializations ?? [],
      slot_duration_minutes: s.slot_duration_minutes ?? 30,
      hours: normalizeWorkingHours(s.working_hours),
      blockedDates: [...(s.blocked_dates ?? [])].sort(),
      bufferMinutes: s.buffer_minutes ?? 0,
    });
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    setBusy(true);
    setEditError(null);
    const { error } = await supabase
      .from("staff")
      .update({
        name: editDraft.name,
        specializations: editDraft.specializations,
        slot_duration_minutes: editDraft.slot_duration_minutes,
        working_hours: editDraft.hours,
        blocked_dates: editDraft.blockedDates,
        buffer_minutes: editDraft.bufferMinutes,
      })
      .eq("id", id);
    setBusy(false);
    if (error) {
      setEditError(error.message);
      return;
    }
    setEditingId(null);
    setEditDraft(null);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this staff member? Their slots will remain but be unavailable.")) return;
    setRemoveError(null);
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) {
      setRemoveError(error.message);
      return;
    }
    refresh();
  }

  function toggleSpec(spec: string) {
    if (!editDraft) return;
    const has = editDraft.specializations.includes(spec);
    setEditDraft({
      ...editDraft,
      specializations: has
        ? editDraft.specializations.filter((s) => s !== spec)
        : [...editDraft.specializations, spec],
    });
  }

  function updateDay(key: string, patch: Partial<{ enabled: boolean; start: string; end: string }>) {
    if (!editDraft) return;
    const current = editDraft.hours[key] as DayHours;
    let next: DayHours;
    if (patch.enabled === false) {
      next = null;
    } else {
      const base = current ?? { start: "10:00", end: "19:00" };
      next = { start: patch.start ?? base.start, end: patch.end ?? base.end };
    }
    setEditDraft({ ...editDraft, hours: { ...editDraft.hours, [key]: next } });
  }

  async function regenerate(s: Staff) {
    setRegenBusy((m) => ({ ...m, [s.id]: true }));
    setRegenMsg((m) => ({ ...m, [s.id]: "" }));
    setRegenError((m) => ({ ...m, [s.id]: "" }));
    try {
      const hours = normalizeWorkingHours(s.working_hours);
      const capacity = hours._capacity ?? 1;
      const duration = s.slot_duration_minutes || 30;
      const buffer = Math.max(0, s.buffer_minutes || 0);
      const blockedDates = new Set(s.blocked_dates ?? []);
      const dayIndexToKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

      // The same rolling 30-day window (today .. today+29) this function has always generated
      // for. Recorded up front so both the "add missing" and the new "remove stale" pass below
      // are scoped to exactly this window — never further into the future or past.
      const windowDays: { iso: string; dayKey: string }[] = [];
      for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() + day);
        windowDays.push({ iso: localDateString(date), dayKey: dayIndexToKey[date.getDay()] });
      }
      const windowStart = windowDays[0].iso;
      const windowEnd = windowDays[windowDays.length - 1].iso;

      const { data: existing, error: fetchError } = await supabase
        .from("slots")
        .select("id,date,start_time,booked_count")
        .eq("staff_id", s.id)
        .gte("date", windowStart)
        .lte("date", windowEnd);
      if (fetchError) {
        setRegenError((m) => ({ ...m, [s.id]: fetchError.message }));
        return;
      }
      const existingKeys = new Set((existing ?? []).map((r) => `${r.date}_${String(r.start_time).slice(0, 8)}`));

      // Every slot key that SHOULD exist for this staff member's *current* working hours, over
      // the same window. Doubles as the "what's missing" set (drives toInsert below) and, by
      // elimination against `existing`, the "what no longer belongs" set (drives cleanup below)
      // — so narrowing hours and widening hours are handled by the same computation.
      const validKeys = new Set<string>();
      const toInsert: { staff_id: string; date: string; start_time: string; capacity: number }[] = [];
      for (const { iso, dayKey } of windowDays) {
        const dayHours = hours[dayKey] as DayHours;
        if (!dayHours || blockedDates.has(iso)) continue;
        const [sh, sm] = dayHours.start.split(":").map(Number);
        const [eh, em] = dayHours.end.split(":").map(Number);
        for (let t = sh * 60 + sm; t + duration <= eh * 60 + em; t += duration + buffer) {
          const startTime = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}:00`;
          const key = `${iso}_${startTime}`;
          validKeys.add(key);
          if (existingKeys.has(key)) continue;
          toInsert.push({ staff_id: s.id, date: iso, start_time: startTime, capacity });
        }
      }

      // Slots that exist in-window but fall outside the (possibly narrowed) hours now — stale,
      // and candidates for removal. A slot with an active booking must survive regardless:
      // deleting it would cascade-delete the booking row (bookings.slot_id references slots(id)
      // on delete cascade — see supabase/migrations/20260729061423_...sql), which must never
      // happen silently. This checks the bookings table itself rather than trusting
      // booked_count, so a drifted counter can never let a booked slot slip through and get
      // deleted.
      const staleRows = (existing ?? []).filter((r) => !validKeys.has(`${r.date}_${String(r.start_time).slice(0, 8)}`));
      const staleIds = staleRows.map((r) => r.id);
      const bookedStaleIds = new Set<string>();
      // Batched (same chunk size as the insert/delete below): a drastic narrowing can put
      // hundreds of ids in this filter, and a single unbatched `.in()` risks the query URL
      // getting too large.
      for (let i = 0; i < staleIds.length; i += 200) {
        const { data: activeBookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("slot_id")
          .in("slot_id", staleIds.slice(i, i + 200))
          .neq("status", "cancelled");
        if (bookingsError) {
          setRegenError((m) => ({ ...m, [s.id]: bookingsError.message }));
          return;
        }
        (activeBookings ?? []).forEach((b) => bookedStaleIds.add(b.slot_id));
      }
      const toDelete = staleRows.filter((r) => !bookedStaleIds.has(r.id));
      const keptBookedCount = staleRows.length - toDelete.length;

      for (let i = 0; i < toInsert.length; i += 500) {
        const { error: insertError } = await supabase.from("slots").insert(toInsert.slice(i, i + 500));
        if (insertError) {
          setRegenError((m) => ({ ...m, [s.id]: insertError.message }));
          return;
        }
      }

      for (let i = 0; i < toDelete.length; i += 500) {
        const { error: deleteError } = await supabase
          .from("slots")
          .delete()
          .in(
            "id",
            toDelete.slice(i, i + 500).map((r) => r.id),
          );
        if (deleteError) {
          setRegenError((m) => ({ ...m, [s.id]: deleteError.message }));
          return;
        }
      }

      const parts: string[] = [];
      if (toInsert.length) parts.push(`Added ${toInsert.length} new slot(s).`);
      if (toDelete.length) parts.push(`Removed ${toDelete.length} slot(s) no longer in your working hours.`);
      if (keptBookedCount) {
        parts.push(
          `${keptBookedCount} slot(s) outside your new hours ${keptBookedCount === 1 ? "was" : "were"} kept because ${
            keptBookedCount === 1 ? "it has" : "they have"
          } a booking — cancel it first if you want ${keptBookedCount === 1 ? "it" : "them"} removed.`,
        );
      }
      setRegenMsg((m) => ({
        ...m,
        [s.id]: parts.length ? parts.join(" ") : "No changes needed — all up to date.",
      }));
    } finally {
      setRegenBusy((m) => ({ ...m, [s.id]: false }));
    }
  }

  return (
    <div>
      <p className="eyebrow">Staff</p>
      <h1 className="mt-2 text-2xl font-medium">Team & availability</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add team members, set their working hours and generate bookable slots.
      </p>

      <div className="surface-card mt-6 flex flex-wrap items-center gap-3 p-5">
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="New staff member name"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={addStaff}
          disabled={busy || !draftName.trim()}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Add staff
        </button>
      </div>
      {addError && <p className="mt-2 text-sm text-destructive">{addError}</p>}
      {removeError && <p className="mt-2 text-sm text-destructive">{removeError}</p>}

      {isLoading && <CardListSkeleton />}
      {!isLoading && (staff ?? []).length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">No staff yet — add your first team member above.</p>
      )}

      <div className="mt-6 space-y-4">
        {(staff ?? []).map((s) => {
          const isEditing = editingId === s.id;
          const displayHours = normalizeWorkingHours(s.working_hours);
          return (
            <div key={s.id} className="surface-card p-5">
              {!isEditing ? (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(s.specializations ?? []).length ? s.specializations.join(", ") : "No specializations set"}
                        {" · "}
                        {s.slot_duration_minutes} min slots · capacity {displayHours._capacity ?? 1}
                        {s.buffer_minutes > 0 && ` · ${s.buffer_minutes} min buffer`}
                        {(s.blocked_dates ?? []).length > 0 && ` · ${s.blocked_dates.length} date(s) blocked`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                        {WEEKDAYS.map(({ key, label }) => {
                          const h = displayHours[key];
                          return (
                            <span
                              key={key}
                              className={`rounded-full border px-2 py-1 ${
                                h ? "border-accent bg-accent-soft text-accent" : "border-border"
                              }`}
                            >
                              {label.slice(0, 3)}
                              {h ? ` ${h.start}–${h.end}` : " off"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-3 text-sm">
                      <button onClick={() => startEdit(s)} className="text-accent">
                        Edit
                      </button>
                      <button onClick={() => remove(s.id)} className="text-destructive">
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    <button
                      onClick={() => regenerate(s)}
                      disabled={regenBusy[s.id]}
                      className="rounded-md border border-border px-4 py-2 text-xs font-medium disabled:opacity-50"
                    >
                      {regenBusy[s.id] ? "Generating…" : "Regenerate next 30 days"}
                    </button>
                    {regenMsg[s.id] && <p className="text-xs text-muted-foreground">{regenMsg[s.id]}</p>}
                    {regenError[s.id] && <p className="text-xs text-destructive">{regenError[s.id]}</p>}
                  </div>
                </div>
              ) : (
                editDraft && (
                  <div className="space-y-4">
                    <input
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Name"
                    />

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Specializations</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(categories ?? []).length === 0 && (
                          <p className="text-xs text-muted-foreground">Add categories to your business profile first.</p>
                        )}
                        {(categories ?? []).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => toggleSpec(c)}
                            className={`rounded-full border px-3 py-1 text-xs ${
                              editDraft.specializations.includes(c)
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <label className="text-xs text-muted-foreground">
                        Slot duration
                        <select
                          value={editDraft.slot_duration_minutes}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, slot_duration_minutes: Number(e.target.value) })
                          }
                          className="ml-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value={15}>15 min</option>
                          <option value={30}>30 min</option>
                          <option value={60}>60 min</option>
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Capacity per slot
                        <input
                          type="number"
                          min={1}
                          value={editDraft.hours._capacity ?? 1}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              hours: { ...editDraft.hours, _capacity: Math.max(1, Number(e.target.value) || 1) },
                            })
                          }
                          className="ml-2 w-20 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Buffer between appointments
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={editDraft.bufferMinutes}
                          onChange={(e) => setEditDraft({ ...editDraft, bufferMinutes: Math.max(0, Number(e.target.value) || 0) })}
                          className="ml-2 w-20 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                        <span className="ml-1">min</span>
                      </label>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Blocked dates (holidays, time off)</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={newBlockedDate}
                          min={todayIso}
                          onChange={(e) => setNewBlockedDate(e.target.value)}
                          aria-invalid={!!blockedDateError}
                          className={`rounded-md border bg-background px-3 py-2 text-sm ${
                            blockedDateError ? "border-destructive" : "border-border"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (blockedDateError || editDraft.blockedDates.includes(newBlockedDate)) return;
                            setEditDraft({ ...editDraft, blockedDates: [...editDraft.blockedDates, newBlockedDate].sort() });
                            setNewBlockedDate("");
                          }}
                          disabled={!newBlockedDate || !!blockedDateError}
                          className="rounded-md border border-border px-3 py-2 text-xs disabled:opacity-50"
                        >
                          Block date
                        </button>
                      </div>
                      {newBlockedDate ? <FieldError message={blockedDateError} /> : null}
                      {editDraft.blockedDates.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {editDraft.blockedDates.map((d) => (
                            <span key={d} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
                              {d}
                              <button
                                type="button"
                                onClick={() => setEditDraft({ ...editDraft, blockedDates: editDraft.blockedDates.filter((x) => x !== d) })}
                                aria-label={`Unblock ${d}`}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Click "Regenerate next 30 days" after saving to apply blocked dates and buffer to slots.
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Working hours</p>
                      <div className="mt-2 space-y-2">
                        {WEEKDAYS.map(({ key, label }) => {
                          const h = editDraft.hours[key];
                          return (
                            <div key={key} className="flex flex-wrap items-center gap-3 text-sm">
                              <label className="flex w-28 items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={!!h}
                                  onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                                />
                                {label}
                              </label>
                              <input
                                type="time"
                                disabled={!h}
                                value={h?.start ?? "10:00"}
                                onChange={(e) => updateDay(key, { start: e.target.value })}
                                className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-40"
                              />
                              <span className="text-muted-foreground">to</span>
                              <input
                                type="time"
                                disabled={!h}
                                value={h?.end ?? "19:00"}
                                onChange={(e) => updateDay(key, { end: e.target.value })}
                                className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-40"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {editError && <p className="text-sm text-destructive">{editError}</p>}
                    <div className="flex gap-3">
                      <button
                        onClick={() => saveEdit(s.id)}
                        disabled={busy}
                        className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft(null);
                          setEditError(null);
                        }}
                        className="rounded-md border border-border px-5 py-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
