import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isStoragePath, MEDIA_BUCKET } from "@/components/media-uploader";

/** Shared video/media helpers for the site renderer — extracted from the original fixed-field
 * profile preview so both the home page and every other site page/section reuse one copy. */

export function embedUrl(url: string) {
  if (url.includes("youtu")) {
    const id = url.split(/v=|youtu\.be\/|shorts\//)[1]?.split(/[?&]/)[0];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (url.includes("instagram.com")) return `${url.split("?")[0].replace(/\/$/, "")}/embed`;
  return url;
}

/** Uploaded videos are stored as private object paths and resolved to signed https URLs
 * server-side (or client-side in the draft preview), so anything not http(s) is unresolved. */
export function isPlayableVideo(url: string) {
  return /^https?:\/\//i.test(url) && !isStoragePath(url);
}

export function VideoPlayer({ url, className }: { url: string; className?: string }) {
  const isEmbed = url.includes("youtu") || url.includes("instagram.com");
  if (isEmbed) {
    return <iframe src={embedUrl(url)} title="Video" className={className} allowFullScreen />;
  }
  return <video src={url} controls playsInline preload="metadata" className={`${className} bg-black`} />;
}

/** Resolves a possibly-unsaved storage path or an already-signed URL to a displayable list. */
export function useResolvedList(values: string[]) {
  const key = values.join("|");
  const [urls, setUrls] = useState<string[]>(values.filter((v) => !isStoragePath(v)));
  useEffect(() => {
    let active = true;
    if (!values.length) return setUrls([]);
    Promise.all(
      values.map(async (v) => {
        if (!isStoragePath(v)) return v;
        const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(v, 60 * 60 * 24 * 7);
        if (error) console.error(error.message);
        return data?.signedUrl ?? v;
      }),
    ).then((resolved) => {
      if (active) setUrls(resolved);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

export function SectionEyebrow({ children, accent, show = true }: { children: React.ReactNode; accent: string; show?: boolean }) {
  if (!show) return null;
  return (
    <p className="eyebrow" style={{ color: accent }}>
      {children}
    </p>
  );
}
