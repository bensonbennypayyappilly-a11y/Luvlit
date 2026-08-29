import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "business-media";

export const MEDIA_LIMITS = {
  logo: {
    maxBytes: 2 * 1024 * 1024,
    maxSeconds: 0,
    accept: "image/*",
    label: "Business logo (small image, max 2MB)",
  },
  hero: {
    maxBytes: 20 * 1024 * 1024,
    maxSeconds: 0,
    accept: "image/*",
    label: "Listing thumbnail & page hero",
  },
  gallery: {
    maxBytes: 10 * 1024 * 1024,
    maxSeconds: 0,
    accept: "image/*",
    label: "Gallery photo",
  },
  short: {
    maxBytes: 15 * 1024 * 1024,
    maxSeconds: 60,
    accept: "video/*",
    label: "Short video (max 60s)",
  },
  main: {
    maxBytes: 20 * 1024 * 1024,
    maxSeconds: 180,
    accept: "video/*",
    label: "Main video (max 20MB)",
  },
  poster: {
    maxBytes: 10 * 1024 * 1024,
    maxSeconds: 0,
    accept: "image/*",
    label: "Event poster",
  },
  product: {
    maxBytes: 10 * 1024 * 1024,
    maxSeconds: 0,
    accept: "image/*",
    label: "Product photo",
  },
} as const;

export type MediaKind = keyof typeof MEDIA_LIMITS;

export function isStoragePath(value: string | null | undefined) {
  return !!value && !/^https?:\/\//i.test(value);
}

/** Resolves a stored value (external URL or storage object path) to a displayable URL. */
export function useMediaUrl(value: string | null | undefined, bucket: string = MEDIA_BUCKET) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!value) return setUrl(null);
    if (!isStoragePath(value)) return setUrl(value);
    supabase.storage
      .from(bucket)
      .createSignedUrl(value, 60 * 60 * 24 * 7)
      .then(({ data, error }) => {
        if (error) console.error(error.message);
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [value, bucket]);
  return url;
}

function readDuration(file: File) {
  return new Promise<number>((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      resolve(el.duration || 0);
      URL.revokeObjectURL(el.src);
    };
    el.onerror = () => resolve(0);
    el.src = URL.createObjectURL(file);
  });
}

const IMAGE_KINDS: MediaKind[] = ["logo", "hero", "gallery", "poster", "product"];

/** Downscale + re-encode large images in the browser so we never upload raw 20MB JPEGs. */
async function compressImage(file: File, maxEdge: number, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_200_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

type Props = {
  businessId: string;
  kind: MediaKind;
  value: string | null;
  onChange: (path: string | null) => void;
  label?: string;
  /** Storage bucket override; defaults to business-media. */
  bucket?: string;
};

export function MediaUploader({
  businessId,
  kind,
  value,
  onChange,
  label,
  bucket = MEDIA_BUCKET,
}: Props) {
  const limits = MEDIA_LIMITS[kind];
  const previewUrl = useMediaUrl(value, bucket);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const upload = useCallback(
    async (input: File) => {
      setError(null);
      let file = input;
      if (IMAGE_KINDS.includes(kind)) {
        file = await compressImage(input, kind === "logo" ? 600 : 2200);
      }
      if (file.size > limits.maxBytes) {
        return setError(
          `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${
            limits.maxBytes / 1024 / 1024
          }MB.`,
        );
      }
      if (limits.maxSeconds) {
        const seconds = await readDuration(file);
        if (seconds && seconds > limits.maxSeconds + 1) {
          return setError(
            `That video is ${Math.round(seconds)}s long — the limit is ${limits.maxSeconds}s.`,
          );
        }
      }
      setProgress(10);
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${businessId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const timer = setInterval(() => setProgress((p) => (p == null ? p : Math.min(p + 7, 92))), 400);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      clearInterval(timer);
      if (uploadError) {
        setProgress(null);
        return setError(uploadError.message);
      }
      setProgress(100);
      onChange(path);
      setTimeout(() => setProgress(null), 600);
    },
    [businessId, kind, limits, onChange, bucket],
  );

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{label ?? limits.label}</p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      {previewUrl && (
        <div className="mt-4 overflow-hidden rounded-md border border-border">
          {IMAGE_KINDS.includes(kind) ? (
            <img
              src={previewUrl}
              alt="Uploaded preview"
              className={
                kind === "logo"
                  ? "h-24 w-24 rounded-md object-contain p-2"
                  : "h-44 w-full object-cover"
              }
            />
          ) : (
            <video src={previewUrl} controls className="h-44 w-full bg-black object-contain" />
          )}
        </div>
      )}

      <input
        type="file"
        accept={limits.accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
        className="mt-4 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-accent file:bg-transparent file:px-4 file:py-2 file:text-sm file:text-accent"
      />

      {progress != null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
          />
        </div>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
