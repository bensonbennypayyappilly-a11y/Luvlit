import { useState } from "react";

const FAQS: { audience: string; items: { q: string; a: string }[] }[] = [
  {
    audience: "For customers",
    items: [
      {
        q: "Is it free to browse and contact businesses?",
        a: "Yes. Browsing, searching, booking appointments and messaging businesses on LuvLit is completely free for customers, and always will be.",
      },
      {
        q: "Do I need an account to book an appointment?",
        a: "No. You can book an appointment as a guest with just your name and phone number. An account is only needed if you want to chat with a business, save favourites, or keep a history of your quotes.",
      },
      {
        q: "How do I get quotes from multiple businesses for something custom?",
        a: "Post a requirement: pick a category, describe what you need, set your city and an optional budget, and attach up to three photos. We match it to live businesses in that category who cover your location, and they reply with quotes in your inbox.",
      },
      {
        q: "How do I find businesses in my city?",
        a: "Choose your city in the search bar on the homepage, or open the Cities page. Results include businesses located in your city, plus those that deliver or serve there.",
      },
    ],
  },
  {
    audience: "For businesses",
    items: [
      {
        q: "How much does it cost to list my business?",
        a: "Listing is completely free for every business until 30 November. Your page, appointments, leads and chat are all included.",
      },
      {
        q: "What happens after the free period ends?",
        a: "If your subscription starts after 30 November, your first billing month is ₹20, then ₹199 per month from the second month onwards. Yearly billing is available at a two-months-free equivalent discount.",
      },
      {
        q: "Can I list more than one location or category?",
        a: "Yes. You can add multiple branches with their own addresses, select several categories (or suggest a new one), and set a delivery area by city or across all of India.",
      },
      {
        q: "How does Featured placement work?",
        a: "Featured placement pins your business to the top of a category in a chosen city (₹499/month) or across all of India (₹999/month). Slots are capped per category and location, so the spotlight stays scarce and worth having.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="surface-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-6 p-7 text-left"
      >
        <span className="text-base">{q}</span>
        <span
          aria-hidden
          className={`mt-1 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      {open && <p className="px-7 pb-7 text-sm leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  );
}

export function FaqSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="hairline pt-14">
        <p className="eyebrow">Questions</p>
        <h2 className="mt-3 text-3xl md:text-4xl">Frequently asked</h2>
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {FAQS.map((group) => (
          <div key={group.audience}>
            <h3 className="font-sans text-xs font-medium uppercase tracking-[0.16em] text-foreground">
              {group.audience}
            </h3>
            <div className="mt-5 space-y-3">
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
