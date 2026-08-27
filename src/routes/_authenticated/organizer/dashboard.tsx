import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CITIES, EVENT_CATEGORIES, EVENT_FEATURED_PRICING } from "@/lib/constants";
import { MediaUploader } from "@/components/media-uploader";
import type { Database } from "@/integrations/supabase/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export const Route = createFileRoute("/_authenticated/organizer/dashboard")({
  head: () => ({
    meta: [
      { title: "Organizer dashboard — LuvLit" },
      {
        name: "description",
        content: "Manage your flea markets and events on LuvLit — publish, edit, and feature listings.",
      },
      { property: "og:title", content: "Organizer dashboard — LuvLit" },
      { property: "og:description", content: "Manage your events on LuvLit." },
    ],
  }),
  component: OrganizerDashboard,
});

const emptyForm = {
  title: "",
  description: "",
  category: EVENT_CATEGORIES[0],
  city: "",
  address: "",
  latitude: "",
  longitude: "",
  start_date: "",
  end_date: "",
  poster: null as string | null,
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-accent-soft text-accent-foreground border-accent/40",
    draft: "border-border text-muted-foreground",
    cancelled: "border-destructive/40 text-destructive",
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[0.6875rem] uppercase tracking-[0.1em] ${styles[status] ?? "border-border text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function OrganizerDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["organizer-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      setUserId(uid);
      if (!uid) return null;
      const { data } = await supabase
        .from("organizer_profiles")
        .select("*")
        .eq("user_id", uid)
        .is("deleted_at", null)
        .maybeSingle();
      setChecked(true);
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["organizer-events", userId],
    enabled: !!userId,
    queryFn: async () =>
      (
        await supabase
          .from("events")
          .select("*")
          .eq("organizer_id", userId!)
          .order("start_date", { ascending: false })
      ).data as EventRow[] | null,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [featuring, setFeaturing] = useState<string | null>(null);
  const [featureMessage, setFeatureMessage] = useState<string | null>(null);

  if (checked && !profile) {
    navigate({ to: "/organizer/onboarding" });
    return null;
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function startEdit(ev: EventRow) {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      category: ev.category ?? EVENT_CATEGORIES[0],
      city: ev.city ?? "",
      address: ev.address ?? "",
      latitude: (ev as unknown as { latitude: number | null }).latitude?.toString() ?? "",
      longitude: (ev as unknown as { longitude: number | null }).longitude?.toString() ?? "",
      start_date: toLocalInput(ev.start_date),
      end_date: toLocalInput(ev.end_date),
      poster: ev.image_urls?.[0] ?? null,
    });
    setShowForm(true);
    setError(null);
  }

  async function saveEvent() {
    if (!userId) return;
    if (!form.title.trim() || !form.start_date) {
      setError("Title and start date are required.");
      return;
    }
    const payload = {
      organizer_id: userId,
      title: form.title.trim(),
      description: form.description || null,
      category: form.category,
      city: form.city || null,
      address: form.address || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      image_urls: form.poster ? [form.poster] : [],
    } as any;
    const { error: saveError } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId)
      : await supabase.from("events").insert({ ...payload, status: "draft" });
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ["organizer-events", userId] });
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    const { error: deleteError } = await supabase.from("events").delete().eq("id", id);
    if (deleteError) {
      setFeatureMessage(deleteError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["organizer-events", userId] });
  }

  async function togglePublish(ev: EventRow) {
    const status = ev.status === "published" ? "draft" : "published";
    const { error: publishError } = await supabase.from("events").update({ status }).eq("id", ev.id);
    if (publishError) {
      setFeatureMessage(publishError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["organizer-events", userId] });
  }

  async function feature(ev: EventRow, plan: "week" | "month") {
    const until = new Date();
    until.setDate(until.getDate() + (plan === "week" ? 7 : 30));
    const { error: featureError } = await supabase
      .from("events")
      .update({ is_featured: true, featured_until: until.toISOString() })
      .eq("id", ev.id);
    if (featureError) {
      setFeatureMessage(featureError.message);
      return;
    }
    setFeatureMessage(
      `Featured placement reserved (₹${EVENT_FEATURED_PRICING[plan]}) — billing isn't wired up yet.`,
    );
    setFeaturing(null);
    qc.invalidateQueries({ queryKey: ["organizer-events", userId] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Organizer dashboard</p>
            <h1 className="mt-2 text-2xl font-medium">Your events</h1>
          </div>
          <button
            onClick={startCreate}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            New event
          </button>
        </div>

        {showForm && (
          <div className="surface-card mt-6 space-y-4 p-6">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Event title"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {EVENT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">City</option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Address"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="Latitude"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="Longitude"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Optional — lets customers filter events by distance
            </p>
            {userId && (
              <MediaUploader
                businessId={userId}
                kind="poster"
                bucket="event-media"
                value={form.poster}
                onChange={(path) => setForm({ ...form, poster: path })}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Starts</p>
                <input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ends</p>
                <input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={saveEvent}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Save
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border border-border px-5 py-2.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {featureMessage && (
          <p className="mt-6 text-sm text-muted-foreground">{featureMessage}</p>
        )}

        <div className="mt-8 space-y-3">
          {(events ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No events yet — create your first one above.</p>
          )}
          {(events ?? []).map((ev) => (
            <div key={ev.id} className="surface-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{ev.title}</h3>
                    <StatusBadge status={ev.status} />
                    {ev.is_featured && ev.featured_until && new Date(ev.featured_until) > new Date() && (
                      <span className="rounded-full bg-accent px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.1em] text-accent-foreground">
                        Featured until {new Date(ev.featured_until).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ev.city ?? "—"} · {new Date(ev.start_date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => startEdit(ev)} className="rounded-md border border-border px-3 py-1.5 text-xs">
                    Edit
                  </button>
                  <button onClick={() => togglePublish(ev)} className="rounded-md border border-border px-3 py-1.5 text-xs">
                    {ev.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => setFeaturing(featuring === ev.id ? null : ev.id)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs"
                  >
                    Feature this event
                  </button>
                  <button onClick={() => deleteEvent(ev.id)} className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive">
                    Delete
                  </button>
                </div>
              </div>

              {featuring === ev.id && (
                <div className="mt-4 rounded-lg border border-border p-4">
                  <p className="text-sm font-medium">Feature this event</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      onClick={() => feature(ev, "week")}
                      className="rounded-md border border-border px-4 py-2 text-sm hover:border-accent hover:bg-accent-soft"
                    >
                      1 week — ₹{EVENT_FEATURED_PRICING.week}
                    </button>
                    <button
                      onClick={() => feature(ev, "month")}
                      className="rounded-md border border-border px-4 py-2 text-sm hover:border-accent hover:bg-accent-soft"
                    >
                      1 month — ₹{EVENT_FEATURED_PRICING.month}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Payment isn't wired up yet — reserving a slot here doesn't charge you. Billing is
                    activated separately.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          <Link to="/organizer/onboarding" className="underline">
            Edit your organizer profile
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
