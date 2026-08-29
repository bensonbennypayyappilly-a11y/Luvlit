import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardBusiness } from "@/hooks/use-dashboard-business";
import { MediaUploader, useMediaUrl } from "@/components/media-uploader";
import { TableRowsSkeleton } from "@/components/ui/skeleton-shapes";

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
  is_active: boolean;
};

function Thumb({ path }: { path: string }) {
  const url = useMediaUrl(path);
  if (!url) return <div className="h-10 w-10 rounded-md border border-border bg-secondary" />;
  return <img src={url} alt="Product" className="h-10 w-10 rounded-md border border-border object-cover" />;
}

function normalizeImageUrls(urls: (string | null)[]): string[] {
  return urls.filter((u): u is string => !!u).slice(0, 2);
}

function ProductsPage() {
  const { data: business } = useDashboardBusiness();
  const businessId = business?.id ?? null;
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Item>>({ name: "", price: null, description: "" });
  const [draftImages, setDraftImages] = useState<(string | null)[]>([null, null]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Item>>({});
  const [editImages, setEditImages] = useState<(string | null)[]>([null, null]);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["dashboard-items", businessId],
    enabled: !!businessId,
    queryFn: async () =>
      ((await supabase.from("items").select("*").eq("business_id", businessId!).order("name")).data ?? []) as Item[],
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["dashboard-items", businessId] });
  }

  async function addItem() {
    if (!businessId || !draft.name?.trim()) return;
    setBusy(true);
    setAddError(null);
    const image_urls = normalizeImageUrls(draftImages);
    const { error } = await supabase.from("items").insert({
      business_id: businessId,
      name: draft.name.trim(),
      description: draft.description || null,
      price: draft.price ? Number(draft.price) : null,
      image_url: image_urls[0] ?? null,
      image_urls: image_urls as never,
      is_active: true,
    });
    setBusy(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setDraft({ name: "", price: null, description: "" });
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
    setBusy(true);
    setEditError(null);
    const image_urls = normalizeImageUrls(editImages);
    const { error } = await supabase
      .from("items")
      .update({
        name: editValues.name,
        description: editValues.description || null,
        price: editValues.price ? Number(editValues.price) : null,
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
    setToggleError(null);
    const { error } = await supabase.from("items").update({ is_active: !item.is_active }).eq("id", item.id);
    if (error) {
      setToggleError(error.message);
      return;
    }
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this product?")) return;
    setRemoveError(null);
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      setRemoveError(error.message);
      return;
    }
    refresh();
  }

  return (
    <div>
      <p className="eyebrow">Products</p>
      <h1 className="mt-2 text-2xl font-medium">Catalogue</h1>

      <div className="surface-card mt-6 p-5">
        <p className="text-sm font-medium">Add a product</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Name"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={draft.price ?? ""}
            onChange={(e) => setDraft({ ...draft, price: e.target.value as unknown as number })}
            placeholder="Price (₹)"
            type="number"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
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
          disabled={busy || !draft.name?.trim()}
          className="mt-3 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Add product
        </button>
        {addError && <p className="mt-2 text-sm text-destructive">{addError}</p>}
        {toggleError && <p className="mt-2 text-sm text-destructive">{toggleError}</p>}
        {removeError && <p className="mt-2 text-sm text-destructive">{removeError}</p>}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <TableRowsSkeleton cols={5} />}
            {!isLoading && (items ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-muted-foreground">No products yet.</td>
              </tr>
            )}
            {(items ?? []).map((item) =>
              editingId === item.id ? (
                <tr key={item.id} className="bg-accent-soft/40">
                  <td className="px-4 py-2">
                    <input
                      value={editValues.name ?? ""}
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={editValues.price ?? ""}
                      onChange={(e) => setEditValues({ ...editValues, price: e.target.value as unknown as number })}
                      className="w-24 rounded-md border border-border bg-background px-2 py-1"
                    />
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
                    <button onClick={() => saveEdit(item.id)} className="mr-2 text-accent">Save</button>
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
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.price != null ? `₹${item.price}` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : [])
                        .slice(0, 2)
                        .map((path, i) => (
                          <Thumb key={i} path={path} />
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
