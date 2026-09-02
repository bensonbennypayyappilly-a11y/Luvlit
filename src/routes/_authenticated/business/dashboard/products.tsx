import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { MediaUploader, useMediaUrl } from "@/components/media-uploader";
import { DashboardBackLink } from "@/components/dashboard-back-link";
import { TableRowsSkeleton } from "@/components/ui/skeleton-shapes";
import { validateCatalogueName, validatePrice } from "@/lib/website-validation";
import { FieldError } from "@/components/field-error";

export const Route = createFileRoute("/_authenticated/business/dashboard/products")({
  head: () => ({
    meta: [
      { title: "Products — Business dashboard — LuvLit" },
      { name: "description", content: "Add, edit and manage the products or services listed on your business page." },
      { property: "og:title", content: "Products — Business dashboard — LuvLit" },
      { property: "og:description", content: "Manage your LuvLit product catalogue." },
    ],
  }),
  component: ProductsPage,
});

type Item = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  image_urls: string[] | null;
  category: string | null;
  is_active: boolean;
  position: number;
};

function Thumb({ path }: { path: string }) {
  const url = useMediaUrl(path);
  if (!url) return <div className="h-10 w-10 rounded-md border border-border bg-secondary" />;
  return <img src={url} alt="Product" className="h-10 w-10 rounded-md border border-border object-cover" />;
}

function normalizeImageUrls(urls: (string | null)[]): string[] {
  return urls.filter((u): u is string => !!u).slice(0, 2);
}

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

function ProductsPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Item>>({ name: "", price: null, description: "", category: null });
  const [draftImages, setDraftImages] = useState<(string | null)[]>([null, null]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Item>>({});
  const [editImages, setEditImages] = useState<(string | null)[]>([null, null]);
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

  const { data: items, isLoading } = useQuery({
    queryKey: ["dashboard-items", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      ((await supabase.from("items").select("*").eq("business_id", businessId!).order("position").order("name")).data ??
        []) as Item[],
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["dashboard-items", businessId] });
  }

  // Validated live off the draft so the error appears as the owner types, and clears the moment
  // they fix it — the Add button stays disabled until both fields are acceptable.
  const draftErrors = {
    name: draft.name === undefined ? null : validateCatalogueName(draft.name ?? "", "product"),
    price: validatePrice(draft.price),
  };
  const editErrors = {
    name: validateCatalogueName(editValues.name ?? "", "product"),
    price: validatePrice(editValues.price),
  };

  async function addItem() {
    if (!businessId || !draft.name?.trim() || draftErrors.name || draftErrors.price) return;
    setBusy(true);
    setAddError(null);
    const image_urls = normalizeImageUrls(draftImages);
    const nextPosition = (items ?? []).reduce((max, i) => Math.max(max, i.position ?? 0), 0) + 1;
    const { error } = await supabase.from("items").insert({
      business_id: businessId,
      name: draft.name.trim(),
      description: draft.description || null,
      price: draft.price ? Number(draft.price) : null,
      category: draft.category || null,
      image_url: image_urls[0] ?? null,
      image_urls: image_urls as never,
      is_active: true,
      position: nextPosition,
    });
    setBusy(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setDraft({ name: "", price: null, description: "", category: null });
    setDraftImages([null, null]);
    refresh();
  }

  function startEdit(item: Item) {
    setEditError(null);
    setEditingId(item.id);
    setEditValues(item);
    const existing = item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : [];
    setEditImages([existing[0] ?? null, existing[1] ?? null]);
  }

  async function saveEdit(id: string) {
    if (editErrors.name || editErrors.price) return;
    setBusy(true);
    setEditError(null);
    const image_urls = normalizeImageUrls(editImages);
    const { error } = await supabase
      .from("items")
      .update({
        name: editValues.name,
        description: editValues.description || null,
        price: editValues.price ? Number(editValues.price) : null,
        category: editValues.category || null,
        image_url: image_urls[0] ?? null,
        image_urls: image_urls as never,
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

  async function toggleActive(item: Item) {
    setRowError(null);
    const { error } = await supabase.from("items").update({ is_active: !item.is_active }).eq("id", item.id);
    if (error) return setRowError(error.message);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this product?")) return;
    setRowError(null);
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) return setRowError(error.message);
    refresh();
  }

  async function duplicate(item: Item) {
    setRowError(null);
    const nextPosition = (items ?? []).reduce((max, i) => Math.max(max, i.position ?? 0), 0) + 1;
    const { error } = await supabase.from("items").insert({
      business_id: item.business_id,
      name: `${item.name} (copy)`,
      description: item.description,
      price: item.price,
      category: item.category,
      image_url: item.image_url,
      image_urls: item.image_urls as never,
      is_active: item.is_active,
      position: nextPosition,
    });
    if (error) return setRowError(error.message);
    refresh();
  }

  async function move(index: number, dir: -1 | 1) {
    const list = items ?? [];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    setRowError(null);
    const a = list[index];
    const b = list[target];
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("items").update({ position: b.position }).eq("id", a.id),
      supabase.from("items").update({ position: a.position }).eq("id", b.id),
    ]);
    if (e1 || e2) return setRowError((e1 ?? e2)!.message);
    refresh();
  }

  return (
    <div>
      <DashboardBackLink />
      <p className="eyebrow">Products</p>
      <h1 className="mt-2 text-2xl font-medium">Catalogue</h1>

      <div className="dashboard-card mt-6 p-5">
        <p className="text-sm font-medium">Add a product</p>
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
              placeholder="Price (₹)"
              type="number"
              min={0}
              aria-invalid={!!draftErrors.price}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                draftErrors.price ? "border-destructive" : "border-border"
              }`}
            />
            <FieldError message={draftErrors.price} />
          </div>
        </div>
        {(businessCategories ?? []).length > 0 && (
          <div className="mt-3">
            <CategoryPicker value={draft.category ?? null} categories={businessCategories ?? []} onChange={(v) => setDraft({ ...draft, category: v })} />
          </div>
        )}
        {businessId && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <MediaUploader
              businessId={businessId}
              kind="product"
              value={draftImages[0]}
              onChange={(path) => setDraftImages([path, draftImages[1]])}
              label="Photo 1"
            />
            <MediaUploader
              businessId={businessId}
              kind="product"
              value={draftImages[1]}
              onChange={(path) => setDraftImages([draftImages[0], path])}
              label="Photo 2 (optional)"
            />
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
          onClick={addItem}
          disabled={busy || !draft.name?.trim() || !!draftErrors.name || !!draftErrors.price}
          className="mt-3 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add product"}
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
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <TableRowsSkeleton cols={7} />}
            {!isLoading && (items ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <p className="text-sm font-medium">No products yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Add your first product above — it appears on your website's Products page as soon as you publish.
                  </p>
                </td>
              </tr>
            )}
            {(items ?? []).map((item, i) =>
              editingId === item.id ? (
                <tr key={item.id} className="bg-accent-soft/40">
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
                    {businessId && (
                      <div className="flex flex-col gap-2">
                        <MediaUploader
                          businessId={businessId}
                          kind="product"
                          value={editImages[0]}
                          onChange={(path) => setEditImages([path, editImages[1]])}
                          label="Photo 1"
                        />
                        <MediaUploader
                          businessId={businessId}
                          kind="product"
                          value={editImages[1]}
                          onChange={(path) => setEditImages([editImages[0], path])}
                          label="Photo 2 (optional)"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{item.is_active ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-2 text-right align-top">
                    <button
                      onClick={() => saveEdit(item.id)}
                      disabled={busy || !!editErrors.name || !!editErrors.price}
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
                <tr key={item.id}>
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
                        disabled={i === (items?.length ?? 0) - 1}
                        onClick={() => move(i, 1)}
                        aria-label="Move down"
                        className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.category ?? "—"}</td>
                  <td className="px-4 py-3">{item.price != null ? `₹${item.price}` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : [])
                        .slice(0, 2)
                        .map((path, j) => (
                          <Thumb key={j} path={path} />
                        ))}
                      {!(item.image_urls?.length || item.image_url) && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        item.is_active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(item)} className="mr-3 text-accent">Edit</button>
                    <button onClick={() => duplicate(item)} className="mr-3 text-muted-foreground hover:text-foreground">Duplicate</button>
                    <button onClick={() => remove(item.id)} className="text-destructive">Remove</button>
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
