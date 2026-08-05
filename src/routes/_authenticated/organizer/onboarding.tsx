import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CITIES, EVENT_CATEGORIES } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/organizer/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your organizer profile — LuvLit" },
      {
        name: "description",
        content: "Set up your organizer profile on LuvLit and optionally list your first flea market or event.",
      },
      { property: "og:title", content: "Set up your organizer profile — LuvLit" },
      { property: "og:description", content: "Guided setup for event organizers on LuvLit." },
    ],
  }),
  component: OrganizerOnboarding,
});

function OrganizerOnboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("");

  const [addEvent, setAddEvent] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(EVENT_CATEGORIES[0]);
  const [eventCity, setEventCity] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Give your organization a name.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaving(false);
      setError("You need to be signed in.");
      return;
    }

    const { error: profileError } = await supabase
      .from("organizer_profiles")
      .upsert(
        {
          user_id: userId,
          name: name.trim(),
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          city: city || null,
        },
        { onConflict: "user_id" },
      );
    if (profileError) {
      setSaving(false);
      setError(profileError.message);
      return;
    }

    if (addEvent && title.trim() && startDate) {
      const { error: eventError } = await supabase.from("events").insert({
        organizer_id: userId,
        title: title.trim(),
        description: description || null,
        category,
        city: eventCity || city || null,
        address: address || null,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        status: "draft",
      });
      if (eventError) {
        setSaving(false);
        setError(eventError.message);
        return;
      }
    }

    setSaving(false);
    navigate({ to: "/organizer/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="eyebrow">Organizer setup</p>
        <h1 className="mt-2 text-3xl">Tell us about you</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Set up your organizer profile. You can list your first event now, or skip and add one later
          from your dashboard.
        </p>

        <div className="surface-card mt-8 space-y-4 p-6">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Organizer / organization name"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="Contact email"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Contact phone"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">City</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <label className="surface-card mt-6 flex items-center justify-between gap-4 p-5 text-sm">
          <span>Add your first event now</span>
          <input type="checkbox" checked={addEvent} onChange={(e) => setAddEvent(e.target.checked)} />
        </label>

        {addEvent && (
          <div className="surface-card mt-4 space-y-4 p-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {EVENT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={eventCity}
              onChange={(e) => setEventCity(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">City</option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Starts</p>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ends</p>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your event"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Your event will be saved as a draft — publish it from your dashboard when it's ready.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save and continue"}
        </button>
      </main>
      <SiteFooter />
    </div>
  );
}
