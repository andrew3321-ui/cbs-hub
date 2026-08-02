import type { Metadata } from "next";
import type { TaxContentTopic } from "../domain/tax-content";

export function taxContentMetadata(topic: TaxContentTopic): Metadata {
  const path = `/conteudos/${topic.slug}`;
  return {
    title: topic.title,
    description: topic.description,
    keywords: [topic.tax, topic.operation, ...topic.audience],
    alternates: { canonical: path },
    openGraph: { title: topic.title, description: topic.description, url: path, images: [{ url: "/og-cbshub.png", width: 1734, height: 907, alt: topic.headline }], type: "article", locale: "pt_BR" },
    twitter: { card: "summary_large_image", title: topic.title, description: topic.description, images: ["/og-cbshub.png"] },
  };
}
