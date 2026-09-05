import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

/** Draws exactly the selected crop rectangle onto a same-size canvas and re-encodes it — the
 * standard react-easy-crop recipe. Runs before the existing compressImage()/size-limit pipeline
 * in media-uploader.tsx, so a crop never bypasses those checks; it just changes what pixels are
 * in the file they see. */
async function cropToFile(imageSrc: string, area: Area, fileName: string, mimeType: string): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cropping isn't supported in this browser.");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
  if (!blob) throw new Error("Couldn't process that image — try a different file.");
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Instagram-style "position your photo" step shown before any image upload actually reaches the
 * server: pan by dragging, zoom with the slider, inside a frame fixed to that upload's real
 * on-site shape (see CROP_ASPECT in media-uploader.tsx) — so what an owner frames here is what
 * shows up, never a surprise auto-crop later. Cancelling drops the file; nothing is uploaded
 * until "Use this photo".
 */
export function ImageCropDialog({
  file,
  aspect,
  title = "Position your photo",
  onCancel,
  onCropped,
}: {
  file: File;
  aspect: number;
  title?: string;
  onCancel: () => void;
  onCropped: (file: File) => void;
}) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);

  function close(after: () => void) {
    URL.revokeObjectURL(imageSrc);
    after();
  }

  async function confirm() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    setError(null);
    try {
      const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const cropped = await cropToFile(imageSrc, croppedAreaPixels, file.name, mimeType);
      close(() => onCropped(cropped));
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Couldn't crop that image.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && !busy && close(onCancel)}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium">{title}</p>
        <div className="relative mt-3 h-72 w-full overflow-hidden rounded-md bg-secondary">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 flex-1 accent-accent"
            aria-label="Zoom"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Drag the photo to reposition it, and use the slider to zoom.</p>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => close(onCancel)}
            disabled={busy}
            className="rounded-md border border-border px-5 py-2.5 text-sm transition-colors hover:border-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !croppedAreaPixels}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {busy ? "Saving…" : "Use this photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
