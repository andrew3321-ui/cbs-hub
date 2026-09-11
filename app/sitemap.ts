import type { MetadataRoute } from "next";
import { publicIndexableRoutes } from "../domain/seo-route-policy.ts";

const SITE_URL = "https://cbshub.com.br";
const LAST_CONTENT_REVIEW = new Date("2026-09-11T00:00:00-03:00");

export default function sitemap(): MetadataRoute.Sitemap {
  return publicIndexableRoutes.map((route) => ({
    url: route.path === "/" ? SITE_URL : `${SITE_URL}${route.path}`,
    lastModified: LAST_CONTENT_REVIEW,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
