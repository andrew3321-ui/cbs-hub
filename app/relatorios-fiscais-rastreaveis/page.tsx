import SeoIntentLanding from "../SeoIntentLanding";
import { seoIntentMetadata } from "../seo-intent-metadata";
import { seoIntentPages } from "../../domain/seo-intent-pages";

const page = seoIntentPages["relatorios-fiscais-rastreaveis"];
export const metadata = seoIntentMetadata(page);
export default function TraceableReportsLanding() { return <SeoIntentLanding page={page} />; }
