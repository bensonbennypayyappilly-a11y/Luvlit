import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaUploader, useMediaUrl } from "@/components/media-uploader";
import { GALLERY_MAX } from "@/lib/constants";

function GalleryThumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const url = useMediaUrl(path);
  return (
    <div className="group relative overflow-hidden rounded-[10px] border border-[#EEEEEE]">
      {url ? (
        <img src={url} alt="Gallery item" className="h-24 w-full object-cover" />
      ) : (
        <div className="h-24 w-full bg-[#FAFAFA]" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 rounded-[6px] bg-white/95 px-2 py-1 text-[11px] font-medium text-destructive shadow-sm transition-colors duration-150 hover:bg-white"
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
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
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
          wrapperClassName="rounded-[10px] border border-[#EAEAEA] bg-white p-4"
        />
      ) : (
        <p className="text-xs text-muted-foreground">You've reached the {GALLERY_MAX}-photo limit.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
