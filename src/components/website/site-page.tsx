import { SiteChrome } from "@/components/website/site-chrome";
import { PageHeader } from "@/components/website/page-header";
import { PreviewMode, SectionRenderer } from "@/components/website/section-renderer";
import { resolveSections, sectionsForPage, type PageId } from "@/lib/website-pages";
import { templateStyle } from "@/lib/website-templates";
import type { SiteBusiness } from "@/lib/website-site-types";

/** Banner copy per inner page. Home is excluded — it opens with the hero section instead. */
const PAGE_HEADERS: Record<Exclude<PageId, "home">, { eyebrow: string; title: string }> = {
  about: { eyebrow: "Our story", title: "About" },
  products: { eyebrow: "Catalogue", title: "Products" },
  services: { eyebrow: "What we offer", title: "Services" },
  gallery: { eyebrow: "Our work", title: "Gallery" },
  appointments: { eyebrow: "Appointments", title: "Book a time" },
  contact: { eyebrow: "Get in touch", title: "Contact" },
};

/**
 * One page of a business's public website — nav, page banner, that page's sections, footer.
 * The single rendering path for every page: the published routes (/, /about, /products, …) and
 * the website builder's live preview pane both go through here, so what an owner previews is
 * literally the same components the public gets, and the two can't drift apart.
 *
 * `preview` only changes what an owner sees while editing — placeholders for empty sections, and
 * suppressing the floating contact button (its `position: fixed` would otherwise escape the
 * builder's small preview mockup) — never what the published site itself renders.
 */
export function BusinessSitePage({
  business,
  page,
  preview = false,
}: {
  business: SiteBusiness;
  page: PageId;
  preview?: boolean;
}) {
  // Literal hex (not a --color-primary var()) because this value has hex-alpha suffixes
  // appended in section-renderer.tsx (e.g. `${accent}33`) for overlay gradients — var() can't.
  const accent = business.brand_accent_color || "#4F46E5";
  const style = templateStyle(business.template);
  const sections = sectionsForPage(resolveSections(business), page, style.id);
  const header = page === "home" ? null : PAGE_HEADERS[page];

  const body = (
    <SiteChrome business={business} style={style} accent={accent} currentPage={page} preview={preview}>
      {header && <PageHeader eyebrow={header.eyebrow} title={header.title} style={style} accent={accent} />}
      <main>
        <SectionRenderer business={business} sections={sections} style={style} accent={accent} page={page} />
      </main>
    </SiteChrome>
  );

  return preview ? <PreviewMode>{body}</PreviewMode> : body;
}
