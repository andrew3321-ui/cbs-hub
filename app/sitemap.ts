import type { MetadataRoute } from "next";
import { publicIndexableRoutes } from "../domain/seo-route-policy.ts";
import { taxContentTopics } from "../domain/tax-content.ts";

const SITE_URL = "https://cbshub.com.br";
const LAST_CONTENT_REVIEW = new Date("2026-08-01T00:00:00-03:00");
const taxContentReviewByPath = new Map(Object.values(taxContentTopics).map((topic) => [`/conteudos/${topic.slug}`, new Date(`${topic.reviewedAt}T00:00:00-03:00`)]));
const TAX_CONTENT_HUB_REVIEW = new Date(`${Object.values(taxContentTopics).map((topic) => topic.reviewedAt).sort().at(-1)}T00:00:00-03:00`);

export default function sitemap(): MetadataRoute.Sitemap {
  return publicIndexableRoutes.map((route) => ({
    url: route.path === "/" ? SITE_URL : `${SITE_URL}${route.path}`,
    lastModified: route.path === "/conteudos" ? TAX_CONTENT_HUB_REVIEW : taxContentReviewByPath.get(route.path) ?? LAST_CONTENT_REVIEW,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
