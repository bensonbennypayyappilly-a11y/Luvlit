import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CITIES } from "@/lib/constants";

type Location = { id: string; address: string | null; city: string; state: string | null; is_primary: boolean };
type DeliveryArea = { id: string; city: string | null; is_pan_india: boolean };

/** Persistent editor for a business's locations and delivery areas — separate tables from
 * `businesses`, so each add/remove is its own immediate, error-surfacing write. */
export function LocationsEditor({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ address: "", city: "", state: "" });

  const { data: locations } = useQuery({
    queryKey: ["builder-locations", businessId],
    queryFn: async () =>
      ((await supabase.from("locations").select("*").eq("business_id", businessId).order("is_primary", { ascending: false }))
        .data ?? []) as Location[],
  });
  const { data: deliveryAreas } = useQuery({
    queryKey: ["builder-delivery", businessId],
    queryFn: async () =>
      ((await supabase.from("delivery_areas").select("*").eq("business_id", businessId)).data ?? []) as DeliveryArea[],
  });

  const panIndia = (deliveryAreas ?? []).some((d) => d.is_pan_india);
  const deliveryCities = (deliveryAreas ?? []).filter((d) => !d.is_pan_india).map((d) => d.city);

  async function addLocation() {
    setError(null);
    if (!form.city) return setError("Pick a city first.");
    const { error: insertError } = await supabase.from("locations").insert({
      business_id: businessId,
      address: form.address || null,
      city: form.city,
      state: form.state || null,
      is_primary: !(locations ?? []).length,
    });
    if (insertError) return setError(insertError.message);
    setForm({ address: "", city: "", state: "" });
    qc.invalidateQueries({ queryKey: ["builder-locations", businessId] });
  }

  async function removeLocation(id: string) {
    setError(null);
    const { error: deleteError } = await supabase.from("locations").delete().eq("id", id);
    if (deleteError) return setError(deleteError.message);
    qc.invalidateQueries({ queryKey: ["builder-locations", businessId] });
  }

  async function setPanIndia(checked: boolean) {
    setError(null);
    const { error: deleteError } = await supabase.from("delivery_areas").delete().eq("business_id", businessId);
    if (deleteError) return setError(deleteError.message);
    if (checked) {
      const { error: insertError } = await supabase
        .from("delivery_areas")
        .insert({ business_id: businessId, city: null, is_pan_india: true });
      if (insertError) return setError(insertError.message);
    }
    qc.invalidateQueries({ queryKey: ["builder-delivery", businessId] });
  }

  async function toggleDeliveryCity(city: string) {
    setError(null);
    if (deliveryCities.includes(city)) {
      const row = (deliveryAreas ?? []).find((d) => d.city === city);
      if (!row) return;
      const { error: deleteError } = await supabase.from("delivery_areas").delete().eq("id", row.id);
      if (deleteError) return setError(deleteError.message);
    } else {
      const { error: insertError } = await supabase
        .from("delivery_areas")
        .insert({ business_id: businessId, city, is_pan_india: false });
      if (insertError) return setError(insertError.message);
    }
    qc.invalidateQueries({ queryKey: ["builder-delivery", businessId] });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium">Locations</p>
        <div className="mt-3 space-y-3">
          {(locations ?? []).map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-md border border-border p-4 text-xs">
              <div>
                <p className="text-sm font-medium">{l.city}{l.is_primary ? " · Main branch" : ""}</p>
                <p className="text-muted-foreground">{[l.address, l.state].filter(Boolean).join(", ")}</p>
              </div>
              <button type="button" onClick={() => removeLocation(l.id)} className="text-destructive">
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Address"
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm"
          />
          <div className="flex gap-3">
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm"
            >
              <option value="">City</option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="State"
              className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm"
            />
          </div>
          <button type="button" onClick={addLocation} className="rounded-md border border-accent px-4 py-2 text-sm">
            Add location
          </button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Delivery areas</p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={panIndia} onChange={(e) => setPanIndia(e.target.checked)} />
          I deliver / serve all of India
        </label>
        {!panIndia && (
          <div className="mt-3 flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => toggleDeliveryCity(c)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  deliveryCities.includes(c) ? "border-accent bg-accent-soft" : "border-border"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
