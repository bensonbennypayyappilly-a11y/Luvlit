import { useEffect, useRef, useState } from "react";
import type { TemplateId } from "@/lib/website-templates";

/** §27: each template has its own motion character, not a shared default. Deliberately a
 * separate component from the app-wide `Reveal` (used on the frozen homepage and marketplace
 * pages) rather than a variant of it — those must never change behaviour because of anything
 * done here. */
type MotionPreset = { duration: number; translateY: number; scale?: number; easing: string };

const MOTION_PRESETS: Record<TemplateId, MotionPreset> = {
  // Subtle, restrained — a small lift, nothing showy.
  editorial: { duration: 700, translateY: 14, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  // Confident, structured — quick and direct.
  "modern-business": { duration: 420, translateY: 10, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
  // Cinematic, controlled — slower, with a faint scale-in for a "settling into place" feel.
  catalogue: { duration: 900, translateY: 22, scale: 0.98, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  // Image-led — a gentle zoom-out alongside the rise, like a photo coming into focus.
  experience: { duration: 850, translateY: 12, scale: 1.03, easing: "ease-out" },
  // Expressive — a longer rise with a touch of overshoot, more editorial theatre.
  story: { duration: 750, translateY: 32, easing: "cubic-bezier(0.34, 1.28, 0.64, 1)" },
};

export function TemplateReveal({
  templateId,
  children,
  className = "",
  delay = 0,
}: {
  templateId: TemplateId;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const preset = MOTION_PRESETS[templateId] ?? MOTION_PRESETS.editorial;
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setShown(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (reducedMotion) return <div className={className}>{children}</div>;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${preset.translateY}px)${preset.scale ? ` scale(${preset.scale})` : ""}`,
        transition: `opacity ${preset.duration}ms ${preset.easing}, transform ${preset.duration}ms ${preset.easing}`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
