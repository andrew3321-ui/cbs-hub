import type { Metadata } from "next";
import type { SeoIntentPage } from "../domain/seo-intent-pages";

export function seoIntentMetadata(page: SeoIntentPage): Metadata {
  const path = `/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    keywords: [page.primaryKeyword, ...page.relatedKeywords],
    alternates: { canonical: path },
    openGraph: { title: page.title, description: page.description, url: path, images: [{ url: "/og-cbshub.png", width: 1734, height: 907, alt: page.headline }], type: "website", locale: "pt_BR" },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: ["/og-cbshub.png"] },
  };
}
