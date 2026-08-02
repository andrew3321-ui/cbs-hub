import { notFound } from "next/navigation";
import { taxContentTopics, type TaxContentSlug } from "../../../domain/tax-content";
import TaxContentGuide from "../../TaxContentGuide";
import { taxContentMetadata } from "../../tax-content-metadata";

export function generateStaticParams() {
  return Object.keys(taxContentTopics).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = taxContentTopics[slug as TaxContentSlug];
  return topic ? taxContentMetadata(topic) : {};
}

export default async function TaxContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = taxContentTopics[slug as TaxContentSlug];
  if (!topic) notFound();
  return <TaxContentGuide topic={topic} />;
}
