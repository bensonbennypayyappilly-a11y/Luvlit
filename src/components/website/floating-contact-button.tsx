import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Instagram, Mail, MessageCircle, X } from "lucide-react";
import type { SiteBusiness } from "@/lib/website-site-types";

const WHATSAPP_MESSAGE = "Hi, I found your business on LuvLit and would like to know more.";

type ContactLink = {
  key: string;
  href: string;
  label: string;
  icon: typeof Instagram;
  background: string;
};

/**
 * Floating "contact us" button fixed to the bottom-right of every business site page. Expands
 * into whichever of WhatsApp/Instagram/Email the business actually saved — purely a convenience
 * layer over their own profile data, never a link to something that doesn't exist. Renders
 * nothing at all if none of the three are set.
 */
export function FloatingContactButton({ business, accent }: { business: SiteBusiness; accent: string }) {
  const [open, setOpen] = useState(false);

  const links: ContactLink[] = [];
  if (business.whatsapp) {
    links.push({
      key: "whatsapp",
      href: `https://wa.me/${business.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
      label: "Chat on WhatsApp",
      icon: MessageCircle,
      background: "#25D366",
    });
  }
  if (business.instagram_url) {
    links.push({
      key: "instagram",
      href: business.instagram_url,
      label: "Open Instagram",
      icon: Instagram,
      background: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)",
    });
  }
  if (business.contact_email) {
    links.push({
      key: "email",
      href: `mailto:${business.contact_email}`,
      label: "Send an email",
      icon: Mail,
      background: accent,
    });
  }

  if (links.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col-reverse items-end gap-3">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close contact options" : "Contact us"}
        aria-expanded={open}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl"
        style={{ backgroundColor: accent }}
      >
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }} className="flex">
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <MessageCircle className="h-6 w-6" aria-hidden="true" />}
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open &&
          links.map((link, i) => (
            <motion.a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              title={link.label}
              aria-label={link.label}
              initial={{ opacity: 0, y: 14, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.8 }}
              transition={{ duration: 0.18, delay: i * 0.05, ease: "easeOut" }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
              style={{ background: link.background }}
            >
              <link.icon className="h-5 w-5" aria-hidden="true" />
            </motion.a>
          ))}
      </AnimatePresence>
    </div>
  );
}
