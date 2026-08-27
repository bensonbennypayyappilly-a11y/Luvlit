import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/_authenticated/business/setup-staff")({
  head: () => ({
    meta: [
      { title: "Add your team & booking slots — LuvLit" },
      {
        name: "description",
        content:
          "Add staff, working hours and slot lengths so customers can book appointments with you on LuvLit.",
      },
      { property: "og:title", content: "Add your team & booking slots — LuvLit" },
      { property: "og:description", content: "Set up appointments for your LuvLit page." },
    ],
  }),
  component: SetupStaff,
});

function SetupStaff() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([
    { name: "", specializations: "", start: "10:00", end: "19:00", duration: 30 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userData.user!.id)
      .maybeSingle();
    if (!business) {
      setBusy(false);
      return setError("Set up your business profile first.");
    }

    for (const member of staff.filter((s) => s.name.trim())) {
      const { data: row, error: staffError } = await supabase
        .from("staff")
        .insert({
          business_id: business.id,
          name: member.name,
          specializations: member.specializations
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          working_hours: { start: member.start, end: member.end, days: [1, 2, 3, 4, 5, 6] },
          slot_duration_minutes: Number(member.duration),
        })
        .select("id")
        .single();
      if (staffError || !row) {
        setBusy(false);
        return setError(staffError?.message ?? "Could not save staff member.");
      }

      const slots: { staff_id: string; date: string; start_time: string }[] = [];
      for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() + day);
        if (date.getDay() === 0) continue;
        const iso = date.toISOString().slice(0, 10);
        const [sh, sm] = member.start.split(":").map(Number);
        const [eh, em] = member.end.split(":").map(Number);
        for (let t = sh * 60 + sm; t + Number(member.duration) <= eh * 60 + em; t += Number(member.duration)) {
          slots.push({
            staff_id: row.id,
            date: iso,
            start_time: `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}:00`,
          });
        }
      }
      for (let i = 0; i < slots.length; i += 500) {
        const { error: slotsError } = await supabase.from("slots").insert(slots.slice(i, i + 500));
        if (slotsError) {
          setBusy(false);
          return setError(slotsError.message);
        }
      }
    }
    setBusy(false);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20">
        <p className="eyebrow">Appointments</p>
        <h1 className="mt-4 text-4xl">Add your team</h1>
        <p className="mt-4 text-muted-foreground">
          We'll generate bookable slots for the next 30 days from these hours.
        </p>

        <div className="mt-10 space-y-6">
          {staff.map((member, index) => (
            <div key={index} className="surface-card space-y-4 p-6">
              <input
                value={member.name}
                onChange={(e) =>
                  setStaff(staff.map((s, i) => (i === index ? { ...s, name: e.target.value } : s)))
                }
                placeholder="Name"
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
              />
              <input
                value={member.specializations}
                onChange={(e) =>
                  setStaff(
                    staff.map((s, i) =>
                      i === index ? { ...s, specializations: e.target.value } : s,
                    ),
                  )
                }
                placeholder="Specializations, comma separated"
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm"
              />
              <div className="flex flex-wrap gap-3">
                <input
                  type="time"
                  value={member.start}
                  onChange={(e) =>
                    setStaff(staff.map((s, i) => (i === index ? { ...s, start: e.target.value } : s)))
                  }
                  className="rounded-md border border-border bg-card px-4 py-3 text-sm"
                />
                <input
                  type="time"
                  value={member.end}
                  onChange={(e) =>
                    setStaff(staff.map((s, i) => (i === index ? { ...s, end: e.target.value } : s)))
                  }
                  className="rounded-md border border-border bg-card px-4 py-3 text-sm"
                />
                <select
                  value={member.duration}
                  onChange={(e) =>
                    setStaff(
                      staff.map((s, i) =>
                        i === index ? { ...s, duration: Number(e.target.value) } : s,
                      ),
                    )
                  }
                  className="rounded-md border border-border bg-card px-4 py-3 text-sm"
                >
                  <option value={15}>15 min slots</option>
                  <option value={30}>30 min slots</option>
                  <option value={60}>60 min slots</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

        <div className="mt-8 flex gap-3">
          <button
            onClick={() =>
              setStaff([
                ...staff,
                { name: "", specializations: "", start: "10:00", end: "19:00", duration: 30 },
              ])
            }
            className="rounded-md border border-border px-6 py-3 text-sm"
          >
            Add another
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-md bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Generating slots…" : "Save & finish"}
          </button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
