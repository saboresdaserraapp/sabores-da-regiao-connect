// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Fetches approved establishments from Lovable Cloud to include /loja/:slug entries.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = (process.env.VITE_PUBLIC_SITE_URL || "https://saboresapp.lovable.app").replace(/\/$/, "");

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/loja", changefreq: "daily", priority: "0.9" },
  { path: "/login", changefreq: "monthly", priority: "0.3" },
  { path: "/cadastro", changefreq: "monthly", priority: "0.5" },
  { path: "/recuperar-senha", changefreq: "yearly", priority: "0.2" },
  { path: "/privacidade", changefreq: "yearly", priority: "0.3" },
];

async function fetchEstablishmentSlugs(): Promise<SitemapEntry[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn("[sitemap] Supabase env vars missing — skipping dynamic entries");
    return [];
  }
  try {
    // Only public, approved and active stores belong in the public sitemap.
    const res = await fetch(
      `${url}/rest/v1/establishments?select=slug,updated_at&approval_status=eq.approved&is_public=eq.true&status=eq.ativo`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      console.warn(`[sitemap] failed to fetch establishments: ${res.status}`);
      return [];
    }
    const rows = (await res.json()) as Array<{ slug: string | null; updated_at: string | null }>;
    return rows
      .filter((r) => !!r.slug)
      .map((r) => ({
        path: `/loja/${r.slug}`,
        lastmod: r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 10) : undefined,
        changefreq: "weekly" as const,
        priority: "0.8",
      }));
  } catch (err) {
    console.warn("[sitemap] error fetching establishments:", err);
    return [];
  }
}

function generateSitemap(entries: SitemapEntry[]) {
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
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

async function main() {
  const dynamic = await fetchEstablishmentSlugs();
  const entries = [...staticEntries, ...dynamic];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
}

main();