import { useState } from "react";
import { EcoBadge } from "@/components/eco-badge";
import { useMediaUrl } from "@/components/media-uploader";
import { FloatingContactButton } from "@/components/website/floating-contact-button";
import { imageFilterClass, ItemImage } from "@/components/website/section-renderer";
import { deriveSitePages, resolvePages, resolveSections, type SitePage } from "@/lib/website-pages";
import type { TemplateStyle } from "@/lib/website-templates";
import type { SiteBusiness } from "@/lib/website-site-types";

type ChromeProps = {
  business: SiteBusiness;
  style: TemplateStyle;
  accent: string;
  /** A `PageId` for the 6 built-in pages, or a custom page's own uuid. */
  currentPage: string;
  pages: SitePage[];
};

type NavProps = ChromeProps & { logoUrl: string | null };

function usePrimaryCta(pages: SitePage[], currentPage: string) {
  const cta = pages.find((p) => p.id === "appointments") ?? pages.find((p) => p.id === "contact");
  return cta && cta.id !== currentPage ? cta : null;
}

function ctaLabel(cta: SitePage) {
  return cta.id === "appointments" ? "Book now" : "Get in touch";
}

function OfficialSiteLink({ business, className }: { business: SiteBusiness; className: string }) {
  if (!business.custom_domain) return null;
  return (
    <a href={business.custom_domain} target="_blank" rel="noreferrer" className={className}>
      Visit Official Site ↗
    </a>
  );
}

function MenuToggle({ dark, open, onClick }: { dark: boolean; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle menu"
      aria-expanded={open}
      className={`flex size-11 items-center justify-center rounded-md lg:hidden ${dark ? "text-white" : "text-foreground"}`}
    >
      <span className="sr-only">Menu</span>
      {open ? "✕" : "☰"}
    </button>
  );
}

/** Shared dropdown-style mobile menu — used by every template except Story, which gets its own
 * full-screen overlay (§16's "full-screen/immersive navigation where appropriate"). */
function DropdownMobileMenu({
  open,
  dark,
  pages,
  currentPage,
  accent,
  onClose,
  business,
}: { open: boolean; dark: boolean; onClose: () => void } & Pick<ChromeProps, "pages" | "currentPage" | "accent" | "business">) {
  if (!open) return null;
  return (
    <nav className={`flex flex-col gap-1 border-t px-6 py-3 lg:hidden ${dark ? "border-white/15" : "border-border"}`}>
      {pages.map((p) => (
        <a
          key={p.id}
          href={p.path}
          onClick={onClose}
          className={`flex min-h-11 items-center rounded-md px-2 text-sm font-medium ${
            currentPage === p.id ? (dark ? "text-white" : "text-accent") : dark ? "text-white/70" : "text-muted-foreground"
          }`}
          style={currentPage === p.id && !dark ? { color: accent } : undefined}
        >
          {p.label}
        </a>
      ))}
      <OfficialSiteLink business={business} className={`flex min-h-11 items-center rounded-md px-2 text-sm font-medium ${dark ? "text-white/70" : "text-muted-foreground"}`} />
    </nav>
  );
}

// ---------- Editorial (Celesse) — dark, elegant, thin uppercase tracking, restrained ----------

function EditorialNav({ business, style, accent, currentPage, pages, logoUrl }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cta = usePrimaryCta(pages, currentPage);
  return (
    <header className="sticky top-0 z-40 bg-[#14140F] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
        <a href="/" className="site-heading-font flex items-center gap-2.5">
          {logoUrl && <img src={logoUrl} alt={business.name} className="h-7 w-7 rounded-sm object-contain" />}
          <span className="text-lg font-medium tracking-tight">{business.name}</span>
        </a>
        <nav className="hidden items-center gap-8 lg:flex">
          {pages.map((p) => (
            <a
              key={p.id}
              href={p.path}
              className={`text-[11px] uppercase tracking-[0.18em] transition-colors ${currentPage === p.id ? "text-white" : "text-white/55 hover:text-white"}`}
            >
              {p.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-5 lg:flex">
          <OfficialSiteLink business={business} className="text-[11px] uppercase tracking-[0.14em] text-white/55 hover:text-white" />
          {cta && (
            <>
              <span className="h-4 w-px bg-white/20" aria-hidden="true" />
              <a href={cta.path} className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
                {ctaLabel(cta)}
              </a>
            </>
          )}
        </div>
        <MenuToggle dark open={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
      </div>
      <DropdownMobileMenu open={menuOpen} dark pages={pages} currentPage={currentPage} accent={accent} business={business} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

function EditorialFooter({ business, style, accent, pages }: ChromeProps) {
  const primary = business.locations.find((l) => l.is_primary) ?? business.locations[0];
  return (
    <footer className="bg-[#14140F] py-16 text-center text-white">
      <p className={`site-heading-font text-2xl ${style.headingClass}`}>{business.name}</p>
      {business.is_eco_friendly && (
        <div className="mt-3 flex justify-center">
          <EcoBadge />
        </div>
      )}
      <nav className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {pages.map((p) => (
          <a key={p.id} href={p.path} className="text-[11px] uppercase tracking-[0.16em] text-white/60 hover:text-white">
            {p.label}
          </a>
        ))}
      </nav>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/70">
        {primary && <span>{[primary.city, primary.state].filter(Boolean).join(", ")}</span>}
        {business.whatsapp && (
          <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} style={{ color: accent }}>
            WhatsApp
          </a>
        )}
        {business.contact_email && <a href={`mailto:${business.contact_email}`}>{business.contact_email}</a>}
        {business.instagram_url && <a href={business.instagram_url}>Instagram</a>}
      </div>
      <a href="https://luvlit.in" className="mt-10 block text-[10px] uppercase tracking-[0.2em] text-white/35">
        Hosted on LuvLit
      </a>
    </footer>
  );
}

// ---------- Modern (Agencieos) — structured, confident, bold CTA ----------

function ModernNav({ business, style, accent, currentPage, pages, logoUrl }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cta = usePrimaryCta(pages, currentPage);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="h-[3px] w-full" style={{ backgroundColor: accent }} aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <a href="/" className="flex items-center gap-2.5">
          {logoUrl && <img src={logoUrl} alt={business.name} className="h-8 w-8 rounded-sm object-contain" />}
          <span className="text-lg font-bold tracking-tight">{business.name}</span>
        </a>
        <nav className="hidden items-center gap-1 lg:flex">
          {pages.map((p) => (
            <a
              key={p.id}
              href={p.path}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                currentPage === p.id ? "text-white" : "text-muted-foreground hover:text-foreground"
              }`}
              style={currentPage === p.id ? { backgroundColor: accent } : undefined}
            >
              {p.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <OfficialSiteLink business={business} className="text-sm font-medium text-muted-foreground hover:text-foreground" />
          {cta && (
            <a href={cta.path} className="rounded-md px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-[1.03]" style={{ backgroundColor: accent }}>
              {ctaLabel(cta)}
            </a>
          )}
        </div>
        <MenuToggle dark={false} open={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
      </div>
      <DropdownMobileMenu open={menuOpen} dark={false} pages={pages} currentPage={currentPage} accent={accent} business={business} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

function ModernFooter({ business, style, accent, pages }: ChromeProps) {
  const primary = business.locations.find((l) => l.is_primary) ?? business.locations[0];
  return (
    <footer className="border-t-4" style={{ borderColor: accent }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <p className="text-lg font-bold tracking-tight">{business.name}</p>
          {business.description && <p className="mt-3 max-w-sm text-sm text-muted-foreground">{business.description}</p>}
          {business.is_eco_friendly && (
            <div className="mt-3">
              <EcoBadge />
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Pages</p>
          <ul className="mt-3 space-y-2">
            {pages.map((p) => (
              <li key={p.id}>
                <a href={p.path} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {p.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {primary && <li>{[primary.city, primary.state].filter(Boolean).join(", ")}</li>}
            {business.whatsapp && (
              <li>
                <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} className="transition-colors hover:text-foreground" style={{ color: accent }}>
                  WhatsApp
                </a>
              </li>
            )}
            {business.contact_email && (
              <li>
                <a href={`mailto:${business.contact_email}`} className="transition-colors hover:text-foreground">
                  {business.contact_email}
                </a>
              </li>
            )}
            {business.instagram_url && (
              <li>
                <a href={business.instagram_url} className="transition-colors hover:text-foreground">
                  Instagram
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-6 py-5 text-center text-xs uppercase tracking-[0.14em] text-muted-foreground">Hosted on LuvLit</div>
    </footer>
  );
}

// ---------- Catalogue (Essentia) — two-tier storefront header, shop-first footer ----------

function CatalogueNav({ business, style, accent, currentPage, pages, logoUrl }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cta = usePrimaryCta(pages, currentPage);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <div className="w-11 lg:hidden">
          <MenuToggle dark={false} open={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
        </div>
        <a href="/" className="mx-auto flex items-center gap-2 lg:mx-0">
          {logoUrl && <img src={logoUrl} alt={business.name} className="h-8 w-8 rounded-sm object-contain" />}
          <span className="site-heading-font text-lg font-semibold tracking-tight">{business.name}</span>
        </a>
        <div className="hidden w-11 items-center justify-end gap-3 lg:flex lg:w-auto">
          <OfficialSiteLink business={business} className="text-sm font-medium text-muted-foreground hover:text-foreground" />
          {cta && (
            <a href={cta.path} className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]" style={{ backgroundColor: accent }}>
              {ctaLabel(cta)}
            </a>
          )}
        </div>
      </div>
      <div className="hidden border-t border-border/60 lg:block">
        <nav className="mx-auto flex max-w-6xl items-center justify-center gap-8 px-6 py-2.5">
          {pages.map((p) => (
            <a
              key={p.id}
              href={p.path}
              className={`text-sm font-medium transition-colors ${currentPage === p.id ? "" : "text-muted-foreground hover:text-foreground"}`}
              style={currentPage === p.id ? { color: accent } : undefined}
            >
              {p.label}
            </a>
          ))}
        </nav>
      </div>
      <DropdownMobileMenu open={menuOpen} dark={false} pages={pages} currentPage={currentPage} accent={accent} business={business} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

function CatalogueFooter({ business, style, accent, pages }: ChromeProps) {
  const panIndia = business.delivery_areas.some((d) => d.is_pan_india);
  const cities = business.delivery_areas.map((d) => d.city).filter((c): c is string => !!c);
  return (
    <footer className="bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-border pb-8">
          <p className="site-heading-font text-xl font-semibold tracking-tight">{business.name}</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {pages.map((p) => (
              <a key={p.id} href={p.path} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {p.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {business.whatsapp && (
              <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} style={{ color: accent }}>
                WhatsApp
              </a>
            )}
            {business.contact_email && <a href={`mailto:${business.contact_email}`}>{business.contact_email}</a>}
            {business.instagram_url && <a href={business.instagram_url}>Instagram</a>}
          </div>
          {(panIndia || cities.length > 0) && <span>{panIndia ? "Delivers across India" : `Delivers to ${cities.join(", ")}`}</span>}
        </div>
      </div>
      <div className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">Hosted on LuvLit</div>
    </footer>
  );
}

// ---------- Experience (Cullen) — airy, centered, image-led ----------

function ExperienceNav({ business, style, accent, currentPage, pages, logoUrl }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cta = usePrimaryCta(pages, currentPage);
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-6">
        <div className="flex w-full items-center justify-between lg:justify-center">
          <a href="/" className="flex items-center gap-2.5">
            {logoUrl && <img src={logoUrl} alt={business.name} className="h-8 w-8 rounded-sm object-contain" />}
            <span className="site-heading-font text-xl font-normal">{business.name}</span>
          </a>
          <MenuToggle dark={false} open={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
        </div>
        <nav className="hidden items-center gap-7 lg:flex">
          {pages.map((p) => (
            <a
              key={p.id}
              href={p.path}
              className={`text-xs uppercase tracking-[0.16em] transition-colors ${currentPage === p.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p.label}
            </a>
          ))}
          {cta && (
            <a href={cta.path} className="ml-2 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.14em]" style={{ borderColor: accent, color: accent }}>
              {cta.id === "appointments" ? "Book" : "Contact"}
            </a>
          )}
        </nav>
      </div>
      <DropdownMobileMenu open={menuOpen} dark={false} pages={pages} currentPage={currentPage} accent={accent} business={business} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

function ExperienceFooter({ business, style, accent, pages }: ChromeProps) {
  const thumbs = business.gallery_urls.slice(0, 4);
  return (
    <footer>
      {thumbs.length > 0 && (
        <div className="grid grid-cols-4 gap-1">
          {thumbs.map((g, i) => (
            <ItemImage key={i} path={g} alt="" className={`aspect-square w-full object-cover ${imageFilterClass(business.image_treatment)}`} />
          ))}
        </div>
      )}
      <div className="mx-auto max-w-5xl px-6 py-14 text-center">
        <p className="site-heading-font text-xl font-normal">{business.name}</p>
        <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {pages.map((p) => (
            <a key={p.id} href={p.path} className="text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
              {p.label}
            </a>
          ))}
        </nav>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {business.whatsapp && (
            <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} style={{ color: accent }}>
              WhatsApp
            </a>
          )}
          {business.contact_email && <a href={`mailto:${business.contact_email}`}>{business.contact_email}</a>}
          {business.instagram_url && <a href={business.instagram_url}>Instagram</a>}
        </div>
        <a href="https://luvlit.in" className="mt-8 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Hosted on LuvLit
        </a>
      </div>
    </footer>
  );
}

// ---------- Story (Aperture) — minimal bar + full-screen immersive menu ----------

function StoryNav({ business, style, accent, currentPage, pages }: NavProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" className="site-heading-font text-base font-light tracking-tight">
            {business.name}
          </a>
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="flex items-center gap-2.5 text-xs uppercase tracking-[0.2em]">
            Menu
            <span className="inline-block h-px w-6 bg-foreground" aria-hidden="true" />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
            <a href="/" className="site-heading-font text-base font-light tracking-tight" onClick={() => setOpen(false)}>
              {business.name}
            </a>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="text-xs uppercase tracking-[0.2em]">
              Close ✕
            </button>
          </div>
          <nav className="flex flex-1 flex-col items-center justify-center gap-7">
            {pages.map((p) => (
              <a
                key={p.id}
                href={p.path}
                onClick={() => setOpen(false)}
                className={`site-heading-font text-4xl font-light tracking-tight transition-colors sm:text-6xl ${
                  currentPage === p.id ? "" : "text-muted-foreground hover:text-foreground"
                }`}
                style={currentPage === p.id ? { color: accent } : undefined}
              >
                {p.label}
              </a>
            ))}
          </nav>
          <OfficialSiteLink business={business} className="mx-auto mb-10 block text-xs uppercase tracking-[0.16em] text-muted-foreground" />
        </div>
      )}
    </>
  );
}

function StoryFooter({ business, style, accent, pages }: ChromeProps) {
  const contact = pages.find((p) => p.id === "contact");
  return (
    <footer className="bg-[#0A0A0A] py-20 text-center text-white">
      <p className="site-heading-font text-3xl font-light sm:text-5xl">Let's talk</p>
      {contact && (
        <a href={contact.path} className="mt-6 inline-block border-b pb-1 text-xs uppercase tracking-[0.2em]" style={{ borderColor: accent, color: accent }}>
          Get in touch
        </a>
      )}
      <nav className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {pages.map((p) => (
          <a key={p.id} href={p.path} className="text-xs uppercase tracking-[0.16em] text-white/50 hover:text-white">
            {p.label}
          </a>
        ))}
      </nav>
      <a href="https://luvlit.in" className="mt-10 block text-[10px] uppercase tracking-[0.18em] text-white/30">
        Hosted on LuvLit
      </a>
    </footer>
  );
}

// ---------- Dispatch ----------

function TemplateNav(props: NavProps) {
  switch (props.style.id) {
    case "editorial":
      return <EditorialNav {...props} />;
    case "modern-business":
      return <ModernNav {...props} />;
    case "catalogue":
      return <CatalogueNav {...props} />;
    case "experience":
      return <ExperienceNav {...props} />;
    case "story":
      return <StoryNav {...props} />;
  }
}

function TemplateFooter(props: ChromeProps) {
  switch (props.style.id) {
    case "editorial":
      return <EditorialFooter {...props} />;
    case "modern-business":
      return <ModernFooter {...props} />;
    case "catalogue":
      return <CatalogueFooter {...props} />;
    case "experience":
      return <ExperienceFooter {...props} />;
    case "story":
      return <StoryFooter {...props} />;
  }
}

/** Nav + footer chrome shared by every page of a business's public site — dispatches to a
 * genuinely distinct component tree per template (§16/§17: no universal fixed navbar/footer),
 * built from the same `deriveSitePages`/`resolvePages` every page route uses, so the nav can
 * never disagree with what pages actually exist. */
export function SiteChrome({
  business,
  style,
  accent,
  currentPage,
  children,
  preview = false,
}: {
  business: SiteBusiness;
  style: TemplateStyle;
  accent: string;
  /** A `PageId` for the 6 built-in pages, or a custom page's own uuid. */
  currentPage: string;
  children: React.ReactNode;
  /** True only inside the builder's live preview pane, whose mockup box doesn't establish a
   * containing block for `position: fixed` — the floating button would otherwise escape it and
   * overlay the builder's own UI instead of staying inside the preview. */
  preview?: boolean;
}) {
  const logoUrl = useMediaUrl(business.logo_url);
  const pages = deriveSitePages({ ...business, sections: resolveSections(business) }, resolvePages(business));

  // Sets the template's body typeface for this whole page (everything inherits it unless it
  // sets its own font) and exposes the heading typeface as a CSS var for `.site-heading-font`
  // to read — see the matching comment on that utility in styles.css.
  const rootStyle = {
    fontFamily: style.bodyFontFamily,
    "--site-heading-font": style.headingFontFamily,
    ...(business.background_color ? { backgroundColor: business.background_color } : {}),
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background" style={rootStyle}>
      <TemplateNav business={business} style={style} accent={accent} currentPage={currentPage} pages={pages} logoUrl={logoUrl} />
      {children}
      <TemplateFooter business={business} style={style} accent={accent} pages={pages} currentPage={currentPage} />
      {!preview && <FloatingContactButton business={business} accent={accent} />}
    </div>
  );
}
