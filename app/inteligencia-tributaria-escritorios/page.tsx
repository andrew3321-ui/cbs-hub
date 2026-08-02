import SeoIntentLanding from "../SeoIntentLanding";
import { seoIntentMetadata } from "../seo-intent-metadata";
import { seoIntentPages } from "../../domain/seo-intent-pages";

const page = seoIntentPages["inteligencia-tributaria-escritorios"];
export const metadata = seoIntentMetadata(page);
export default function FiscalIntelligenceLanding() { return <SeoIntentLanding page={page} />; }
