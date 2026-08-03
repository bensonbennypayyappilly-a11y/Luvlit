import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "business-media";

export const MEDIA_LIMITS = {
  hero: { maxBytes: 10 * 1024 * 1024, maxSeconds: 0, accept: "image/*", label: "Hero image" },
  short: {
    maxBytes: 50 * 1024 * 1024,
    maxSeconds: 60,
    accept: "video/*",
    label: "Short video (max 60s)",
  },
  main: {
    maxBytes: 150 * 1024 * 1024,
    maxSeconds: 180,
    accept: "video/*",
    label: "Main video (max 3 min)",
  },
} as const;

export type MediaKind = keyof typeof MEDIA_LIMITS;

export function isStoragePath(value: string | null | undefined) {
  return !!value && !/^https?:\/\//i.test(value);
}

/** Resolves a stored value (external URL or storage object path) to a displayable URL. */
export function useMediaUrl(value: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!value) return setUrl(null);
    if (!isStoragePath(value)) return setUrl(value);
    supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(value, 60 * 60 * 24 * 7)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [value]);
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

type Props = {
  businessId: string;
  kind: MediaKind;
  value: string | null;
  onChange: (path: string | null) => void;
};

export function MediaUploader({ businessId, kind, value, onChange }: Props) {
  const limits = MEDIA_LIMITS[kind];
  const previewUrl = useMediaUrl(value);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
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
        .from(MEDIA_BUCKET)
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
    [businessId, kind, limits, onChange],
  );

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{limits.label}</p>
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
          {kind === "hero" ? (
            <img src={previewUrl} alt="Uploaded preview" className="h-44 w-full object-cover" />
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
        className="mt-4 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-accent file:bg-transparent file:px-4 file:py-2 file:text-sm file:text-accent-foreground"
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
