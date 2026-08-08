import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://luvlt.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/browse", changefreq: "daily", priority: "0.9" },
          { path: "/events", changefreq: "daily", priority: "0.8" },
          { path: "/cities", changefreq: "weekly", priority: "0.7" },
          { path: "/pricing", changefreq: "monthly", priority: "0.7" },
          { path: "/influencer", changefreq: "monthly", priority: "0.6" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
        ];

        const entries: SitemapEntry[] = [...staticEntries];

        try {
          const { publicClient } = await import("@/lib/supabase-public.server");
          const client = publicClient();
          const [{ data: businesses }, { data: events }] = await Promise.all([
            client.from("businesses").select("id").eq("is_live", true).is("deleted_at", null),
            client.from("events").select("id").eq("status", "published"),
          ]);
          for (const b of businesses ?? []) {
            entries.push({ path: `/business/${b.id}`, changefreq: "weekly", priority: "0.8" });
          }
          for (const e of events ?? []) {
            entries.push({ path: `/events/${e.id}`, changefreq: "weekly", priority: "0.6" });
          }
        } catch {
          // If the data layer is unavailable, still serve the static routes.
        }


        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
