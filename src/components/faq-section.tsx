import { useState } from "react";
import { PLANS } from "@/lib/constants";

const FAQS: { audience: string; items: { q: string; a: string }[] }[] = [
  {
    audience: "For customers",
    items: [
      {
        q: "What is LuvLit?",
        a: "A discovery platform for local businesses across India — search by what you need and where you are, then book, message or get a quote directly from the business.",
      },
      {
        q: "How do I find businesses in my city?",
        a: "Choose your city in the search bar on the homepage, or open the Cities page. Results include businesses located in your city, plus those that deliver or serve there.",
      },
      {
        q: "Can I request quotes?",
        a: "Yes — post a requirement: pick a category, describe what you need, set your city and an optional budget. We match it to live businesses who cover your location, and they reply with quotes in your inbox.",
      },
      {
        q: "Do I need an account?",
        a: "No. You can book an appointment as a guest with just your name and phone number. An account is only needed if you want to chat with a business, save favourites, or keep a history of your quotes.",
      },
    ],
  },
  {
    audience: "For businesses",
    items: [
      {
        q: "How much does it cost?",
        a: `Listing is completely free until 30 November. After that, it's ₹${PLANS.base.introPrice} for your first month, then ₹${PLANS.base.price}/month.`,
      },
      {
        q: "How do I list my business?",
        a: "Sign up as a business, add your details, photos and categories, and your page goes live in minutes — no developer needed.",
      },
      {
        q: "Can I list multiple locations?",
        a: "Yes. You can add multiple branches with their own addresses, select several categories, and set a delivery area by city or across all of India.",
      },
      {
        q: "How do leads work?",
        a: "Customers post requirements describing what they need. If it matches your category and location, you're notified instantly and can respond directly with a quote.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 text-left"
      >
        <span className="text-sm font-medium">{q}</span>
        <span
          aria-hidden
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      {open && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  );
}

export function FaqSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <p className="eyebrow">FAQ</p>
      <h2 className="mt-3 text-3xl md:text-4xl">Frequently asked questions</h2>

      <div className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
        {FAQS.map((group) => (
          <div key={group.audience}>
            <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {group.audience}
            </h3>
            <div className="mt-2">
              {group.items.map((item) => (
                <FaqItem key={item.q} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
