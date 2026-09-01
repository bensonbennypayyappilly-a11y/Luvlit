import type { TemplateStyle } from "@/lib/website-templates";

/** Compact banner for every inner page (About/Products/Services/Gallery/Appointments/Contact) —
 * Home gets the full hero section instead; repeating that on every page would feel padded. */
export function PageHeader({ eyebrow, title, style, accent }: { eyebrow: string; title: string; style: TemplateStyle; accent: string }) {
  const dark = style.navStyle === "bar-dark";
  return (
    <section
      className={`px-6 ${style.spacing === "airy" ? "py-16 md:py-20" : "py-10 md:py-14"} ${dark ? "bg-[#14140F] text-white" : ""}`}
      style={!dark ? { background: `linear-gradient(180deg, ${accent}0F, transparent)` } : undefined}
    >
      <div className="mx-auto max-w-6xl">
        {style.showEyebrows && (
          <p className="eyebrow" style={{ color: dark ? undefined : accent }}>
            {eyebrow}
          </p>
        )}
        <h1 className={`mt-3 text-4xl md:text-5xl ${style.headingFont === "serif" ? "font-serif" : ""} ${style.headingClass}`}>{title}</h1>
      </div>
    </section>
  );
}
