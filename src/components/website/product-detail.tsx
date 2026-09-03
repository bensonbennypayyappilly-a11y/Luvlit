import { Link } from "@tanstack/react-router";
import { EcoBadge } from "@/components/eco-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { Reveal } from "@/components/reveal";
import { SectionEyebrow } from "@/components/website/media";
import { corners, CtaButton, heading, imageFilterClass, ItemImage, pad } from "@/components/website/section-renderer";
import type { TemplateStyle } from "@/lib/website-templates";
import type { SiteBusiness } from "@/lib/website-site-types";

type Item = SiteBusiness["items"][number];

/** Up to 4 other active products from the same business, same category first. Never fabricated —
 * omitted entirely (§35) when there's nothing else to show. */
function relatedItems(all: Item[], current: Item): Item[] {
  const others = all.filter((i) => i.id !== current.id && i.is_active);
  const sameCategory = others.filter((i) => i.category && i.category === current.category);
  const rest = others.filter((i) => !sameCategory.includes(i));
  return [...sameCategory, ...rest].slice(0, 4);
}

function RelatedGrid({
  items,
  style,
  accent,
  corner,
  imageTreatment,
}: {
  items: Item[];
  style: TemplateStyle;
  accent: string;
  corner?: string | null;
  imageTreatment?: string | null;
}) {
  if (items.length === 0) return null;
  const filter = imageFilterClass(imageTreatment);
  return (
    <div className="mx-auto mt-20 max-w-6xl px-6">
      <SectionEyebrow accent={accent} show={style.showEyebrows}>
        You may also like
      </SectionEyebrow>
      <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        {items.map((item) => (
          <Link key={item.id} to="/products/$slug" params={{ slug: item.slug }} className="group">
            <div className={`overflow-hidden ${corners(style, "lg", corner)}`} style={{ backgroundColor: `${accent}10` }}>
              {item.image_url ? (
                <ItemImage
                  path={item.image_url}
                  alt={item.name}
                  className={`aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105 ${filter}`}
                />
              ) : (
                <div className="aspect-square w-full" />
              )}
            </div>
            <p className={`mt-3 text-sm ${heading(style)}`}>{item.name}</p>
            {item.price != null && <p className="mt-0.5 text-sm text-muted-foreground">₹{item.price}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function EnquireCta({
  style,
  accent,
  corner,
  buttonStyle,
  label,
}: {
  style: TemplateStyle;
  accent: string;
  corner?: string | null;
  buttonStyle?: string | null;
  label: string;
}) {
  return (
    <CtaButton href="/contact" accent={accent} style={style} cornerOverride={corner} buttonStyle={buttonStyle}>
      {label} →
    </CtaButton>
  );
}

/**
 * Product detail page — one per template, genuinely different composition (not just re-skinned).
 * No purchase flow anywhere: the CTA always routes to Contact, matching every other lead-gen
 * touchpoint on the site. Items carry a single image today, so "immersive gallery" templates lean
 * on the business's own gallery photos (real data, never invented) for supporting visuals.
 */
export function ProductDetail({
  business,
  item,
  style,
  accent,
}: {
  business: SiteBusiness;
  item: Item;
  style: TemplateStyle;
  accent: string;
}) {
  const related = relatedItems(business.items, item);
  const corner = business.corner_style;
  const buttonStyle = business.button_style;
  const filter = imageFilterClass(business.image_treatment);
  const gallery = business.gallery_urls.slice(0, 3);

  if (style.id === "editorial") {
    return (
      <Reveal>
        <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-8 pt-16 md:grid-cols-[1.2fr_1fr] md:gap-20 md:pt-24">
          <div className={`overflow-hidden ${corners(style, "lg", corner)}`} style={{ backgroundColor: `${accent}10` }}>
            {item.image_url ? (
              <ItemImage path={item.image_url} alt={item.name} className={`aspect-[4/5] w-full object-cover ${filter}`} />
            ) : (
              <div className="aspect-[4/5] w-full" />
            )}
          </div>
          <div className="flex flex-col justify-center">
            {item.category && (
              <SectionEyebrow accent={accent} show>
                {item.category}
              </SectionEyebrow>
            )}
            <h1 className={`mt-4 text-4xl md:text-5xl ${heading(style)}`}>{item.name}</h1>
            {item.price != null && (
              <p className="mt-5 text-2xl" style={{ color: accent }}>
                ₹{item.price}
              </p>
            )}
            {item.description && <p className={`mt-6 whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{item.description}</p>}
            <div className="mt-9 flex items-center gap-3">
              <EnquireCta style={style} accent={accent} corner={corner} buttonStyle={buttonStyle} label="Enquire" />
              <FavoriteButton businessId={business.id} />
            </div>
          </div>
        </section>
        <RelatedGrid items={related} style={style} accent={accent} corner={corner} imageTreatment={business.image_treatment} />
      </Reveal>
    );
  }

  if (style.id === "modern-business") {
    return (
      <Reveal>
        <section className={`mx-auto max-w-6xl px-6 ${pad(style)}`}>
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            {item.image_url ? (
              <ItemImage path={item.image_url} alt={item.name} className={`aspect-[4/3] w-full object-cover ${corners(style, "lg", corner)} ${filter}`} />
            ) : (
              <div className={`aspect-[4/3] w-full ${corners(style, "lg", corner)}`} style={{ backgroundColor: `${accent}14` }} />
            )}
            <div className={`border p-8 ${corners(style, "lg", corner)}`}>
              {item.category && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.category}</p>}
              <h1 className={`mt-2 text-3xl md:text-4xl ${heading(style)}`}>{item.name}</h1>
              {item.price != null && <p className="mt-3 text-xl font-semibold" style={{ color: accent }}>₹{item.price}</p>}
              {item.description && <p className={`mt-5 whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{item.description}</p>}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <EnquireCta style={style} accent={accent} corner={corner} buttonStyle={buttonStyle} label="Request a quote" />
                <FavoriteButton businessId={business.id} />
              </div>
            </div>
          </div>
        </section>
        <RelatedGrid items={related} style={style} accent={accent} corner={corner} imageTreatment={business.image_treatment} />
      </Reveal>
    );
  }

  if (style.id === "catalogue") {
    return (
      <Reveal>
        <section className="px-6 pb-8 pt-14">
          <div className="mx-auto max-w-3xl text-center">
            {item.category && (
              <SectionEyebrow accent={accent} show>
                {item.category}
              </SectionEyebrow>
            )}
            <h1 className={`mt-3 text-4xl md:text-5xl ${heading(style)}`}>{item.name}</h1>
          </div>
          <div className={`mx-auto mt-10 max-w-3xl overflow-hidden ${corners(style, "lg", corner)}`} style={{ backgroundColor: `${accent}10` }}>
            {item.image_url ? (
              <ItemImage path={item.image_url} alt={item.name} className={`aspect-[4/3] w-full object-cover ${filter}`} />
            ) : (
              <div className="aspect-[4/3] w-full" />
            )}
          </div>
          <div className="mx-auto mt-10 max-w-xl text-center">
            {item.price != null && (
              <p className="text-2xl font-semibold" style={{ color: accent }}>
                ₹{item.price}
              </p>
            )}
            {item.description && <p className={`mt-4 whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{item.description}</p>}
            <div className="mt-8 flex items-center justify-center gap-3">
              <EnquireCta style={style} accent={accent} corner={corner} buttonStyle={buttonStyle} label="Ask about this" />
              <FavoriteButton businessId={business.id} />
            </div>
          </div>
        </section>
        <RelatedGrid items={related} style={style} accent={accent} corner={corner} imageTreatment={business.image_treatment} />
      </Reveal>
    );
  }

  if (style.id === "experience") {
    return (
      <Reveal>
        <section className="relative flex min-h-[55vh] items-end overflow-hidden">
          {item.image_url ? (
            <ItemImage path={item.image_url} alt={item.name} className={`absolute inset-0 h-full w-full object-cover ${filter}`} />
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: `${accent}22` }} />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent, ${accent}CC)` }} />
          <div className="relative mx-auto w-full max-w-4xl px-6 pb-14 pt-32">
            {item.category && <p className="text-xs uppercase tracking-[0.14em] text-white/80">{item.category}</p>}
            <h1 className={`mt-3 text-4xl text-white md:text-6xl ${heading(style)}`}>{item.name}</h1>
          </div>
        </section>
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          {item.price != null && (
            <p className="text-2xl" style={{ color: accent }}>
              ₹{item.price}
            </p>
          )}
          {item.description && <p className={`mx-auto mt-4 max-w-xl whitespace-pre-line text-muted-foreground ${style.bodyClass}`}>{item.description}</p>}
          <div className="mt-8 flex items-center justify-center gap-3">
            <EnquireCta style={style} accent={accent} corner={corner} buttonStyle={buttonStyle} label="Enquire" />
            <FavoriteButton businessId={business.id} />
          </div>
        </div>
        {gallery.length > 0 && (
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-3 px-6 pb-16">
            {gallery.map((g, i) => (
              <ItemImage key={i} path={g} alt="" className={`aspect-square w-full object-cover ${corners(style, "lg", corner)} ${filter}`} />
            ))}
          </div>
        )}
        <RelatedGrid items={related} style={style} accent={accent} corner={corner} imageTreatment={business.image_treatment} />
      </Reveal>
    );
  }

  // story
  return (
    <Reveal>
      <section className="mx-auto max-w-2xl px-6 pb-8 pt-20 text-center">
        {item.category && <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.category}</p>}
        <h1 className={`mt-4 text-4xl md:text-6xl ${heading(style)}`}>{item.name}</h1>
        {item.price != null && <p className="mt-5 text-lg text-muted-foreground">₹{item.price}</p>}
      </section>
      <div className="mx-auto mt-4 max-w-3xl px-6">
        {item.image_url ? (
          <ItemImage path={item.image_url} alt={item.name} className={`aspect-[16/10] w-full object-cover ${corners(style, "lg", corner)} ${filter}`} />
        ) : (
          <div className={`aspect-[16/10] w-full border ${corners(style, "lg", corner)}`} />
        )}
      </div>
      {item.description && (
        <p className={`mx-auto mt-10 max-w-xl whitespace-pre-line text-center text-muted-foreground ${style.bodyClass}`}>{item.description}</p>
      )}
      <div className="mt-9 flex items-center justify-center gap-3">
        <EnquireCta style={style} accent={accent} corner={corner} buttonStyle={buttonStyle} label="Get in touch" />
        <FavoriteButton businessId={business.id} />
      </div>
      <RelatedGrid items={related} style={style} accent={accent} corner={corner} imageTreatment={business.image_treatment} />
    </Reveal>
  );
}
