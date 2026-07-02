import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://soccercity.ca";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/reservation`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/evenements`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
