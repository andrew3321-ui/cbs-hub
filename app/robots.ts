import type { MetadataRoute } from "next";
import { privateIndexRoutePrefixes } from "../domain/seo-route-policy.ts";

const SITE_URL = "https://cbshub.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...privateIndexRoutePrefixes],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
