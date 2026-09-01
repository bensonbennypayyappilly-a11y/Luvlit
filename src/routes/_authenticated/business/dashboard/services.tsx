import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { MediaUploader, useMediaUrl } from "@/components/media-uploader";
import { TableRowsSkeleton } from "@/components/ui/skeleton-shapes";
import { validateCatalogueName, validateDuration, validatePrice } from "@/lib/website-validation";
import { FieldError } from "@/components/field-error";

export const Route = createFileRoute("/_authenticated/business/dashboard/services")({
  head: () => ({
    meta: [
      { title: "Services — Business dashboard — LuvLit" },
      { name: "description", content: "Add, edit and manage the services you offer — price, duration and category." },
      { property: "og:title", content: "Services — Business dashboard — LuvLit" },
      { property: "og:description", content: "Manage the services listed on your LuvLit page." },
    ],
  }),
  component: ServicesPage,
});

type ServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
  position: number;
};

function Thumb({ path }: { path: string }) {
  const url = useMediaUrl(path);
  if (!url) return <div className="h-10 w-10 rounded-md border border-border bg-secondary" />;
  return <img src={url} alt="Service" className="h-10 w-10 rounded-md border border-border object-cover" />;
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

function CategoryPicker({ value, categories, onChange }: { value: string | null; categories: string[]; onChange: (v: string | null) => void }) {
  if (!categories.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded-full border px-3 py-1.5 text-xs ${!value ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground"}`}
      >
        No category
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`rounded-full border px-3 py-1.5 text-xs ${value === c ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground"}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function ServicesPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<ServiceRow>>({ name: "", price: null, description: "", duration_minutes: 30, category: null });
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ServiceRow>>({});
  const [editImage, setEditImage] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const { data: businessCategories } = useQuery({
    queryKey: ["dashboard-business-categories", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      ((await supabase.from("businesses").select("categories").eq("id", businessId!).maybeSingle()).data?.categories ??
        []) as string[],
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ["dashboard-services", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      ((await supabase.from("services").select("*").eq("business_id", businessId!).order("position").order("name")).data ??
        []) as ServiceRow[],
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["dashboard-services", businessId] });
  }

  const draftErrors = {
    name: validateCatalogueName(draft.name ?? "", "service"),
    price: validatePrice(draft.price),
    duration: validateDuration(draft.duration_minutes),
  };
  const editErrors = {
    name: validateCatalogueName(editValues.name ?? "", "service"),
    price: validatePrice(editValues.price),
    duration: validateDuration(editValues.duration_minutes),
  };
  const draftInvalid = !!draftErrors.name || !!draftErrors.price || !!draftErrors.duration;
  const editInvalid = !!editErrors.name || !!editErrors.price || !!editErrors.duration;

  async function addService() {
    if (!businessId || !draft.name?.trim() || draftInvalid) return;
    setBusy(true);
    setAddError(null);
    const nextPosition = (services ?? []).reduce((max, s) => Math.max(max, s.position ?? 0), 0) + 1;
    const { error } = await supabase.from("services").insert({
      business_id: businessId,
      name: draft.name.trim(),
      description: draft.description || null,
      price: draft.price ? Number(draft.price) : null,
      duration_minutes: draft.duration_minutes || 30,
      category: draft.category || null,
      image_url: draftImage,
      is_active: true,
      position: nextPosition,
    });
    setBusy(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setDraft({ name: "", price: null, description: "", duration_minutes: 30, category: null });
    setDraftImage(null);
    refresh();
  }

  function startEdit(s: ServiceRow) {
    setEditError(null);
    setEditingId(s.id);
    setEditValues(s);
    setEditImage(s.image_url);
  }

  async function saveEdit(id: string) {
    if (editInvalid) return;
    setBusy(true);
    setEditError(null);
    const { error } = await supabase
      .from("services")
      .update({
        name: editValues.name,
        description: editValues.description || null,
        price: editValues.price ? Number(editValues.price) : null,
        duration_minutes: editValues.duration_minutes || 30,
        category: editValues.category || null,
        image_url: editImage,
      })
      .eq("id", id);
    setBusy(false);
    if (error) {
      setEditError(error.message);
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function toggleActive(s: ServiceRow) {
    setRowError(null);
    const { error } = await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) return setRowError(error.message);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this service?")) return;
    setRowError(null);
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return setRowError(error.message);
    refresh();
  }

  async function duplicate(s: ServiceRow) {
    setRowError(null);
    const nextPosition = (services ?? []).reduce((max, r) => Math.max(max, r.position ?? 0), 0) + 1;
    const { error } = await supabase.from("services").insert({
      business_id: s.business_id,
      name: `${s.name} (copy)`,
      description: s.description,
      price: s.price,
      duration_minutes: s.duration_minutes,
      category: s.category,
      image_url: s.image_url,
      is_active: s.is_active,
      position: nextPosition,
    });
    if (error) return setRowError(error.message);
    refresh();
  }

  async function move(index: number, dir: -1 | 1) {
    const list = services ?? [];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    setRowError(null);
    const a = list[index];
    const b = list[target];
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("services").update({ position: b.position }).eq("id", a.id),
      supabase.from("services").update({ position: a.position }).eq("id", b.id),
    ]);
    if (e1 || e2) return setRowError((e1 ?? e2)!.message);
    refresh();
  }

  return (
    <div>
      <p className="eyebrow">Services</p>
      <h1 className="mt-2 text-2xl font-medium">What you offer</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Separate from Products — for things you do, not things you sell. Price is treated as a starting price.
      </p>

      <div className="surface-card mt-6 p-5">
        <p className="text-sm font-medium">Add a service</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <input
              value={draft.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Name"
              aria-invalid={!!draftErrors.name}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                draftErrors.name && draft.name ? "border-destructive" : "border-border"
              }`}
            />
            {draft.name ? <FieldError message={draftErrors.name} /> : null}
          </div>
          <div>
            <input
              value={draft.price ?? ""}
              onChange={(e) => setDraft({ ...draft, price: e.target.value as unknown as number })}
              placeholder="Starting price (₹, optional)"
              type="number"
              min={0}
              aria-invalid={!!draftErrors.price}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                draftErrors.price ? "border-destructive" : "border-border"
              }`}
            />
            <FieldError message={draftErrors.price} />
          </div>
          <select
            value={draft.duration_minutes ?? 30}
            onChange={(e) => setDraft({ ...draft, duration_minutes: Number(e.target.value) })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </div>
        {(businessCategories ?? []).length > 0 && (
          <div className="mt-3">
            <CategoryPicker value={draft.category ?? null} categories={businessCategories ?? []} onChange={(v) => setDraft({ ...draft, category: v })} />
          </div>
        )}
        {businessId && (
          <div className="mt-3 max-w-xs">
            <MediaUploader businessId={businessId} kind="product" value={draftImage} onChange={setDraftImage} label="Photo (optional)" />
          </div>
        )}
        <textarea
          value={draft.description ?? ""}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="Description (optional)"
          rows={2}
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={addService}
          disabled={busy || !draft.name?.trim() || draftInvalid}
          className="mt-3 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add service"}
        </button>
        {addError && <p className="mt-2 text-sm text-destructive">{addError}</p>}
        {rowError && <p className="mt-2 text-sm text-destructive">{rowError}</p>}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-3"></th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <TableRowsSkeleton cols={7} />}
            {!isLoading && (services ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <p className="text-sm font-medium">No services yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Add your first service above — it shows on your website's Services page, and customers can pick it
                    when booking an appointment.
                  </p>
                </td>
              </tr>
            )}
            {(services ?? []).map((s, i) =>
              editingId === s.id ? (
                <tr key={s.id} className="bg-accent-soft/40">
                  <td />
                  <td className="px-4 py-2">
                    <input
                      value={editValues.name ?? ""}
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      aria-invalid={!!editErrors.name}
                      className={`w-full rounded-md border bg-background px-2 py-1 ${
                        editErrors.name ? "border-destructive" : "border-border"
                      }`}
                    />
                    <FieldError message={editErrors.name} />
                  </td>
                  <td className="px-4 py-2">
                    <CategoryPicker
                      value={editValues.category ?? null}
                      categories={businessCategories ?? []}
                      onChange={(v) => setEditValues({ ...editValues, category: v })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      value={editValues.price ?? ""}
                      onChange={(e) => setEditValues({ ...editValues, price: e.target.value as unknown as number })}
                      aria-invalid={!!editErrors.price}
                      className={`w-24 rounded-md border bg-background px-2 py-1 ${
                        editErrors.price ? "border-destructive" : "border-border"
                      }`}
                    />
                    <FieldError message={editErrors.price} />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editValues.duration_minutes ?? 30}
                      onChange={(e) => setEditValues({ ...editValues, duration_minutes: Number(e.target.value) })}
                      className="rounded-md border border-border bg-background px-2 py-1"
                    >
                      {DURATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d} min
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{s.is_active ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-2 text-right align-top">
                    <button
                      onClick={() => saveEdit(s.id)}
                      disabled={busy || editInvalid}
                      className="mr-2 text-accent disabled:opacity-50"
                    >
                      {busy ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditError(null);
                      }}
                      className="text-muted-foreground"
                    >
                      Cancel
                    </button>
                    {editError && <p className="mt-2 text-sm text-destructive">{editError}</p>}
                  </td>
                </tr>
              ) : (
                <tr key={s.id}>
                  <td className="px-1 py-3">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label="Move up"
                        className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={i === (services?.length ?? 0) - 1}
                        onClick={() => move(i, 1)}
                        aria-label="Move down"
                        className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.image_url && <Thumb path={s.image_url} />}
                      {s.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.category ?? "—"}</td>
                  <td className="px-4 py-3">{s.price != null ? `From ₹${s.price}` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.duration_minutes} min</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        s.is_active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground"
                      }`}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(s)} className="mr-3 text-accent">Edit</button>
                    <button onClick={() => duplicate(s)} className="mr-3 text-muted-foreground hover:text-foreground">Duplicate</button>
                    <button onClick={() => remove(s.id)} className="text-destructive">Remove</button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
