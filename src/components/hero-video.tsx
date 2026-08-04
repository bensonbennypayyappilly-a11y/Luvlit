import { useEffect, useRef, useState } from "react";
import heroVideo from "@/assets/luvlit-hero.mp4.asset.json";

/** Slower-than-life playback keeps the footage cinematic rather than frantic. */
const AMBIENT_RATE = 0.5;
const FEATURE_RATE = 0.6;

function useSlowPlayback(rate: number) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      el.playbackRate = rate;
    };
    apply();
    el.addEventListener("loadedmetadata", apply);
    el.addEventListener("play", apply);
    return () => {
      el.removeEventListener("loadedmetadata", apply);
      el.removeEventListener("play", apply);
    };
  }, [rate]);
  return ref;
}

/** Muted ambient backdrop for the homepage hero. */
export function AmbientHeroVideo({ className = "" }: { className?: string }) {
  const ref = useSlowPlayback(AMBIENT_RATE);
  return (
    <video
      ref={ref}
      src={heroVideo.url}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      className={className}
    />
  );
}

/** Fullscreen, sound-on presentation of the same film. */
export function HeroVideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useSlowPlayback(FEATURE_RATE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && ref.current) void ref.current.play().catch(() => undefined);
  }, [open, ref]);

  if (!open && !mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="LuvLit film"
      onClick={onClose}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-foreground/95 backdrop-blur-sm transition-opacity duration-500 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-6 top-6 z-10 rounded-full border border-background/30 px-4 py-2 text-xs uppercase tracking-[0.18em] text-background transition-colors hover:border-background"
      >
        Close
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[min(96vw,1600px)] px-4 transition-transform duration-500 ${
          open ? "scale-100" : "scale-95"
        }`}
      >
        <video
          ref={ref}
          src={heroVideo.url}
          controls
          autoPlay
          loop
          playsInline
          className="h-auto max-h-[86vh] w-full rounded-lg bg-black object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}
