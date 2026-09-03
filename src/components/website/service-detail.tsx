import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/reveal";
import { SectionEyebrow } from "@/components/website/media";
import { corners, ctaClass, heading, ItemImage, pad } from "@/components/website/section-renderer";
import type { TemplateStyle } from "@/lib/website-templates";
import type { SiteBusiness } from "@/lib/website-site-types";

type Service = SiteBusiness["services"][number];

function relatedServices(all: Service[], current: Service): Service[] {
  const others = all.filter((s) => s.id !== current.id && s.is_active);
  const sameCategory = others.filter((s) => s.category && s.category === current.category);
  const rest = others.filter((s) => !sameCategory.includes(s));
  return [...sameCategory, ...rest].slice(0, 4);
}

function RelatedGrid({ services, style, accent, corner }: { services: Service[]; style: TemplateStyle; accent: string; corner?: string | null }) {
  if (services.length === 0) return null;
  return (
    <div className="mx-auto mt-20 max-w-6xl px-6">
      <SectionEyebrow accent={accent} show={style.showEyebrows}>
        Other services
      </SectionEyebrow>
      <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        {services.map((s) => (
          <Link key={s.id} to="/services/$slug" params={{ slug: s.slug }} className="group">
            <div className={`overflow-hidden ${corners(style, "lg", corner)}`} style={{ backgroundColor: `${accent}10` }}>
              {s.image_url ? (
                <ItemImage
                  path={s.image_url}
                  alt={s.name}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="aspect-square w-full" />
              )}
            </div>
            <p className={`mt-3 text-sm ${heading(style)}`}>{s.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{s.duration_minutes} min</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BookingCta({ style, accent, corner, business }: { style: TemplateStyle; accent: string; corner?: string | null; business: SiteBusiness }) {
  const bookable = business.business_types.includes("appointment");
  return (
    <Link
      to={bookable ? "/appointments" : "/contact"}
      className={ctaClass(style, corner)}
      style={{ backgroundColor: accent, color: "#fff" }}
    >
      {bookable ? "Book now" : "Request a quote"} →
    </Link>
  );
}

/** Service detail page — one per template, mirroring `product-detail.tsx`'s structure. Duration
 * and an optional price range are the two service-specific facts a product detail page doesn't
 * carry; everything else (CTA, related, empty-state discipline) follows the same rules. */
export function ServiceDetail({
  business,
  service,
  style,
  accent,
}: {
  business: SiteBusiness;
  service: Service;
  style: TemplateStyle;
  accent: string;
}) {
  const related = relatedServices(business.services, service);
  const corner = business.corner_style;
  const gallery = business.gallery_urls.slice(0, 3);

  if (style.id === "editorial") {
    return (
      <Reveal>
        <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-8 pt-16 md:grid-cols-[1.2fr_1fr] md:gap-20 md:pt-24">
          <div className={`overflow-hidden ${corners(style, "lg", corner)}`} style={{ backgroundColor: `${accent}10` }}>
            {service.image_url ? (
              <ItemImage path={service.image_url} alt={service.name} className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="aspect-[4/5] w-full" />
            )}
          </div>
          <div className="flex flex-col justify-center">
            {service.category && (
              <SectionEyebrow accent={accent} show>
                {service.category}
              </SectionEyebrow>
            )}
            <h1 className={`mt-4 text-4xl md:text-5xl ${heading(style)}`}>{service.name}</h1>
            <div className="mt-5 flex items-center gap-4 text-sm text-muted-foreground">
              {service.price != null && <span style={{ color: accent }}>From ₹{service.price}</span>}
              <span>{service.duration_minutes} min</span>
            </div>
            {service.description && <p className={`mt-6 whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{service.description}</p>}
            <div className="mt-9">
              <BookingCta style={style} accent={accent} corner={corner} business={business} />
            </div>
          </div>
        </section>
        <RelatedGrid services={related} style={style} accent={accent} corner={corner} />
      </Reveal>
    );
  }

  if (style.id === "modern-business") {
    return (
      <Reveal>
        <section className={`mx-auto max-w-6xl px-6 ${pad(style)}`}>
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            {service.image_url ? (
              <ItemImage path={service.image_url} alt={service.name} className={`aspect-[4/3] w-full object-cover ${corners(style, "lg", corner)}`} />
            ) : (
              <div className={`aspect-[4/3] w-full ${corners(style, "lg", corner)}`} style={{ backgroundColor: `${accent}14` }} />
            )}
            <div className={`border p-8 ${corners(style, "lg", corner)}`}>
              {service.category && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{service.category}</p>}
              <h1 className={`mt-2 text-3xl md:text-4xl ${heading(style)}`}>{service.name}</h1>
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                {service.price != null && (
                  <span className="text-lg font-semibold" style={{ color: accent }}>
                    ₹{service.price}
                  </span>
                )}
                <span>{service.duration_minutes} min</span>
              </div>
              {service.description && <p className={`mt-5 whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{service.description}</p>}
              <div className="mt-8">
                <BookingCta style={style} accent={accent} corner={corner} business={business} />
              </div>
            </div>
          </div>
        </section>
        <RelatedGrid services={related} style={style} accent={accent} corner={corner} />
      </Reveal>
    );
  }

  if (style.id === "catalogue") {
    return (
      <Reveal>
        <section className="px-6 pb-8 pt-14">
          <div className="mx-auto max-w-3xl text-center">
            {service.category && (
              <SectionEyebrow accent={accent} show>
                {service.category}
              </SectionEyebrow>
            )}
            <h1 className={`mt-3 text-4xl md:text-5xl ${heading(style)}`}>{service.name}</h1>
          </div>
          <div className={`mx-auto mt-10 max-w-3xl overflow-hidden ${corners(style, "lg", corner)}`} style={{ backgroundColor: `${accent}10` }}>
            {service.image_url ? (
              <ItemImage path={service.image_url} alt={service.name} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="aspect-[4/3] w-full" />
            )}
          </div>
          <div className="mx-auto mt-10 max-w-xl text-center">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              {service.price != null && (
                <span className="text-2xl font-semibold" style={{ color: accent }}>
                  ₹{service.price}
                </span>
              )}
              <span>{service.duration_minutes} min</span>
            </div>
            {service.description && <p className={`mt-4 whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{service.description}</p>}
            <div className="mt-8 flex justify-center">
              <BookingCta style={style} accent={accent} corner={corner} business={business} />
            </div>
          </div>
        </section>
        <RelatedGrid services={related} style={style} accent={accent} corner={corner} />
      </Reveal>
    );
  }

  if (style.id === "experience") {
    return (
      <Reveal>
        <section className="relative flex min-h-[55vh] items-end overflow-hidden">
          {service.image_url ? (
            <ItemImage path={service.image_url} alt={service.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: `${accent}22` }} />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent, ${accent}CC)` }} />
          <div className="relative mx-auto w-full max-w-4xl px-6 pb-14 pt-32">
            {service.category && <p className="text-xs uppercase tracking-[0.14em] text-white/80">{service.category}</p>}
            <h1 className={`mt-3 text-4xl text-white md:text-6xl ${heading(style)}`}>{service.name}</h1>
          </div>
        </section>
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <div className="flex items-center justify-center gap-4 text-muted-foreground">
            {service.price != null && (
              <span className="text-2xl" style={{ color: accent }}>
                ₹{service.price}
              </span>
            )}
            <span>{service.duration_minutes} min</span>
          </div>
          {service.description && (
            <p className={`mx-auto mt-4 max-w-xl whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{service.description}</p>
          )}
          <div className="mt-8 flex justify-center">
            <BookingCta style={style} accent={accent} corner={corner} business={business} />
          </div>
        </div>
        {gallery.length > 0 && (
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-3 px-6 pb-16">
            {gallery.map((g, i) => (
              <ItemImage key={i} path={g} alt="" className={`aspect-square w-full object-cover ${corners(style, "lg", corner)}`} />
            ))}
          </div>
        )}
        <RelatedGrid services={related} style={style} accent={accent} corner={corner} />
      </Reveal>
    );
  }

  // story
  return (
    <Reveal>
      <section className="mx-auto max-w-2xl px-6 pb-8 pt-20 text-center">
        {service.category && <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{service.category}</p>}
        <h1 className={`mt-4 text-4xl md:text-6xl ${heading(style)}`}>{service.name}</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          {service.price != null ? `₹${service.price} · ` : ""}
          {service.duration_minutes} min
        </p>
      </section>
      <div className="mx-auto mt-4 max-w-3xl px-6">
        {service.image_url ? (
          <ItemImage path={service.image_url} alt={service.name} className={`aspect-[16/10] w-full object-cover ${corners(style, "lg", corner)}`} />
        ) : (
          <div className={`aspect-[16/10] w-full border ${corners(style, "lg", corner)}`} />
        )}
      </div>
      {service.description && (
        <p className={`mx-auto mt-10 max-w-xl whitespace-pre-line text-center text-muted-foreground ${style.bodyClass}`}>{service.description}</p>
      )}
      <div className="mt-9 flex justify-center">
        <BookingCta style={style} accent={accent} corner={corner} business={business} />
      </div>
      <RelatedGrid services={related} style={style} accent={accent} corner={corner} />
    </Reveal>
  );
}
