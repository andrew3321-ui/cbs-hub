import type { MetadataRoute } from "next";

const SITE_URL = "https://cbshub.com.br";
const LAST_CONTENT_REVIEW = new Date("2026-08-01T00:00:00-03:00");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: LAST_CONTENT_REVIEW,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/planos`,
      lastModified: LAST_CONTENT_REVIEW,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/metodologia`,
      lastModified: LAST_CONTENT_REVIEW,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacidade`,
      lastModified: LAST_CONTENT_REVIEW,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/termos`,
      lastModified: LAST_CONTENT_REVIEW,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
