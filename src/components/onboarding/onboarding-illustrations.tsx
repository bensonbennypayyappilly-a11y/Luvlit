import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  Camera,
  CalendarCheck,
  Chrome,
  Gift,
  Globe,
  Image as ImageIcon,
  Link2,
  Mail,
  MapPin,
  Palette,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Video,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Instagram } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand-icons";
import { INDIA_OUTLINE_PATH } from "@/components/india-discovery-map";

/**
 * Shared visual language for every onboarding illustration: a soft gradient stage with two
 * blurred colour blobs behind, a white "hero" card in the middle, and 2–3 smaller accent cards
 * gently floating around it. Nine different icon sets built from this one system read as the
 * same designer's work, rather than nine unrelated pieces of art — and it's pure SVG/CSS/Tailwind,
 * so there's nothing to fetch and nothing that can 404.
 */
function IllustrationStage({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent-soft via-[#fdfbf5] to-white sm:aspect-square">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-14 -top-14 size-56 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -right-10 size-64 rounded-full bg-foreground/5 blur-3xl"
      />
      <div className="relative flex h-full w-full items-center justify-center p-10">{children}</div>
    </div>
  );
}

const CARD_SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "size-12",
  md: "size-16",
  lg: "size-28",
};
const ICON_SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "size-5",
  md: "size-6",
  lg: "size-11",
};

function FloatingCard({
  icon: Icon,
  style,
  size = "md",
  delay = 0,
  tone = "primary",
}: {
  icon: LucideIcon;
  style?: CSSProperties;
  size?: "sm" | "md" | "lg";
  delay?: number;
  tone?: "primary" | "neutral";
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`absolute flex ${CARD_SIZE[size]} items-center justify-center rounded-2xl border border-white bg-white shadow-[0_20px_45px_-24px_rgba(31,60,47,0.35)] ${
        tone === "primary" ? "text-primary" : "text-muted-foreground"
      }`}
      style={style}
      animate={reduced ? undefined : { y: [0, -8, 0] }}
      transition={reduced ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <Icon className={ICON_SIZE[size]} strokeWidth={size === "lg" ? 1.3 : 1.6} aria-hidden="true" />
    </motion.div>
  );
}

type Accent = { icon: LucideIcon; style: CSSProperties; size?: "sm" | "md"; tone?: "primary" | "neutral" };

/** Icon-based hero + a scattering of accent cards — the default composition every screen uses
 * unless it needs a genuinely custom centrepiece (the India outline, a phone, a browser). */
function IconScene({ hero, accents }: { hero: LucideIcon; accents: Accent[] }) {
  const Hero = hero;
  return (
    <IllustrationStage>
      <div className={`flex ${CARD_SIZE.lg} items-center justify-center rounded-[1.75rem] border border-white bg-white text-primary shadow-[0_28px_60px_-28px_rgba(31,60,47,0.4)]`}>
        <Hero className={ICON_SIZE.lg} strokeWidth={1.3} aria-hidden="true" />
      </div>
      {accents.map((a, i) => (
        <FloatingCard key={i} icon={a.icon} style={a.style} size={a.size} tone={a.tone} delay={i * 0.7} />
      ))}
    </IllustrationStage>
  );
}

/** Screen 1 — "What's your business called?" A storefront is the clearest single symbol for
 * "your business starts here," with a sparkle for polish and a building for permanence. */
export function NameStepArt() {
  return (
    <IconScene
      hero={Store}
      accents={[
        { icon: Sparkles, style: { top: "12%", right: "10%" } },
        { icon: Building2, style: { bottom: "16%", left: "8%" }, tone: "neutral" },
      ]}
    />
  );
}

/** Screen 2 — "What do you do?" Bags and gifts read as "variety of small-business goods"
 * without pinning the illustration to any one category. */
export function CategoriesStepArt() {
  return (
    <IconScene
      hero={ShoppingBag}
      accents={[
        { icon: Gift, style: { top: "10%", left: "12%" } },
        { icon: Sparkles, style: { bottom: "14%", right: "10%" }, tone: "neutral" },
      ]}
    />
  );
}

/** Screen 3 — "How do customers buy from you?" One composition carrying all three business
 * types at once: cart (products), calendar (appointments), wand (bespoke/custom). */
export function TypeStepArt() {
  return (
    <IconScene
      hero={ShoppingCart}
      accents={[
        { icon: CalendarCheck, style: { top: "10%", right: "8%" } },
        { icon: Wand2, style: { bottom: "12%", left: "10%" }, tone: "neutral" },
      ]}
    />
  );
}

/** Screen 4 — "Where are you based?" A large pin drop over a small building reads as "your
 * place on the map" more clearly than a literal map render would at this size. */
export function LocationStepArt() {
  return (
    <IconScene
      hero={MapPin}
      accents={[
        { icon: Building2, style: { bottom: "14%", right: "10%" } },
        { icon: Store, style: { top: "14%", left: "10%" }, tone: "neutral" },
      ]}
    />
  );
}

/** Screen 5 — "Where do you deliver or serve?" Reuses the exact India outline already
 * established elsewhere in the app (the homepage discovery map), so this stays visually
 * consistent with the rest of LuvLit rather than introducing a second, different map shape. */
export function DeliveryStepArt() {
  const reduced = useReducedMotion();
  return (
    <IllustrationStage>
      <motion.svg
        viewBox="0 0 666.66669 777.33331"
        className="h-full max-h-64 w-auto"
        animate={reduced ? undefined : { scale: [1, 1.015, 1] }}
        transition={reduced ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <path d={INDIA_OUTLINE_PATH} fill="#FFFFFF" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" />
      </motion.svg>
      <FloatingCard icon={Truck} style={{ bottom: "12%", left: "10%" }} delay={0} />
      <FloatingCard icon={MapPin} style={{ top: "12%", right: "12%" }} tone="neutral" delay={0.7} />
    </IllustrationStage>
  );
}

/** Screen 6 — "How can people reach you?" A simple phone silhouette carries the four real
 * contact-channel marks (their actual brand glyphs, not generic stand-ins) around it. */
export function ContactStepArt() {
  const reduced = useReducedMotion();
  return (
    <IllustrationStage>
      <motion.div
        className="flex h-40 w-24 items-center justify-center rounded-[1.5rem] border border-white bg-white shadow-[0_28px_60px_-28px_rgba(31,60,47,0.4)]"
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={reduced ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="size-2 rounded-full bg-accent-soft" aria-hidden="true" />
      </motion.div>
      <motion.span
        className="absolute flex size-11 items-center justify-center rounded-2xl border border-white bg-white text-[#25D366] shadow-[0_20px_45px_-24px_rgba(31,60,47,0.35)]"
        style={{ top: "14%", left: "10%" }}
        animate={reduced ? undefined : { y: [0, -8, 0] }}
        transition={reduced ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0 }}
      >
        <WhatsAppIcon className="size-5" />
      </motion.span>
      <FloatingCard icon={Instagram} style={{ top: "10%", right: "12%" }} delay={0.6} />
      <FloatingCard icon={Mail} style={{ bottom: "16%", left: "6%" }} tone="neutral" delay={1.2} />
      <FloatingCard icon={Globe} style={{ bottom: "10%", right: "8%" }} tone="neutral" delay={1.8} />
    </IllustrationStage>
  );
}

/** Screen 7 — "Add your photos & videos." Deliberately restrained — this stage sits directly
 * above the actual upload controls, so it should not compete with them for attention. */
export function MediaStepArt() {
  return (
    <IconScene
      hero={Camera}
      accents={[
        { icon: ImageIcon, style: { top: "10%", right: "10%" } },
        { icon: Video, style: { bottom: "14%", left: "10%" }, tone: "neutral" },
      ]}
    />
  );
}

/** Screen 8 — "Make your page yours." A small page mockup (title bar + text lines) with a
 * row of colour dots underneath — literally "pick a colour for your page." */
export function ColorStepArt() {
  const reduced = useReducedMotion();
  const swatches = ["#1C1917", "#20463A", "#26384F", "#9C5B44"];
  return (
    <IllustrationStage>
      <motion.div
        className="flex w-40 flex-col gap-2.5 rounded-[1.25rem] border border-white bg-white p-4 shadow-[0_28px_60px_-28px_rgba(31,60,47,0.4)]"
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={reduced ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="h-2.5 w-3/4 rounded-full bg-primary/70" />
        <div className="h-2 w-full rounded-full bg-secondary" />
        <div className="h-2 w-5/6 rounded-full bg-secondary" />
        <div className="mt-1 flex gap-1.5">
          {swatches.map((c) => (
            <span key={c} className="size-3.5 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </div>
      </motion.div>
      <FloatingCard icon={Palette} style={{ top: "12%", right: "10%" }} delay={0.5} />
      <FloatingCard icon={Sparkles} style={{ bottom: "12%", left: "8%" }} tone="neutral" delay={1.1} />
    </IllustrationStage>
  );
}

/** Screen 9 — "Connect your domain." A small browser-window mockup with an address bar reads
 * unambiguously as "your website's own address," reinforced by the globe/link accents. */
export function DomainStepArt() {
  const reduced = useReducedMotion();
  return (
    <IllustrationStage>
      <motion.div
        className="w-48 overflow-hidden rounded-[1.25rem] border border-white bg-white shadow-[0_28px_60px_-28px_rgba(31,60,47,0.4)]"
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={reduced ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-secondary/60 px-3 py-2">
          <span className="size-1.5 rounded-full bg-foreground/20" />
          <span className="size-1.5 rounded-full bg-foreground/20" />
          <span className="size-1.5 rounded-full bg-foreground/20" />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-3">
          <Globe className="size-3.5 shrink-0 text-primary" strokeWidth={1.6} aria-hidden="true" />
          <span className="h-2 flex-1 rounded-full bg-secondary" />
        </div>
      </motion.div>
      <FloatingCard icon={Link2} style={{ top: "12%", right: "10%" }} delay={0.5} />
      <FloatingCard icon={Chrome} style={{ bottom: "16%", left: "8%" }} tone="neutral" delay={1.1} />
      <FloatingCard icon={BadgeCheck} style={{ bottom: "8%", right: "6%" }} delay={1.7} />
    </IllustrationStage>
  );
}
