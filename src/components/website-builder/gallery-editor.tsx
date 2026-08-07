import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaUploader, useMediaUrl } from "@/components/media-uploader";
import { GALLERY_MAX } from "@/lib/constants";

function GalleryThumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const url = useMediaUrl(path);
  return (
    <div className="relative overflow-hidden rounded-md border border-border">
      {url ? (
        <img src={url} alt="Gallery item" className="h-24 w-full object-cover" />
      ) : (
        <div className="h-24 w-full bg-secondary" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-md bg-background/90 px-2 py-0.5 text-[0.65rem] text-destructive"
      >
        Remove
      </button>
    </div>
  );
}

/** Up to GALLERY_MAX photos; writes businesses.gallery_urls immediately on each add/remove. */
export function GalleryEditor({
  businessId,
  value,
  onSaved,
}: {
  businessId: string;
  value: string[];
  onSaved: (urls: string[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function persist(urls: string[]) {
    setError(null);
    const { error: saveError } = await supabase.from("businesses").update({ gallery_urls: urls }).eq("id", businessId);
    if (saveError) return setError(saveError.message);
    onSaved(urls);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {value.map((path, i) => (
          <GalleryThumb
            key={`${path}-${i}`}
            path={path}
            onRemove={() => persist(value.filter((_, idx) => idx !== i))}
          />
        ))}
      </div>
      {value.length < GALLERY_MAX ? (
        <MediaUploader
          businessId={businessId}
          kind="gallery"
          value={null}
          onChange={(path) => path && persist([...value, path])}
          label={`Add a photo (${value.length}/${GALLERY_MAX})`}
        />
      ) : (
        <p className="text-xs text-muted-foreground">You've reached the {GALLERY_MAX}-photo limit.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
