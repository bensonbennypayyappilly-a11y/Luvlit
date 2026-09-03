import type { SectionPreviewShape } from "@/lib/website-sections";

/**
 * A small composition sketch shown next to a section in the "Add Section" picker (§12) — real
 * visual information about the section's shape (a full-bleed banner vs. a grid vs. a list of
 * links), not a decorative icon. One shared component per shape family, not a bespoke mockup per
 * section type (29 of those would be a maintenance burden for marginal extra clarity).
 */
export function SectionPreviewIcon({ shape }: { shape: SectionPreviewShape }) {
  const stroke = "#C9C4B8";
  const fill = "#EFECE3";
  const common = { width: 34, height: 24, viewBox: "0 0 34 24", "aria-hidden": true as const };

  switch (shape) {
    case "hero":
      return (
        <svg {...common}>
          <rect x="1" y="1" width="32" height="22" rx="2" fill={fill} stroke={stroke} />
          <rect x="10" y="9" width="14" height="2" rx="1" fill={stroke} />
          <rect x="13" y="14" width="8" height="2" rx="1" fill={stroke} />
        </svg>
      );
    case "split":
      return (
        <svg {...common}>
          <rect x="1" y="1" width="14" height="22" rx="2" fill={fill} stroke={stroke} />
          <rect x="19" y="4" width="14" height="2" rx="1" fill={stroke} />
          <rect x="19" y="9" width="14" height="1.5" rx="0.75" fill={stroke} opacity="0.6" />
          <rect x="19" y="13" width="10" height="1.5" rx="0.75" fill={stroke} opacity="0.6" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="1" y="1" width="9.3" height="22" rx="1.5" fill={fill} stroke={stroke} />
          <rect x="12.3" y="1" width="9.3" height="22" rx="1.5" fill={fill} stroke={stroke} />
          <rect x="23.6" y="1" width="9.3" height="22" rx="1.5" fill={fill} stroke={stroke} />
        </svg>
      );
    case "text":
      return (
        <svg {...common}>
          <rect x="1" y="3" width="20" height="2" rx="1" fill={stroke} />
          <rect x="1" y="9" width="32" height="1.5" rx="0.75" fill={stroke} opacity="0.6" />
          <rect x="1" y="13" width="32" height="1.5" rx="0.75" fill={stroke} opacity="0.6" />
          <rect x="1" y="17" width="22" height="1.5" rx="0.75" fill={stroke} opacity="0.6" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <circle cx="3" cy="4" r="1.5" fill={stroke} />
          <rect x="7" y="3" width="20" height="2" rx="1" fill={stroke} opacity="0.7" />
          <circle cx="3" cy="12" r="1.5" fill={stroke} />
          <rect x="7" y="11" width="24" height="2" rx="1" fill={stroke} opacity="0.7" />
          <circle cx="3" cy="20" r="1.5" fill={stroke} />
          <rect x="7" y="19" width="16" height="2" rx="1" fill={stroke} opacity="0.7" />
        </svg>
      );
    case "cta":
      return (
        <svg {...common}>
          <rect x="1" y="1" width="32" height="22" rx="2" fill={fill} stroke={stroke} />
          <rect x="8" y="8" width="18" height="1.75" rx="0.875" fill={stroke} />
          <rect x="12" y="14" width="10" height="4" rx="2" fill={stroke} />
        </svg>
      );
    case "media":
      return (
        <svg {...common}>
          <rect x="1" y="1" width="32" height="22" rx="2" fill={fill} stroke={stroke} />
          <path d="M14 8.5 L21 12 L14 15.5 Z" fill={stroke} />
        </svg>
      );
    case "cards":
      return (
        <svg {...common}>
          <rect x="1" y="1" width="9.3" height="22" rx="1.5" fill="none" stroke={stroke} />
          <rect x="12.3" y="1" width="9.3" height="22" rx="1.5" fill="none" stroke={stroke} />
          <rect x="23.6" y="1" width="9.3" height="22" rx="1.5" fill="none" stroke={stroke} />
          <rect x="2.5" y="4" width="6.3" height="1.5" rx="0.75" fill={stroke} />
          <rect x="13.8" y="4" width="6.3" height="1.5" rx="0.75" fill={stroke} />
          <rect x="25.1" y="4" width="6.3" height="1.5" rx="0.75" fill={stroke} />
        </svg>
      );
    case "spotlight":
      return (
        <svg {...common}>
          <rect x="1" y="1" width="32" height="16" rx="2" fill={fill} stroke={stroke} />
          <rect x="8" y="19" width="18" height="2" rx="1" fill={stroke} />
        </svg>
      );
    case "collage":
      return (
        <svg {...common}>
          <rect x="1" y="4" width="15" height="16" rx="1.5" fill={fill} stroke={stroke} />
          <rect x="15" y="1" width="12" height="10" rx="1.5" fill={fill} stroke={stroke} />
          <rect x="19" y="13" width="14" height="10" rx="1.5" fill={fill} stroke={stroke} />
        </svg>
      );
    case "timeline":
      return (
        <svg {...common}>
          <line x1="4" y1="2" x2="4" y2="22" stroke={stroke} strokeWidth="1.5" />
          <circle cx="4" cy="4" r="2" fill={stroke} />
          <rect x="10" y="3" width="20" height="2" rx="1" fill={stroke} opacity="0.7" />
          <circle cx="4" cy="12" r="2" fill={stroke} />
          <rect x="10" y="11" width="16" height="2" rx="1" fill={stroke} opacity="0.7" />
          <circle cx="4" cy="20" r="2" fill={stroke} />
          <rect x="10" y="19" width="18" height="2" rx="1" fill={stroke} opacity="0.7" />
        </svg>
      );
  }
}
