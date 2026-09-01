import { createContext, useContext } from "react";
import { Link } from "@tanstack/react-router";
import { EcoBadge } from "@/components/eco-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { BookingWidget } from "@/components/booking-widget";
import { GalleryGrid } from "@/components/gallery-grid";
import { Reveal } from "@/components/reveal";
import { useMediaUrl } from "@/components/media-uploader";
import { SectionEyebrow, VideoPlayer, isPlayableVideo, useResolvedList } from "@/components/website/media";
import type { TemplateStyle } from "@/lib/website-templates";
import type { SiteBusiness } from "@/lib/website-site-types";
import type {
  AboutContent,
  CustomTextContent,
  FaqContent,
  FeaturedProductsContent,
  HeroContent,
  PromoBannerContent,
  QuoteContent,
  Section,
  SectionType,
} from "@/lib/website-sections";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function corners(style: TemplateStyle, size: "sm" | "lg" = "lg") {
  if (style.corners === "sharp") return "rounded-none";
  return size === "sm" ? "rounded-md" : "rounded-xl";
}

function pad(style: TemplateStyle) {
  return style.spacing === "airy" ? "py-20 md:py-28" : "py-12 md:py-16";
}

function heading(style: TemplateStyle, className = "") {
  return `${style.headingFont === "serif" ? "font-serif" : ""} ${style.headingClass} ${className}`;
}

function cardClass(style: TemplateStyle) {
  switch (style.cardStyle) {
    case "shadow":
      return `border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-lg ${corners(style)}`;
    case "flat-divide":
      return "border-t border-border pt-6";
    case "editorial-frame":
      return `border border-border p-2 transition-colors hover:border-foreground/40 ${corners(style)}`;
    default:
      return `border border-border bg-card ${corners(style)}`;
  }
}

function ctaClass(style: TemplateStyle) {
  return `inline-flex items-center gap-2 px-6 py-3 text-sm font-medium transition-transform hover:scale-[1.02] ${corners(style, "sm")}`;
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
}: {
  business: SiteBusiness;
  sections: Section[];
  style: TemplateStyle;
  accent: string;
}) {
  return (
    <>
      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} business={business} style={style} accent={accent} />
      ))}
    </>
  );
}

function SectionBlock({ section, business, style, accent }: { section: Section; business: SiteBusiness; style: TemplateStyle; accent: string }) {
  switch (section.type) {
    case "hero":
      return <HeroBlock business={business} style={style} accent={accent} content={section.content as HeroContent} />;
    case "about":
      return <AboutBlock business={business} style={style} accent={accent} content={section.content as AboutContent} />;
    case "services":
      return <ServicesBlock business={business} style={style} accent={accent} />;
    case "products":
      return <ProductsBlock business={business} style={style} accent={accent} />;
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
  about: { title: "About", body: "Add a description in “About Your Business” to fill this section." },
  services: { title: "Services", body: "Add your first service in the Services page — price, duration and a photo." },
  products: { title: "Products", body: "Add your first product in the Products page." },
  "featured-products": { title: "Featured", body: "Pick which products to spotlight in this section's Edit panel." },
  gallery: { title: "Gallery", body: "Upload photos in the Gallery panel to show your work here." },
  video: { title: "Video", body: "Upload a main video or short clips to fill this section." },
  reviews: { title: "Reviews", body: "Customer reviews appear here automatically once you have some." },
  faq: { title: "FAQ", body: "Add questions and answers in this section's Edit panel." },
  team: { title: "Team", body: "Add team members in Staff & Availability." },
  hours: { title: "Opening hours", body: "Set your opening hours in Website Settings." },
  location: { title: "Locations", body: "Add an address in Website Settings → Locations." },
  "delivery-areas": { title: "Delivery areas", body: "Add the cities you deliver to in Website Settings." },
  social: { title: "Social links", body: "Add your Instagram link in Website Settings." },
  "promo-banner": { title: "Promo banner", body: "Add banner text in this section's Edit panel." },
  "custom-text": { title: "Custom text", body: "Add your text in this section's Edit panel." },
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

// ---------- Hero ----------

function HeroBlock({ business, style, accent, content }: { business: SiteBusiness; style: TemplateStyle; accent: string; content: HeroContent }) {
  const heroUrl = useMediaUrl(business.hero_image_url);
  const logoUrl = useMediaUrl(business.logo_url);
  const tagline = content.tagline || business.description;

  if (style.hero === "centered-minimal") {
    return (
      <section className="px-6 pb-20 pt-24 text-center md:pt-32">
        <div className="mx-auto max-w-2xl">
          {logoUrl && <img src={logoUrl} alt={business.name} className="mx-auto mb-8 h-20 w-20 rounded-full border object-cover" />}
          <h1 className={`text-4xl md:text-6xl ${heading(style)}`}>{business.name}</h1>
          {tagline && <p className="mt-6 text-lg text-muted-foreground">{tagline}</p>}
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
        {heroUrl && (
          <div className="mx-auto mt-14 max-w-4xl">
            <img src={heroUrl} alt={business.name} className={`aspect-[16/9] w-full object-cover ${corners(style)}`} />
          </div>
        )}
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
            {tagline && <p className={`mt-5 max-w-md text-muted-foreground ${style.bodyClass}`}>{tagline}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/contact" className={ctaClass(style)} style={{ backgroundColor: accent, color: "#fff" }}>
                {style.hero === "image-right" ? "Shop now" : "Get in touch"}
              </a>
              {business.is_eco_friendly && <EcoBadge />}
            </div>
          </div>
          {heroUrl ? (
            <img src={heroUrl} alt={business.name} className={`aspect-[4/3] w-full object-cover ${corners(style)}`} />
          ) : (
            <div className={`aspect-[4/3] w-full ${corners(style)}`} style={{ backgroundColor: `${accent}14` }} />
          )}
        </div>
      </section>
    );
  }

  // full-bleed
  const wash = `linear-gradient(180deg, ${accent}33 0%, ${accent}66 55%, ${accent}E6 100%)`;
  return heroUrl ? (
    <section className="relative flex min-h-[65vh] items-end overflow-hidden md:min-h-[78vh]">
      <img src={heroUrl} alt={business.name} className="absolute inset-0 h-full w-full object-cover" />
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
        {tagline && <p className={`mt-8 max-w-2xl text-lg text-white/90 ${style.bodyClass}`}>{tagline}</p>}
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
        {tagline && <p className={`mt-8 max-w-2xl text-lg text-muted-foreground ${style.bodyClass}`}>{tagline}</p>}
      </div>
    </section>
  );
}

// ---------- About ----------

function AboutBlock({ business, style, accent, content }: { business: SiteBusiness; style: TemplateStyle; accent: string; content: AboutContent }) {
  return (
    <EmptyGuard empty={!business.description} type="about">
      <Reveal>
        <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
          <div className={style.spacing === "compact" ? "grid gap-8 md:grid-cols-[0.9fr_1.4fr] md:items-start" : ""}>
            <div>
              <SectionEyebrow accent={accent} show={style.showEyebrows}>
                About us
              </SectionEyebrow>
              <h2 className={`mt-3 text-3xl ${heading(style)}`}>{content.heading || `About ${business.name}`}</h2>
            </div>
            {business.description && <p className={`mt-6 max-w-2xl text-lg text-muted-foreground md:mt-0 ${style.bodyClass}`}>{business.description}</p>}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
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
              <div key={s.id} className={cardClass(style)}>
                {s.image_url && (
                  <img
                    src={s.image_url}
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
              </div>
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

function ProductsBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  const items = business.items.filter((i) => i.is_active);
  return (
    <EmptyGuard empty={items.length === 0} type="products">
      <Reveal>
        <section className={`mx-auto max-w-6xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            Catalogue
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Products</h2>
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className={cardClass(style)}>
                {item.image_url && <img src={item.image_url} alt={item.name} className={`aspect-square w-full object-cover ${style.cardStyle === "editorial-frame" ? "" : corners(style)} ${style.cardStyle !== "editorial-frame" ? "rounded-b-none" : ""}`} />}
                <div className="p-4">
                  <p className={`text-sm font-medium ${heading(style)}`}>{item.name}</p>
                  {item.price != null && <p className="mt-1 text-sm text-muted-foreground">₹{item.price}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </EmptyGuard>
  );
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
              <div key={item.id} className={cardClass(style)}>
                {item.image_url && <img src={item.image_url} alt={item.name} className={`aspect-square w-full object-cover ${corners(style)}`} />}
                <div className="p-3">
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.price != null && <p className="text-xs text-muted-foreground">₹{item.price}</p>}
                </div>
              </div>
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
  const fallback = items
    .map((i) => ({ ...i, image_url: (i as { image_urls?: string[] }).image_urls?.[0] ?? i.image_url }))
    .filter((i): i is (typeof items)[number] & { image_url: string } => !!i.image_url);
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

function VideoBlock({ business, style, accent }: { business: SiteBusiness; style: TemplateStyle; accent: string }) {
  const mainVideoUrl = useMediaUrl(business.main_video_url);
  const shortUrls = useResolvedList(business.short_video_urls ?? []);
  const shorts = shortUrls.filter(isPlayableVideo).slice(0, 3);
  const hasMain = !!mainVideoUrl && isPlayableVideo(mainVideoUrl);

  return (
    <EmptyGuard empty={!hasMain && shorts.length === 0} type="video">
      <Reveal>
        <section className={`mx-auto max-w-5xl px-6 ${pad(style)}`}>
          <SectionEyebrow accent={accent} show={style.showEyebrows}>
            In motion
          </SectionEyebrow>
          <h2 className={`mt-3 text-3xl ${heading(style)}`}>Video</h2>
          {hasMain && (
            <div className={`mt-8 aspect-video w-full overflow-hidden border ${corners(style)}`} style={{ borderColor: `${accent}55` }}>
              <VideoPlayer url={mainVideoUrl!} className="h-full w-full" />
            </div>
          )}
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
