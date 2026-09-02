import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------- Color math (hex <-> rgb <-> hsv) ----------

type Rgb = { r: number; g: number; b: number };
type Hsv = { h: number; s: number; v: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Accepts #RGB or #RRGGBB, with or without the leading #. Returns null for anything else,
 * rather than throwing — callers keep whatever the user typed on screen either way. */
function hexToRgb(hex: string): Rgb | null {
  const clean = hex.trim().replace(/^#/, "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const to2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s: s * 100, v: max * 100 };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const sn = s / 100;
  const vn = v / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

const POPOVER_WIDTH = 252;
const POPOVER_HEIGHT_ESTIMATE = 372;

/**
 * Compact swatch trigger + floating popover — a hue/saturation picker with hex and RGB inputs,
 * replacing every native `<input type="color">` in the website builder. Rendered via a portal
 * so it can never be clipped by the sidebar's own `overflow-y-auto`, and positioned from the
 * trigger's own bounding box (flipped above when there's no room below).
 */
export function ColorField({
  label,
  value,
  onChange,
  onClear,
  defaultColor = "#ffffff",
  helpText,
}: {
  label: string;
  value: string | null;
  onChange: (hex: string) => void;
  onClear?: () => void;
  defaultColor?: string;
  helpText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const swatch = value ?? defaultColor;

  function openPicker() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      let top = rect.bottom + 8;
      if (top + POPOVER_HEIGHT_ESTIMATE > window.innerHeight - 8) {
        top = Math.max(8, rect.top - POPOVER_HEIGHT_ESTIMATE - 8);
      }
      let left = rect.left;
      if (left + POPOVER_WIDTH > window.innerWidth - 8) left = window.innerWidth - POPOVER_WIDTH - 8;
      setPos({ top, left: Math.max(8, left) });
    }
    setOpen(true);
  }

  return (
    <div>
      <p className="text-[13px] font-medium text-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openPicker())}
          aria-label={`${label}: ${swatch}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex h-9 items-center gap-2 rounded-[10px] border border-[#EAEAEA] bg-white pl-1 pr-3 transition-colors hover:border-accent/50"
        >
          <span className="size-7 shrink-0 rounded-[8px] border border-black/[0.06]" style={{ backgroundColor: swatch }} />
          <span className="font-mono text-xs uppercase text-muted-foreground">{swatch}</span>
        </button>
        {onClear && value && (
          <button type="button" onClick={onClear} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Reset
          </button>
        )}
      </div>
      {helpText && <p className="mt-1.5 text-xs text-muted-foreground">{helpText}</p>}
      {open && pos && (
        <ColorPopover
          anchor={pos}
          value={swatch}
          onChange={onChange}
          onClose={() => setOpen(false)}
          triggerRef={triggerRef}
        />
      )}
    </div>
  );
}

function ColorPopover({
  anchor,
  value,
  onChange,
  onClose,
  triggerRef,
}: {
  anchor: { top: number; left: number };
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const initial = hexToRgb(value) ?? { r: 255, g: 255, b: 255 };
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(initial));
  const [hexDraft, setHexDraft] = useState(value.replace(/^#/, "").toUpperCase());
  const eyedropperSupported = typeof window !== "undefined" && "EyeDropper" in window;

  const rgb = hsvToRgb(hsv);
  const hex = rgbToHex(rgb);

  useEffect(() => setHexDraft(hex.replace(/^#/, "").toUpperCase()), [hex]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onScroll(e: Event) {
      // A scroll anywhere but inside the popover itself (e.g. the sidebar scrolling under it)
      // would leave the popover visually detached from its trigger — closing is simpler and
      // more honest than trying to re-track position through every possible scroll container.
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    // Attaching this on the next frame, not immediately: opening the popover can itself cause
    // a browser focus-scroll (bringing the trigger fully into view inside the sidebar's own
    // scroll container) — without this delay that self-triggered scroll event closes the
    // popover the same tick it opened.
    const raf = requestAnimationFrame(() => {
      window.addEventListener("scroll", onScroll, true);
    });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(next: Hsv) {
    setHsv(next);
    onChange(rgbToHex(hsvToRgb(next)));
  }

  function commitHex(raw: string) {
    setHexDraft(raw.toUpperCase());
    const parsed = hexToRgb(raw);
    if (parsed) commit(rgbToHsv(parsed));
  }

  function commitRgb(next: Rgb) {
    commit(rgbToHsv(next));
  }

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  function dragSv(clientX: number, clientY: number) {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
    commit({ ...hsv, s, v });
  }

  function dragHue(clientX: number) {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 360);
    commit({ ...hsv, h });
  }

  function startDrag(move: (x: number, y: number) => void) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      move(e.clientX, e.clientY);
      function onMove(ev: PointerEvent) {
        move(ev.clientX, ev.clientY);
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  async function pickWithEyedropper() {
    try {
      // @ts-expect-error -- EyeDropper isn't in TS's lib.dom yet; feature-detected above.
      const result = await new window.EyeDropper().open();
      const parsed = hexToRgb(result.sRGBHex);
      if (parsed) commit(rgbToHsv(parsed));
    } catch {
      // User cancelled the pick — nothing to do.
    }
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Colour picker"
      className="builder-pop-in fixed z-[100] w-[252px] overflow-hidden rounded-[14px] border border-[#EAEAEA] bg-white shadow-[0_12px_40px_-12px_rgba(23,42,30,0.28)]"
      style={{ top: anchor.top, left: anchor.left }}
    >
      <div
        ref={svRef}
        onPointerDown={startDrag(dragSv)}
        className="relative h-[150px] w-full cursor-crosshair touch-none"
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
      >
        <span
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
          style={{ left: `${hsv.s}%`, bottom: `${hsv.v}%`, backgroundColor: hex }}
        />
      </div>

      <div className="space-y-3 p-3.5">
        <div
          ref={hueRef}
          onPointerDown={startDrag((x) => dragHue(x))}
          className="relative h-3 w-full cursor-pointer touch-none rounded-full"
          style={{
            background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          }}
        >
          <span
            className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
            style={{ left: `${(hsv.h / 360) * 100}%` }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="size-8 shrink-0 rounded-[8px] border border-black/[0.06]" style={{ backgroundColor: hex }} />
          <div className="flex-1">
            <label className="block text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Hex</label>
            <div className="mt-1 flex items-center rounded-[8px] border border-[#EAEAEA] bg-white px-2.5 focus-within:border-accent">
              <span className="text-xs text-muted-foreground">#</span>
              <input
                value={hexDraft}
                onChange={(e) => commitHex(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (hexToRgb(text)) {
                    e.preventDefault();
                    commitHex(text.replace(/^#/, ""));
                  }
                }}
                spellCheck={false}
                maxLength={6}
                className="w-full bg-transparent py-1.5 pl-1 font-mono text-xs uppercase outline-none"
                aria-label="Hex colour value"
              />
            </div>
          </div>
          {eyedropperSupported && (
            <button
              type="button"
              onClick={pickWithEyedropper}
              title="Pick colour from screen"
              aria-label="Pick colour from screen"
              className="mt-4 flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[#EAEAEA] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m2 22 1-1h3l9-9" />
                <path d="M3 21v-3l9-9" />
                <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3L12 9l3-3z" />
              </svg>
            </button>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">RGB</label>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {(["r", "g", "b"] as const).map((k) => (
              <input
                key={k}
                type="number"
                min={0}
                max={255}
                value={Math.round(rgb[k])}
                onChange={(e) => commitRgb({ ...rgb, [k]: clamp(Number(e.target.value) || 0, 0, 255) })}
                aria-label={k === "r" ? "Red" : k === "g" ? "Green" : "Blue"}
                className="w-full rounded-[8px] border border-[#EAEAEA] bg-white py-1.5 text-center text-xs outline-none focus:border-accent"
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
