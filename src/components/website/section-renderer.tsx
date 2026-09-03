import { createContext, useContext, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Search } from "lucide-react";
import { EcoBadge } from "@/components/eco-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { BookingWidget } from "@/components/booking-widget";
import { GalleryGrid } from "@/components/gallery-grid";
import { Reveal } from "@/components/reveal";
import { useMediaUrl } from "@/components/media-uploader";
import { SectionEyebrow, VideoPlayer, isPlayableVideo, useResolvedList } from "@/components/website/media";
import { templateStyle, type TemplateStyle } from "@/lib/website-templates";
import type { SiteBusiness } from "@/lib/website-site-types";
import type { PageId } from "@/lib/website-pages";
import type {
  AboutContent,
  AtmosphericCtaContent,
  BenefitsStripContent,
  CapabilityGridContent,
  CollectionSpotlightContent,
  CustomTextContent,
  EditorialSpreadContent,
  FaqContent,
  FeaturedProductsContent,
  FeaturedWorkContent,
  HeroContent,
  ProcessTimelineContent,
  ProductStoryContent,
  PromoBannerContent,
  QuoteContent,
  Section,
  SectionType,
  StoryCollageContent,
} from "@/lib/website-sections";
import { SECTION_LIBRARY, SIGNATURE_TEMPLATE } from "@/lib/website-sections";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** `style.corners` is the template's own default; a business's own Design-panel override
 * (`corner_style`) always wins once set — see §18/the Design panel. */
export function corners(style: TemplateStyle, size: "sm" | "lg" = "lg", override?: string | null) {
  const mode = override ?? style.corners;
  if (mode === "sharp") return "rounded-none";
  return size === "sm" ? "rounded-md" : "rounded-xl";
}

export function pad(style: TemplateStyle, override?: string | null) {
  const mode = override ?? style.spacing;
  return mode === "airy" ? "py-20 md:py-28" : "py-12 md:py-16";
}

export function heading(style: TemplateStyle, className = "") {
  return `site-heading-font ${style.headingClass} ${className}`;
}

export function cardClass(style: TemplateStyle, override?: string | null) {
  switch (style.cardStyle) {
    case "shadow":
      return `border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-lg ${corners(style, "lg", override)}`;
    case "flat-divide":
      return "border-t border-border pt-6";
    case "editorial-frame":
      return `border border-border p-2 transition-colors hover:border-foreground/40 ${corners(style, "lg", override)}`;
    default:
      return `border border-border bg-card ${corners(style, "lg", override)}`;
  }
}

export function ctaClass(style: TemplateStyle, override?: string | null) {
  return `inline-flex items-center gap-2 px-6 py-3 text-sm font-medium transition-transform hover:scale-[1.02] ${corners(style, "sm", override)}`;
}

/** One section-type -> visual-block map, template-aware via spacing/corners/cardStyle/typography.
 * Used by every page (home + about/products/services/gallery/appointments/contact) so a section
 * always looks the same wherever it appears. `sections` should already be filtered to the types
 * relevant for the current page and to `visible: true` — callers do that via website-pages.ts. */
export function SectionRenderer({
  business,
  sections,
  style,
  accent,
  page,
}: {
  business: SiteBusiness;
  sections: Section[];
  style: TemplateStyle;
  accent: string;
  page: PageId;
}) {
  return (
    <>
      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} business={business} style={style} accent={accent} page={page} />
      ))}
    </>
  );
}

function SectionBlock({
  section,
  business,
  style,
  accent,
  page,
}: {
  section: Section;
  business: SiteBusiness;
  style: TemplateStyle;
  accent: string;
  page: PageId;
}) {
  const backgroundColor = typeof section.content?.backgroundColor === "string" ? section.content.backgroundColor : undefined;
  const color = typeof section.content?.textColor === "string" ? section.content.textColor : undefined;
  const rendered = renderSectionBlock({ section, business, style, accent, page });
  if (!rendered || (!backgroundColor && !color)) return rendered;
  // Headings and plain body text inherit `color` from here; text using its own explicit colour
  // utility (text-muted-foreground and similar) intentionally keeps its own shade — see the
  // matching note in section-list-editor.tsx's editor for this.
  return <div style={{ backgroundColor, color }}>{rendered}</div>;
}

function renderSectionBlock({
  section,
  business,
  style,
  accent,
  page,
}: {
  section: Section;
  business: SiteBusiness;
  style: TemplateStyle;
  accent: string;
  page: PageId;
}) {
  // A signature section only belongs to the template it was designed for (§19) — after a
  // template switch it's never deleted, but it renders nothing on a template that doesn't own
  // it. `UnsupportedSignatureNote` surfaces that to the owner in preview only; the public site
  // just shows nothing, exactly like any other empty section.
  const signatureTemplate = SIGNATURE_TEMPLATE[section.type];
  if (signatureTemplate && signatureTemplate !== style.id) {
    return <UnsupportedSignatureNote type={section.type} templateLabel={templateStyle(signatureTemplate).label} />;
  }
  switch (section.type) {
    case "hero":
      return <HeroBlock business={business} style={style} accent={accent} content={section.content as HeroContent} />;
    case "about":
      return <AboutBlock business={business} style={style} accent={accent} content={section.content as AboutContent} />;
    case "services":
      return <ServicesBlock business={business} style={style} accent={accent} />;
    case "products":
      return <ProductsBlock business={business} style={style} accent={accent} page={page} />;
    case "gallery":
      return <GalleryBlock business={business} style={style} accent={accent} />;
    case "contact":
      return <ContactBlock business={business} style={style} accent={accent} />;
    case "location":
      return <LocationBlock business={business} style={style} accent={accent} />;
    case "quote":
      return <QuoteBlock business={business} style={style} accent={accent} content={section.content as QuoteContent} />;
    case "reviews":
      return <ReviewsBlock business={business} style={style} accent={accent} />;
    case "faq":
      return <FaqBlock style={style} accent={accent} content={section.content as FaqContent} />;
    case "team":
      return <TeamBlock business={business} style={style} accent={accent} />;
    case "hours":
      return <HoursBlock business={business} style={style} accent={accent} />;
    case "delivery-areas":
      return <DeliveryBlock business={business} style={style} accent={accent} />;
    case "video":
      return <VideoBlock business={business} style={style} accent={accent} />;
    case "social":
      return <SocialBlock business={business} style={style} accent={accent} />;
    case "featured-products":
      return <FeaturedProductsBlock business={business} style={style} accent={accent} content={section.content as FeaturedProductsContent} />;
    case "booking":
      return business.business_types.includes("appointment") ? <BookingBlock business={business} style={style} accent={accent} /> : null;
    case "promo-banner":
      return <PromoBannerBlock style={style} accent={accent} content={section.content as PromoBannerContent} />;
    case "custom-text":
      return <CustomTextBlock style={style} content={section.content as CustomTextContent} />;
    case "editorial-spread":
      return <EditorialSpreadBlock business={business} style={style} accent={accent} content={section.content as EditorialSpreadContent} />;
    case "collection-spotlight":
      return <CollectionSpotlightBlock business={business} style={style} accent={accent} content={section.content as CollectionSpotlightContent} />;
    case "process-timeline":
      return <ProcessTimelineBlock style={style} accent={accent} content={section.content as ProcessTimelineContent} />;
    case "capability-grid":
      return <CapabilityGridBlock style={style} accent={accent} content={section.content as CapabilityGridContent} />;
    case "product-story":
      return <ProductStoryBlock business={business} style={style} accent={accent} content={section.content as ProductStoryContent} />;
    case "benefits-strip":
      return <BenefitsStripBlock style={style} accent={accent} content={section.content as BenefitsStripContent} />;
    case "visual-strip":
      return <VisualStripBlock business={business} style={style} />;
    case "featured-work":
      return <FeaturedWorkBlock business={business} style={style} content={section.content as FeaturedWorkContent} />;
    case "story-collage":
      return <StoryCollageBlock business={business} style={style} content={section.content as StoryCollageContent} />;
    case "atmospheric-cta":
      return <AtmosphericCtaBlock business={business} style={style} accent={accent} content={section.content as AtmosphericCtaContent} />;
    default:
      return null;
  }
}

const TYPES_WITH_NO_CONTENT_TO_HIDE: SectionType[] = ["contact", "quote"];

/**
 * True only inside the dashboard's preview pane. On the real published site an empty section
 * renders nothing at all; in the builder that would look like the section silently vanished, so
 * preview mode swaps in a placeholder telling the owner what to add and where. Context rather
 * than a prop because every one of the ~19 section blocks would otherwise have to forward it.
 */
const PreviewContext = createContext(false);

export function PreviewMode({ children }: { children: React.ReactNode }) {
  return <PreviewContext.Provider value={true}>{children}</PreviewContext.Provider>;
}

/** What the owner should do to fill each section, shown only in the builder preview. */
const EMPTY_HINTS: Partial<Record<SectionType, { title: string; body: string }>> = {
  about: { title: "About", body: "Add your story in “About Your Business” to fill this section." },
  services: { title: "Services", body: "Add your first service in the Services page — price, duration and a photo." },
  products: { title: "Products", body: "Add your first product in the Products page." },
  "featured-products": { title: "Featured", body: "Pick which products to spotlight in this section's Edit panel." },
  gallery: { title: "Gallery", body: "Upload photos in the Gallery panel to show your work here." },
  video: { title: "Video", body: "Upload short clips in Short Videos to fill this section." },
  reviews: { title: "Reviews", body: "Customer reviews appear here automatically once you have some." },
  faq: { title: "FAQ", body: "Add questions and answers in this section's Edit panel." },
  team: { title: "Team", body: "Add team members in Staff & Availability." },
  hours: { title: "Opening hours", body: "Set your opening hours in Website Settings." },
  location: { title: "Locations", body: "Add an address in Website Settings → Locations." },
  "delivery-areas": { title: "Delivery areas", body: "Add the cities you deliver to in Website Settings." },
  social: { title: "Social links", body: "Add your Instagram link in Website Settings." },
  "promo-banner": { title: "Promo banner", body: "Add banner text in this section's Edit panel." },
  "custom-text": { title: "Custom text", body: "Add your text in this section's Edit panel." },
  "editorial-spread": { title: "Editorial spread", body: "Add an About photo and write a short story in this section's Edit panel." },
  "collection-spotlight": { title: "Collection spotlight", body: "Pick a few products to feature in this section's Edit panel." },
  "process-timeline": { title: "Process timeline", body: "Add your steps in this section's Edit panel." },
  "capability-grid": { title: "Capability grid", body: "Add a few highlights in this section's Edit panel." },
  "product-story": { title: "Product story", body: "Pick a hero product in this section's Edit panel." },
  "benefits-strip": { title: "Benefits", body: "Add a few reasons to choose you in this section's Edit panel." },
  "visual-strip": { title: "Visual strip", body: "Upload photos in the Gallery panel to fill this section." },
  "featured-work": { title: "Featured work", body: "Upload photos in the Gallery panel, or add a hero photo, to fill this section." },
  "story-collage": { title: "Story collage", body: "Upload at least 2 photos in the Gallery panel to fill this section." },
  "atmospheric-cta": { title: "Atmospheric CTA", body: "Add a heading in this section's Edit panel." },
};

/** Some sections (services, gallery, products, faq, team, reviews...) render nothing meaningful
 * when the underlying data is empty — this keeps the page from showing a bare heading over
 * whitespace, per the "never render an empty section" rule. Contact/quote are always meaningful. */
function EmptyGuard({ empty, type, children }: { empty: boolean; type: SectionType; children: React.ReactNode }) {
  const preview = useContext(PreviewContext);
  if (!empty || TYPES_WITH_NO_CONTENT_TO_HIDE.includes(type)) return <>{children}</>;
  const hint = EMPTY_HINTS[type];
  if (!preview || !hint) return null;
  return (
    <section className="mx-auto max-w-5xl px-6 py-8">
      <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">{hint.title}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground/80">{hint.body}</p>
        <p className="mt-3 text-xs text-muted-foreground/70">Only you can see this — it's hidden on your live site.</p>
      </div>
    </section>
  );
}

/** Shown only in the builder preview when a signature section is left over from a template the
 * business has since switched away from — never deleted, never rendered on the live site, but
 * visible here so the owner understands why it's not showing and how to bring it back (§19). */
function UnsupportedSignatureNote({ type, templateLabel }: { type: SectionType; templateLabel: string }) {
  const preview = useContext(PreviewContext);
  if (!preview) return null;
  return (
    <section className="mx-auto max-w-5xl px-6 py-8">
      <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">{SECTION_LIBRARY[type]?.label ?? type}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground/80">
          Not supported by this template — switch back to {templateLabel} to restore it, or remove it in Page Layout.
        </p>
        <p className="mt-3 text-xs text-muted-foreground/70">Only you can see this — it's hidden on your live site.</p>
      </div>
    </section>
  );
}

// ---------- Hero ----------

/** The hero fills with exactly one media source — a business sets either a photo or a video,
 * never both (see the hero uploader in the website builder). A video always wins when present:
 * autoplay/loop/muted so it behaves as a premium background loop, no controls. */
function HeroMedia({ videoUrl, imageUrl, alt, className }: { videoUrl: string | null; imageUrl: string | null; alt: string; className?: string }) {
  if (videoUrl) return <video src={videoUrl} autoPlay loop muted playsInline className={className} />;
  if (imageUrl) return <img src={imageUrl} alt={alt} className={className} />;
  return null;
}

function HeroBlock({ business, style, accent, content }: { business: SiteBusiness; style: TemplateStyle; accent: string; content: HeroContent }) {
  const heroUrl = useMediaUrl(business.hero_image_url);
  const heroVideoUrlRaw = useMediaUrl(business.main_video_url);
  const heroVideoUrl = heroVideoUrlRaw && isPlayableVideo(heroVideoUrlRaw) ? heroVideoUrlRaw : null;
  const hasHeroMedia = !!heroVideoUrl || !!heroUrl;
  const logoUrl = useMediaUrl(business.logo_url);
  const tagline = content.tagline || business.description;

  if (style.hero === "centered-minimal") {
    return (
      <section className="px-6 pb-20 pt-24 text-center md:pt-32">
        <div className="mx-auto max-w-2xl">
          {logoUrl && <img src={logoUrl} alt={business.name} className="mx-auto mb-8 h-20 w-20 rounded-full border object-cover" />}
          <h1 className={`text-4xl md:text-6xl ${heading(style)}`}>{business.name}</h1>
          {tagline && <p className="mt-6 whitespace-pre-line text-lg text-muted-foreground">{tagline}</p>}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {business.categories.map((c) => (
              <span key={c} className="rounded-full border border-border px-3 py-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                {c}
              </span>
            ))}
            {business.is_eco_friendly && <EcoBadge />}
          </div>
          <div className="mt-9">
            <a href="/contact" className={ctaClass(style)} style={{ backgroundColor: accent, color: "#fff" }}>
              Let's connect →
            </a>
          </div>
        </div>
        {hasHeroMedia && (
          <div className="mx-auto mt-14 max-w-4xl">
            <HeroMedia videoUrl={heroVideoUrl} imageUrl={heroUrl} alt={business.name} className={`aspect-[16/9] w-full object-cover ${corners(style)}`} />
          </div>
        )}
      </section>
    );
  }

  if (style.hero === "bold-overlay") {
    const words = business.name.trim().split(/\s+/);
    const wash = `linear-gradient(115deg, ${accent}CC 0%, ${accent}55 40%, transparent 70%)`;
    return hasHeroMedia ? (
      <section className="relative flex min-h-[68vh] items-center overflow-hidden md:min-h-[85vh]">
        <HeroMedia videoUrl={heroVideoUrl} imageUrl={heroUrl} alt={business.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0" style={{ background: wash }} />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-24">
          <h1 className="site-heading-font text-6xl font-black uppercase leading-[0.85] tracking-tight text-white sm:text-7xl md:text-8xl">
            {words.map((w, i) => (
              <span key={i} className="block">
                {w}
              </span>
            ))}
          </h1>
          {tagline && <p className={`mt-6 max-w-sm whitespace-pre-line text-base text-white/90 ${style.bodyClass}`}>{tagline}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/products" className={ctaClass(style)} style={{ backgroundColor: "#fff", color: "#171717" }}>
              Shop now →
            </a>
            {business.is_eco_friendly && <EcoBadge />}
            <FavoriteButton businessId={business.id} />
          </div>
        </div>
      </section>
    ) : (
      <section className="px-6 pb-20 pt-24 md:pt-32" style={{ background: `linear-gradient(180deg, ${accent}14, transparent)` }}>
        <div className="mx-auto max-w-4xl">
          <h1 className="site-heading-font text-6xl font-black uppercase leading-[0.85] tracking-tight sm:text-7xl md:text-8xl" style={{ color: accent }}>
            {words.map((w, i) => (
              <span key={i} className="block">
                {w}
              </span>
            ))}
          </h1>
          {tagline && <p className={`mt-6 max-w-sm whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{tagline}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/products" className={ctaClass(style)} style={{ backgroundColor: accent, color: "#fff" }}>
              Shop now →
            </a>
            {business.is_eco_friendly && <EcoBadge />}
            <FavoriteButton businessId={business.id} />
          </div>
        </div>
      </section>
    );
  }

  if (style.hero === "split" || style.hero === "image-right") {
    return (
      <section className="px-6 pb-16 pt-14 md:pb-20 md:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
          <div>
            <SectionEyebrow accent={accent} show={style.showEyebrows}>
              {business.categories[0] ?? "Welcome"}
            </SectionEyebrow>
            <h1 className={`mt-3 text-4xl md:text-5xl ${heading(style)}`}>{business.name}</h1>
            {tagline && <p className={`mt-5 max-w-md whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{tagline}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/contact" className={ctaClass(style)} style={{ backgroundColor: accent, color: "#fff" }}>
                {style.hero === "image-right" ? "Shop now" : "Get in touch"}
              </a>
              {business.is_eco_friendly && <EcoBadge />}
            </div>
          </div>
          {hasHeroMedia ? (
            <HeroMedia videoUrl={heroVideoUrl} imageUrl={heroUrl} alt={business.name} className={`aspect-[4/3] w-full object-cover ${corners(style)}`} />
          ) : (
            <div className={`aspect-[4/3] w-full ${corners(style)}`} style={{ backgroundColor: `${accent}14` }} />
          )}
        </div>
      </section>
    );
  }

  // full-bleed
  const wash = `linear-gradient(180deg, ${accent}33 0%, ${accent}66 55%, ${accent}E6 100%)`;
  return hasHeroMedia ? (
    <section className="relative flex min-h-[65vh] items-end overflow-hidden md:min-h-[78vh]">
      <HeroMedia videoUrl={heroVideoUrl} imageUrl={heroUrl} alt={business.name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: wash }} />
      <div className="relative mx-auto w-full max-w-5xl px-6 pb-16 pt-40">
        {logoUrl && <img src={logoUrl} alt={`${business.name} logo`} className="mb-6 h-16 w-16 rounded-md border border-white/40 bg-white/90 object-contain p-1" />}
        <h1 className={`text-4xl text-white md:text-7xl ${heading(style)}`}>{business.name}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {business.categories.map((c) => (
            <span key={c} className="rounded-full border border-white/40 px-3 py-1 text-[0.6875rem] uppercase tracking-[0.12em] text-white/90">
              {c}
            </span>
          ))}
          {business.is_eco_friendly && <EcoBadge />}
          <FavoriteButton businessId={business.id} />
        </div>
        {tagline && <p className={`mt-8 max-w-2xl whitespace-pre-line text-lg text-white/90 ${style.bodyClass}`}>{tagline}</p>}
      </div>
    </section>
  ) : (
    <section className="px-6 pb-20 pt-16" style={{ background: `linear-gradient(180deg, ${accent}14, transparent)` }}>
      <div className="mx-auto max-w-5xl">
        {logoUrl && <img src={logoUrl} alt={`${business.name} logo`} className="h-16 w-16 rounded-md border object-contain p-1" />}
        <h1 className={`mt-6 text-4xl md:text-7xl ${heading(style)}`} style={{ color: accent }}>
          {business.name}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {business.categories.map((c) => (
            <span key={c} className="rounded-full border px-3 py-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              {c}
            </span>
          ))}
          {business.is_eco_friendly && <EcoBadge />}
          <FavoriteButton businessId={business.id} />
        </div>
        {tagline && <p className={`mt-8 max-w-2xl whitespace-pre-line text-lg text-muted-foreground ${style.bodyClass}`}>{tagline}</p>}
      </div>
    </section>
  );
}

// ---------- About ----------

function AboutBlock({ business, style, accent, content }: { business: SiteBusiness; style: TemplateStyle; accent: string; content: AboutContent }) {
  const aboutImageUrl = useMediaUrl(business.about_image_url);
  // Deliberately business.about_text, not business.description — description is the short hero
  // tagline/SEO blurb (editable in the Hero panel); about_text is this section's own longer
  // narrative, so editing one never overwrites what the other shows.
  const aboutText = business.about_text;
  const empty = !aboutText && !aboutImageUrl;

  // Same component renders Home's about section and the dedicated /about page (see the shared
  // renderer note at the top of this file), so the left-photo/right-text layout applies to both
  // automatically — there's nothing page-specific to wire up here.
  if (aboutImageUrl) {
    return (
      <EmptyGuard empty={empty} type="about">
        <Reveal>
          <section className={`mx-auto max-w-6xl px-6 ${pad(style)}`}>
            <div className="grid items-center gap-10 md:grid-cols-2">
              <img
                src={aboutImageUrl}
                alt={`${business.name} — about us`}
                className={`aspect-[4/3] w-full object-cover ${corners(style)}`}
              />
              <div>
                <SectionEyebrow accent={accent} show={style.showEyebrows}>
                  About us
                </SectionEyebrow>
                <h2 className={`mt-3 text-3xl ${heading(style)}`}>{content.heading || `About ${business.name}`}</h2>
                {/* whitespace-pre-line: collapses runs of spaces/tabs like normal HTML text, but
                    still breaks on every newline the owner typed — a plain <p> would swallow those. */}
                {aboutText && <p className={`mt-6 whitespace-pre-line text-lg text-muted-foreground ${style.bodyClass}`}>{aboutText}</p>}
              </div>
            </div>
          </section>
        </Reveal>
      </EmptyGuard>
    );
  }

  return (
    <EmptyGuard empty={empty} type="about">
      <Reveal>
        <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
          <div className={style.spacing === "compact" ? "grid gap-8 md:grid-cols-[0.9fr_1.4fr] md:items-start" : ""}>
            <div>
              <SectionEyebrow accent={accent} show={style.showEyebrows}>
                About us
              </SectionEyebrow>
              <h2 className={`mt-3 text-3xl ${heading(style)}`}>{content.heading || `About ${business.name}`}</h2>
            </div>
            {aboutText && <p className={`mt-6 max-w-2xl whitespace-pre-line text-lg text-muted-foreground md:mt-0 ${style.bodyClass}`}>{aboutText}</p>}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

/** Resolves a product/service's stored image path to a real signed URL before rendering.
 * Unlike hero/logo/gallery images, items/services image_url isn't pre-signed server-side, so
 * using it directly as <img src> resolves as a relative URL against the current page and 404s. */
export function ItemImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const url = useMediaUrl(path);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}

// ---------- Services ----------

function ServicesBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  const services = business.services.filter((s) => s.is_active);
  return (
    <EmptyGuard empty={services.length === 0} type="services">
      <Reveal>
        <section className={`mx-auto max-w-6xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            What we offer
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Services</h2>
          <div className={`mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${style.cardStyle === "flat-divide" ? "sm:grid-cols-1 lg:grid-cols-2" : ""}`}>
            {services.map((s) => (
              <Link key={s.id} to="/services/$slug" params={{ slug: s.slug }} className={`block ${cardClass(style)}`}>
                {s.image_url && (
                  <ItemImage
                    path={s.image_url}
                    alt={s.name}
                    className={`aspect-[4/3] w-full object-cover ${style.cardStyle === "editorial-frame" ? "" : `${corners(style)} rounded-b-none`}`}
                  />
                )}
                <div className="p-6">
                  <h3 className={`text-lg ${heading(style)}`}>{s.name}</h3>
                  {s.description && <p className={`mt-2 text-sm text-muted-foreground ${style.bodyClass}`}>{s.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {s.price != null && <span style={{ color: accent }}>From ₹{s.price}</span>}
                    <span>{s.duration_minutes} min</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <a href="/contact" className={ctaClass(style)} style={{ backgroundColor: accent, color: "#fff" }}>
              Enquire about a service →
            </a>
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

// ---------- Products ----------

/** Client-side only — filters within this business's own products, never a site-wide search. */
function ProductSearchInput({
  value,
  onChange,
  accent,
  placeholder = "Search products…",
}: {
  value: string;
  onChange: (v: string) => void;
  accent: string;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search products"
        className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2"
        style={{ boxShadow: value ? `0 0 0 2px ${accent}40` : undefined }}
      />
    </div>
  );
}

/** Purely a visual affordance to match a real storefront's product cards — toggles locally per
 * session, not persisted anywhere (there's no wishlist data model). Never claims to save. */
function WishlistHeart({ accent }: { accent: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        setSaved((v) => !v);
      }}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={saved}
      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform hover:scale-105"
    >
      <Heart className="h-4 w-4" style={saved ? { fill: accent, color: accent } : { color: "#171717" }} aria-hidden="true" />
    </button>
  );
}

function CatalogueProductCard({ item, accent }: { item: SiteBusiness["items"][number]; accent: string }) {
  return (
    <Link to="/products/$slug" params={{ slug: item.slug }} className="group block">
      <div className="relative overflow-hidden rounded-md bg-secondary/60">
        {item.image_url ? (
          <ItemImage
            path={item.image_url}
            alt={item.name}
            className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="aspect-square w-full" style={{ backgroundColor: `${accent}14` }} />
        )}
        <WishlistHeart accent={accent} />
      </div>
      <p className="site-heading-font mt-3 text-sm font-medium">{item.name}</p>
      {item.price != null && <p className="mt-0.5 text-sm text-muted-foreground">₹{item.price}</p>}
    </Link>
  );
}

/** Catalogue's Home storefront block — category pills (from the business's own product
 * categories) plus search, replacing Gallery/About in Catalogue's home composition
 * (see homeSectionTypesFor in website-pages.ts). Only ever used on Home for this template. */
function CatalogueHomeProducts({ business, accent, items }: { business: SiteBusiness; accent: string; items: SiteBusiness["items"] }) {
  const categories = Array.from(new Set(items.map((i) => i.category).filter((c): c is string => !!c)));
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = items
    .filter((i) => !active || i.category === active)
    .filter((i) => !q || i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q));

  return (
    <EmptyGuard empty={items.length === 0} type="products">
      <Reveal>
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Shop</p>
              <h2 className="site-heading-font mt-2 text-3xl font-semibold tracking-tight">New Arrivals</h2>
            </div>
            <Link to="/products" className="text-sm font-medium hover:underline" style={{ color: accent }}>
              Show more →
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="rounded-full border px-4 py-1.5 text-sm transition-colors"
                  style={
                    !active
                      ? { backgroundColor: accent, borderColor: accent, color: "#fff" }
                      : { borderColor: "var(--color-border)" }
                  }
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setActive(c)}
                    className="rounded-full border px-4 py-1.5 text-sm capitalize transition-colors"
                    style={
                      active === c
                        ? { backgroundColor: accent, borderColor: accent, color: "#fff" }
                        : { borderColor: "var(--color-border)" }
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            <ProductSearchInput value={query} onChange={setQuery} accent={accent} />
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
            {filtered.map((item) => (
              <CatalogueProductCard key={item.id} item={item} accent={accent} />
            ))}
          </div>
          {filtered.length === 0 && <p className="mt-10 text-sm text-muted-foreground">No products match your search.</p>}
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

/** The dedicated Products page, used by every template. Adds a search box (this business's
 * products only) for all templates; Catalogue additionally gets the storefront card style. */
function ProductsPageBlock({
  style,
  accent,
  items,
}: {
  style: TemplateStyle;
  accent: string;
  items: SiteBusiness["items"];
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q)) : items;
  const catalogue = style.id === "catalogue";

  return (
    <EmptyGuard empty={items.length === 0} type="products">
      <Reveal>
        <section className={`mx-auto max-w-6xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            Catalogue
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Products</h2>
          {items.length > 1 && (
            <div className="mt-6">
              <ProductSearchInput value={query} onChange={setQuery} accent={accent} />
            </div>
          )}
          <div className={`mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 ${catalogue ? "sm:gap-x-5 sm:gap-y-8" : ""}`}>
            {filtered.map((item) =>
              catalogue ? (
                <CatalogueProductCard key={item.id} item={item} accent={accent} />
              ) : (
                <Link key={item.id} to="/products/$slug" params={{ slug: item.slug }} className={`block ${cardClass(style)}`}>
                  {item.image_url && (
                    <ItemImage
                      path={item.image_url}
                      alt={item.name}
                      className={`aspect-square w-full object-cover ${style.cardStyle === "editorial-frame" ? "" : corners(style)} ${style.cardStyle !== "editorial-frame" ? "rounded-b-none" : ""}`}
                    />
                  )}
                  <div className="p-4">
                    <p className={`text-sm font-medium ${heading(style)}`}>{item.name}</p>
                    {item.price != null && <p className="mt-1 text-sm text-muted-foreground">₹{item.price}</p>}
                  </div>
                </Link>
              ),
            )}
          </div>
          {filtered.length === 0 && query && <p className="mt-8 text-sm text-muted-foreground">No products match "{query}".</p>}
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

function ProductsBlock({ business, style, accent, page }: { business: SiteBusiness; style: TemplateStyle; accent: string; page: PageId }) {
  const items = business.items.filter((i) => i.is_active);
  if (style.id === "catalogue" && page === "home") {
    return <CatalogueHomeProducts business={business} accent={accent} items={items} />;
  }
  return <ProductsPageBlock style={style} accent={accent} items={items} />;
}

function FeaturedProductsBlock({
  business,
  style,
  accent,
  content,
}: {
  business: SiteBusiness;
  style: TemplateStyle;
  accent: string;
  content: FeaturedProductsContent;
}) {
  const ids = new Set(content.itemIds ?? []);
  const items = business.items.filter((i) => i.is_active && ids.has(i.id));
  return (
    <EmptyGuard empty={items.length === 0} type="featured-products">
      <Reveal>
        <section className={`mx-auto max-w-6xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            Spotlight
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Featured</h2>
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {items.map((item) => (
              <Link key={item.id} to="/products/$slug" params={{ slug: item.slug }} className={`block ${cardClass(style)}`}>
                {item.image_url && <ItemImage path={item.image_url} alt={item.name} className={`aspect-square w-full object-cover ${corners(style)}`} />}
                <div className="p-3">
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.price != null && <p className="text-xs text-muted-foreground">₹{item.price}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

// ---------- Gallery ----------

function GalleryBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  const galleryUrls = useResolvedList(business.gallery_urls ?? []);
  const items = business.items.filter((i) => i.is_active);
  const fallbackRaw = items
    .map((i) => ({ ...i, image_url: (i as { image_urls?: string[] }).image_urls?.[0] ?? i.image_url }))
    .filter((i): i is (typeof items)[number] & { image_url: string } => !!i.image_url);
  // Product photos aren't pre-signed server-side the way gallery_urls is — resolve them here too,
  // the same way, or the raw storage path ends up used directly as <img src> and 404s.
  const fallbackResolvedUrls = useResolvedList(fallbackRaw.map((i) => i.image_url));
  const fallback =
    fallbackResolvedUrls.length === fallbackRaw.length
      ? fallbackRaw.map((i, idx) => ({ ...i, image_url: fallbackResolvedUrls[idx] }))
      : [];
  const galleryItems = galleryUrls.length
    ? galleryUrls.map((url, i) => ({ id: `gallery-${i}`, image_url: url, name: `${business.name} photo ${i + 1}` }))
    : fallback.map((i) => ({ id: i.id, image_url: i.image_url, name: i.name, price: i.price, description: i.description }));

  return (
    <EmptyGuard empty={galleryItems.length === 0} type="gallery">
      <Reveal>
        <section className={`mx-auto max-w-6xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            Our work
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Gallery</h2>
          <div className="mt-10">
            <GalleryGrid items={galleryItems} accent={accent} layout={style.gallery} rounded={corners(style)} />
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

// ---------- Video ----------

/** Main video no longer shows here — it's promoted to the hero (see HeroBlock), which is the
 * business's one video slot. This section is now just the short-clip reel. */
function VideoBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  const shortUrls = useResolvedList(business.short_video_urls ?? []);
  const shorts = shortUrls.filter(isPlayableVideo).slice(0, 3);

  return (
    <EmptyGuard empty={shorts.length === 0} type="video">
      <Reveal>
        <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            In motion
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Video</h2>
          {shorts.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {shorts.map((url) => (
                <div key={url} className={`aspect-[9/16] overflow-hidden border ${corners(style)}`} style={{ borderColor: `${accent}40` }}>
                  <VideoPlayer url={url} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

// ---------- Booking ----------

function BookingBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  return (
    <Reveal>
      <section id="booking" className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
        <SectionEyebrow accent={accent} show={style.showEyebrows}>
          Appointments
        </SectionEyebrow>
        <h2 className={`mt-3 text-3xl ${heading(style)}`}>Book a time</h2>
        <div className="mt-8">
          <BookingWidget businessId={business.id} accent={accent} />
        </div>
      </section>
    </Reveal>
  );
}

// ---------- Team ----------

function TeamBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  return (
    <EmptyGuard empty={business.staff.length === 0} type="team">
      <Reveal>
        <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            Meet the team
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Team</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {business.staff.map((s) => (
              <div key={s.id} className={`${cardClass(style)} p-5`}>
                <p className={`text-base ${heading(style)}`}>{s.name}</p>
                {s.specializations.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{s.specializations.join(" · ")}</p>}
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

// ---------- Reviews ----------

function ReviewsBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  return (
    <EmptyGuard empty={business.reviews.length === 0} type="reviews">
      <Reveal>
        <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            Testimonials
          </SectionEyebrow>
          <div className="mt-3 flex items-baseline gap-3">
            <h2 className={`text-3xl ${heading(style)}`}>Reviews</h2>
            {business.review_count > 0 && (
              <span className="text-sm text-muted-foreground">
                {business.review_avg?.toFixed(1)} ★ · {business.review_count} review{business.review_count === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {business.reviews.slice(0, 6).map((r) => (
              <div key={r.id} className={`${cardClass(style)} p-5`}>
                <p style={{ color: accent }}>{"★".repeat(r.rating)}<span className="text-border">{"★".repeat(5 - r.rating)}</span></p>
                {r.comment && <p className={`mt-2 text-sm text-muted-foreground ${style.bodyClass}`}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

// ---------- FAQ ----------

function FaqBlock({ style, accent, content }: { style: TemplateStyle; accent: string; content: FaqContent }) {
  const items = (content.items ?? []).filter((f) => f.q && f.a);
  return (
    <EmptyGuard empty={items.length === 0} type="faq">
      <Reveal>
        <section className={`mx-auto max-w-3xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            Questions
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>FAQ</h2>
          <div className="mt-8 space-y-5">
            {items.map((f, i) => (
              <div key={i} className="border-b border-border pb-5">
                <p className="font-medium">{f.q}</p>
                <p className={`mt-1.5 text-sm text-muted-foreground ${style.bodyClass}`}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

// ---------- Hours ----------

function HoursBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  const hours = business.operating_hours;
  return (
    <EmptyGuard empty={!hours?.start || !hours?.end || !hours?.days?.length} type="hours">
      <Reveal>
        <section className={`mx-auto max-w-3xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            When to visit
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Opening hours</h2>
          {hours && (
            <p className="mt-6 text-lg text-muted-foreground">
              {(hours.days ?? []).map((d) => DAY_NAMES[d]).join(", ")} · {hours.start}–{hours.end}
            </p>
          )}
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

// ---------- Location / Delivery ----------

function LocationBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  return (
    <EmptyGuard empty={business.locations.length === 0} type="location">
      <Reveal>
        <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            Where to find us
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Locations</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {business.locations.map((l) => (
              <div key={l.id} className={`${cardClass(style)} p-6`}>
                <p className="text-lg">{l.city}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {l.address}
                  {l.state ? `, ${l.state}` : ""}
                </p>
                {l.is_primary && (
                  <p className="eyebrow mt-3" style={{ color: accent }}>
                    Main branch
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

function DeliveryBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  return (
    <EmptyGuard empty={business.delivery_areas.length === 0} type="delivery-areas">
      <Reveal>
        <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
          <div className={`p-8 ${corners(style)}`} style={{ backgroundColor: `${accent}0A` }}>
            <SectionEyebrow accent={accent} show={style.showEyebrows}>
              Delivery
            </SectionEyebrow>
            <h2 className={`mt-3 text-3xl ${heading(style)}`}>We serve</h2>
            <p className="mt-6 text-muted-foreground">
              {business.delivery_areas.some((d) => d.is_pan_india) ? "All of India" : business.delivery_areas.map((d) => d.city).join(" · ")}
            </p>
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

// ---------- Contact / Quote / Social ----------

function ContactBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  return (
    <Reveal>
      <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
        <div className={`border p-10 md:p-12 ${corners(style)}`} style={{ borderColor: `${accent}40` }}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            Get in touch
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Talk to {business.name}</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            {business.whatsapp && (
              <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} className={ctaClass(style)} style={{ backgroundColor: accent, color: "#fff" }}>
                WhatsApp
              </a>
            )}
            {business.contact_email && (
              <a href={`mailto:${business.contact_email}`} className={`${ctaClass(style)} border`} style={{ borderColor: accent, color: accent }}>
                Email us
              </a>
            )}
            {business.instagram_url && (
              <a href={business.instagram_url} className={`${ctaClass(style)} border border-border hover:border-foreground/40`}>
                Instagram
              </a>
            )}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function SocialBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  return (
    <EmptyGuard empty={!business.instagram_url} type="social">
      <Reveal>
        <section className={`mx-auto max-w-5xl px-6 ${pad(style)} text-center`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            Follow along
          </SectionEyebrow>
          {business.instagram_url && (
            <a href={business.instagram_url} className={`${ctaClass(style)} mt-3 border border-border`}>
              @{business.name.replace(/\s+/g, "")} on Instagram
            </a>
          )}
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

function QuoteBlock({ business, style, accent, content }: { business: SiteBusiness; style: TemplateStyle; accent: string; content: QuoteContent }) {
  return (
    <Reveal>
      <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
        <div className={`p-10 text-center md:p-14 ${corners(style)}`} style={{ backgroundColor: `${accent}0F` }}>
          <h2 className={`text-3xl md:text-4xl ${heading(style)}`}>{content.heading || "Tell us what you need"}</h2>
          <p className={`mx-auto mt-4 max-w-xl text-muted-foreground ${style.bodyClass}`}>
            {content.body || `Post your requirement and get a quote directly from ${business.name}.`}
          </p>
          <div className="mt-8">
            <Link to="/post-requirement" className={ctaClass(style)} style={{ backgroundColor: accent, color: "#fff" }}>
              Request a quote →
            </Link>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function PromoBannerBlock({ style, accent, content }: { style: TemplateStyle; accent: string; content: PromoBannerContent }) {
  return (
    <EmptyGuard empty={!content.heading} type="promo-banner">
      <section className="px-6 py-3" style={{ backgroundColor: accent }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 text-center text-white">
          <p className="text-sm font-medium">{content.heading}</p>
          {content.body && <p className="text-sm text-white/85">{content.body}</p>}
          {content.ctaLabel && content.ctaHref && (
            <a href={content.ctaHref} className="text-sm font-medium underline underline-offset-4">
              {content.ctaLabel}
            </a>
          )}
        </div>
      </section>
    </EmptyGuard>
  );
}

function CustomTextBlock({ style, content }: { style: TemplateStyle; content: CustomTextContent }) {
  return (
    <EmptyGuard empty={!content.body?.trim()} type="custom-text">
      <Reveal>
        <section className={`mx-auto max-w-3xl px-6 ${pad(style)}`}>
          {content.heading && <h2 className={`text-3xl ${heading(style)}`}>{content.heading}</h2>}
          <p className={`mt-4 whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{content.body}</p>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

// ---------- Signature sections — two per template, real content-only, §19 template-scoped ----------

/** Editorial (Celesse): a large photo paired with an owner-written story — a magazine spread,
 * not a generic about block. Uses the business's own about photo (never a stock/placeholder). */
function EditorialSpreadBlock({ business, style, accent, content }: { business: SiteBusiness; style: TemplateStyle; accent: string; content: EditorialSpreadContent }) {
  const imageUrl = useMediaUrl(business.about_image_url);
  // `useMediaUrl` only resolves after hydration (see its own doc comment) — checking the raw
  // stored path here (not the resolved url) keeps this correct on the very first server render,
  // same as AboutBlock's existing `!aboutText && !aboutImageUrl` pattern.
  const empty = !business.about_image_url || !content.body?.trim();
  return (
    <EmptyGuard empty={empty} type="editorial-spread">
      <Reveal>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:grid-cols-2">
          {imageUrl && <img src={imageUrl} alt={business.name} className="aspect-[3/4] w-full object-cover" />}
          <div>
            <SectionEyebrow accent={accent} show>
              In the studio
            </SectionEyebrow>
            {content.heading && <h2 className={`mt-3 text-3xl md:text-4xl ${heading(style)}`}>{content.heading}</h2>}
            {content.body && <p className="mt-6 whitespace-pre-line text-lg italic leading-relaxed text-muted-foreground">{content.body}</p>}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

/** Editorial (Celesse): a small, large-format showcase of a curated handful of products — never
 * the full catalogue grid, an intentional edit. */
function CollectionSpotlightBlock({ business, style, accent, content }: { business: SiteBusiness; style: TemplateStyle; accent: string; content: CollectionSpotlightContent }) {
  const ids = new Set(content.itemIds ?? []);
  const items = business.items.filter((i) => i.is_active && ids.has(i.id)).slice(0, 3);
  return (
    <EmptyGuard empty={items.length === 0} type="collection-spotlight">
      <Reveal>
        <section className="mx-auto max-w-6xl px-6 py-24">
          <SectionEyebrow accent={accent} show>
            The edit
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl md:text-4xl ${heading(style)}`}>{content.heading || "Collection spotlight"}</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {items.map((item) => (
              <Link key={item.id} to="/products/$slug" params={{ slug: item.slug }} className="group block">
                {item.image_url && (
                  <ItemImage path={item.image_url} alt={item.name} className="aspect-[3/4] w-full object-cover transition-opacity group-hover:opacity-80" />
                )}
                <p className="mt-4 text-lg font-medium">{item.name}</p>
                {item.price != null && <p className="mt-1 text-muted-foreground">₹{item.price}</p>}
              </Link>
            ))}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

/** Modern (Agencieos): an owner-authored, numbered step-by-step of how they work. */
function ProcessTimelineBlock({ style, accent, content }: { style: TemplateStyle; accent: string; content: ProcessTimelineContent }) {
  const steps = content.steps ?? [];
  return (
    <EmptyGuard empty={steps.length === 0} type="process-timeline">
      <Reveal>
        <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={false}>
            How we work
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Our process</h2>
          <ol className="mt-10 space-y-8 border-l-2 pl-8" style={{ borderColor: `${accent}40` }}>
            {steps.map((s, i) => (
              <li key={i} className="relative">
                <span
                  className="absolute -left-[41px] flex size-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <p className={`text-lg ${heading(style)}`}>{s.title}</p>
                {s.body && <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>}
              </li>
            ))}
          </ol>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

/** Modern (Agencieos): a bento-style grid of capabilities/highlights. */
function CapabilityGridBlock({ style, accent, content }: { style: TemplateStyle; accent: string; content: CapabilityGridContent }) {
  const items = content.items ?? [];
  return (
    <EmptyGuard empty={items.length === 0} type="capability-grid">
      <Reveal>
        <section className={`mx-auto max-w-6xl px-6 ${pad(style)}`}>
          <h2 className={`text-3xl ${heading(style)}`}>What we bring</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it, i) => (
              <div key={i} className="border border-border p-6">
                <div className="size-8 rounded-md" style={{ backgroundColor: accent }} />
                <p className={`mt-4 text-lg font-bold ${heading(style)}`}>{it.title}</p>
                {it.body && <p className="mt-1.5 text-sm text-muted-foreground">{it.body}</p>}
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

/** Catalogue (Essentia): a sequential, cinematic story built around one hero product. */
function ProductStoryBlock({ business, style, accent, content }: { business: SiteBusiness; style: TemplateStyle; accent: string; content: ProductStoryContent }) {
  const item = business.items.find((i) => i.id === content.itemId && i.is_active);
  return (
    <EmptyGuard empty={!item} type="product-story">
      {item && (
        <Reveal>
          <section className="px-6 py-24 text-center">
            <SectionEyebrow accent={accent} show>
              The story
            </SectionEyebrow>
            <h2 className={`mx-auto mt-3 max-w-2xl text-3xl md:text-4xl ${heading(style)}`}>{content.heading || item.name}</h2>
            {item.image_url && (
              <ItemImage path={item.image_url} alt={item.name} className="mx-auto mt-12 aspect-[16/10] w-full max-w-4xl object-cover" />
            )}
            {item.description && <p className="mx-auto mt-10 max-w-xl text-lg text-muted-foreground">{item.description}</p>}
            <Link to="/products/$slug" params={{ slug: item.slug }} className={`${ctaClass(style)} mt-8`} style={{ backgroundColor: accent, color: "#fff" }}>
              Discover more →
            </Link>
          </section>
        </Reveal>
      )}
    </EmptyGuard>
  );
}

/** Catalogue (Essentia): a short, focused row of reasons to choose this business. */
function BenefitsStripBlock({ style, accent, content }: { style: TemplateStyle; accent: string; content: BenefitsStripContent }) {
  const items = content.items ?? [];
  return (
    <EmptyGuard empty={items.length === 0} type="benefits-strip">
      <Reveal>
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="grid gap-8 sm:grid-cols-3">
            {items.map((it, i) => (
              <div key={i}>
                <p className={`text-xl ${heading(style)}`} style={{ color: accent }}>
                  {it.title}
                </p>
                {it.body && <p className="mt-2 text-sm text-muted-foreground">{it.body}</p>}
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

/** Experience (Aperture): a full-width strip of the business's own gallery work. */
function VisualStripBlock({ business, style }: { business: SiteBusiness; style: TemplateStyle }) {
  const urls = business.gallery_urls.slice(0, 4);
  return (
    <EmptyGuard empty={urls.length === 0} type="visual-strip">
      <Reveal>
        <section className={`grid gap-1 ${urls.length >= 3 ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
          {urls.map((u, i) => (
            <ItemImage key={i} path={u} alt="" className={`aspect-[3/4] w-full object-cover ${style.corners === "sharp" ? "" : ""}`} />
          ))}
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

/** Experience (Aperture): one standout photo treated as its own full-bleed moment, with a caption
 * — not a hero (doesn't carry the business name), a mid-page visual pause. */
function FeaturedWorkBlock({ business, style, content }: { business: SiteBusiness; style: TemplateStyle; content: FeaturedWorkContent }) {
  const url = business.gallery_urls[0] ?? business.hero_image_url;
  return (
    <EmptyGuard empty={!url} type="featured-work">
      {url && (
        <Reveal>
          <section className="relative">
            <ItemImage path={url} alt={content.heading ?? business.name} className="h-[70vh] w-full object-cover" />
            {(content.heading || content.body) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-10">
                {content.heading && <p className={`text-2xl text-white ${heading(style)}`}>{content.heading}</p>}
                {content.body && <p className="mt-2 max-w-md text-white/85">{content.body}</p>}
              </div>
            )}
          </section>
        </Reveal>
      )}
    </EmptyGuard>
  );
}

/** Story (Cullen): a layered collage of the business's own photos with a short narrative — the
 * signature "editorial collage" moment. */
function StoryCollageBlock({ business, style, content }: { business: SiteBusiness; style: TemplateStyle; content: StoryCollageContent }) {
  const urls = business.gallery_urls.slice(0, 3);
  return (
    <EmptyGuard empty={urls.length === 0} type="story-collage">
      <Reveal>
        <section className="mx-auto max-w-5xl px-6 py-24">
          <div className="relative grid grid-cols-6 gap-4">
            {urls[0] && <ItemImage path={urls[0]} alt="" className="col-span-4 aspect-[4/3] w-full object-cover" />}
            {urls[1] && <ItemImage path={urls[1]} alt="" className="col-span-2 mt-10 aspect-square w-full object-cover" />}
            {urls[2] && <ItemImage path={urls[2]} alt="" className="col-span-3 -mt-6 aspect-[4/3] w-full object-cover" />}
          </div>
          {(content.heading || content.body) && (
            <div className="mt-14 max-w-md">
              {content.heading && <h2 className={`text-3xl ${heading(style)}`}>{content.heading}</h2>}
              {content.body && <p className="mt-4 text-muted-foreground">{content.body}</p>}
            </div>
          )}
        </section>
      </Reveal>
    </EmptyGuard>
  );
}

/** Story (Cullen): a bold, full-bleed mid-page moment — same visual weight as the hero, usable
 * anywhere in the page order for a second dramatic beat. */
function AtmosphericCtaBlock({ business, style, accent, content }: { business: SiteBusiness; style: TemplateStyle; accent: string; content: AtmosphericCtaContent }) {
  return (
    <EmptyGuard empty={!content.heading?.trim()} type="atmospheric-cta">
      <section className="relative flex min-h-[50vh] items-center justify-center px-6 text-center" style={{ backgroundColor: "#0A0A0A" }}>
        <div className="max-w-2xl">
          <h2 className={`text-4xl text-white md:text-6xl ${heading(style)}`}>{content.heading}</h2>
          {content.body && <p className="mt-6 text-lg text-white/70">{content.body}</p>}
          <Link to="/contact" className={`${ctaClass(style)} mt-9`} style={{ backgroundColor: accent, color: "#fff" }}>
            {content.ctaLabel || `Talk to ${business.name}`} →
          </Link>
        </div>
      </section>
    </EmptyGuard>
  );
}
