import { useState } from "react";
import { EcoBadge } from "@/components/eco-badge";
import { useMediaUrl } from "@/components/media-uploader";
import { FloatingContactButton } from "@/components/website/floating-contact-button";
import { deriveSitePages, resolveSections, type PageId } from "@/lib/website-pages";
import type { TemplateStyle } from "@/lib/website-templates";
import type { SiteBusiness } from "@/lib/website-site-types";

const NAV_SHELL: Record<TemplateStyle["navStyle"], string> = {
  "bar-solid": "sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur",
  "bar-dark": "sticky top-0 z-40 bg-[#14140F] text-white",
  "minimal-underline": "sticky top-0 z-40 bg-background/95 backdrop-blur",
};

function NavLink({ href, active, dark, minimal, children }: { href: string; active: boolean; dark: boolean; minimal: boolean; children: React.ReactNode }) {
  if (minimal) {
    return (
      <a
        href={href}
        className={`relative pb-1 text-[13px] uppercase tracking-[0.14em] transition-colors ${
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        } after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform hover:after:scale-x-100 ${
          active ? "after:scale-x-100" : ""
        }`}
      >
        {children}
      </a>
    );
  }
  return (
    <a
      href={href}
      className={`text-sm font-medium transition-colors ${
        dark
          ? active
            ? "text-white"
            : "text-white/65 hover:text-white"
          : active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </a>
  );
}

/** Nav + footer chrome shared by every page of a business's public site — the same component
 * renders Home, About, Products, Services, Gallery, Appointments and Contact, so the nav can
 * never disagree with what pages actually exist (it's built from the same `deriveSitePages`
 * every page route uses to decide whether it should render at all). */
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
  currentPage: PageId;
  children: React.ReactNode;
  /** True only inside the builder's live preview pane, whose mockup box doesn't establish a
   * containing block for `position: fixed` — the floating button would otherwise escape it and
   * overlay the builder's own UI instead of staying inside the preview. */
  preview?: boolean;
}) {
  const logoUrl = useMediaUrl(business.logo_url);
  const [menuOpen, setMenuOpen] = useState(false);
  const pages = deriveSitePages({ ...business, sections: resolveSections(business) });
  const dark = style.navStyle === "bar-dark";
  const minimal = style.navStyle === "minimal-underline";
  const primaryCta = pages.find((p) => p.id === "appointments") ?? pages.find((p) => p.id === "contact");

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
      <header className={NAV_SHELL[style.navStyle]}>
        <div className={`mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 ${minimal ? "py-6" : "py-4"}`}>
          <a href="/" className="site-heading-font flex items-center gap-2.5">
            {logoUrl && <img src={logoUrl} alt={business.name} className="h-8 w-8 rounded-sm object-contain" />}
            <span className={`text-lg ${style.headingClass} ${dark ? "text-white" : "text-foreground"}`}>{business.name}</span>
          </a>

          {/* Breaks at lg, not md: a business with all seven pages plus a CTA overflows a
              768px tablet, so tablets keep the drawer. */}
          <nav className="hidden items-center gap-6 lg:flex">
            {pages.map((p) => (
              <NavLink key={p.id} href={p.path} active={currentPage === p.id} dark={dark} minimal={minimal}>
                {p.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {business.custom_domain && (
              <a
                href={business.custom_domain}
                target="_blank"
                rel="noreferrer"
                className={`text-sm font-medium transition-colors ${
                  dark ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Visit Official Site ↗
              </a>
            )}
            {primaryCta && primaryCta.id !== currentPage && (
              <a
                href={primaryCta.path}
                className={`px-4 py-2 text-sm font-medium transition-transform hover:scale-[1.03] ${
                  style.corners === "sharp" ? "rounded-none" : "rounded-md"
                }`}
                style={{ backgroundColor: accent, color: "#fff" }}
              >
                {primaryCta.id === "appointments" ? "Book now" : "Get in touch"}
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className={`flex size-11 items-center justify-center rounded-md lg:hidden ${dark ? "text-white" : "text-foreground"}`}
          >
            <span className="sr-only">Menu</span>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <nav className={`flex flex-col gap-1 border-t px-6 py-3 lg:hidden ${dark ? "border-white/15" : "border-border"}`}>
            {pages.map((p) => (
              <a
                key={p.id}
                href={p.path}
                onClick={() => setMenuOpen(false)}
                className={`flex min-h-11 items-center rounded-md px-2 text-sm font-medium ${
                  currentPage === p.id
                    ? dark
                      ? "text-white"
                      : "text-accent"
                    : dark
                      ? "text-white/70"
                      : "text-muted-foreground"
                }`}
                style={currentPage === p.id && !dark ? { color: accent } : undefined}
              >
                {p.label}
              </a>
            ))}
            {business.custom_domain && (
              <a
                href={business.custom_domain}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuOpen(false)}
                className={`flex min-h-11 items-center rounded-md px-2 text-sm font-medium ${
                  dark ? "text-white/70" : "text-muted-foreground"
                }`}
              >
                Visit Official Site ↗
              </a>
            )}
          </nav>
        )}
      </header>

      {children}

      <SiteFooterChrome business={business} style={style} accent={accent} pages={pages} />
      {!preview && <FloatingContactButton business={business} accent={accent} />}
    </div>
  );
}

function SiteFooterChrome({
  business,
  style,
  accent,
  pages,
}: {
  business: SiteBusiness;
  style: TemplateStyle;
  accent: string;
  pages: ReturnType<typeof deriveSitePages>;
}) {
  const primary = business.locations.find((l) => l.is_primary) ?? business.locations[0];
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-3">
        <div>
          <p className={`site-heading-font text-lg ${style.headingClass}`}>{business.name}</p>
          {business.is_eco_friendly && (
            <div className="mt-2">
              <EcoBadge />
            </div>
          )}
          {business.description && <p className="mt-3 max-w-xs text-sm text-muted-foreground">{business.description}</p>}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Pages</p>
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
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Get in touch</p>
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
      <div className="border-t border-border px-6 py-6 text-center">
        <a href="https://luvlit.in" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Hosted on LuvLit
        </a>
      </div>
    </footer>
  );
}
