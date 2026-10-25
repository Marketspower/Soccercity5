// app/sitemap.ts — plan du site pour Google (/sitemap.xml)
import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const EVENT_TYPES = ["Anniversaire", "Tournoi", "Entreprise", "École", "Événement privé", "Compétition"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["", "/reservation", "/evenements", "/forfaits", "/forfaits/anniversaire", "/forfaits/academie", "/mentions-legales", "/confidentialite", "/conditions"];
  return [
    ...pages.map((p) => ({
      url: `${SITE_URL}${p}`,
      lastModified: now,
      changeFrequency: p === "" ? ("weekly" as const) : ("monthly" as const),
      priority: p === "" ? 1 : p === "/reservation" ? 0.9 : 0.7,
    })),
    ...EVENT_TYPES.map((t) => ({
      url: `${SITE_URL}/evenements/${encodeURIComponent(t)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
