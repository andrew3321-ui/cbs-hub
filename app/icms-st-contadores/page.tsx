import SeoIntentLanding from "../SeoIntentLanding";
import { seoIntentMetadata } from "../seo-intent-metadata";
import { seoIntentPages } from "../../domain/seo-intent-pages";

const page = seoIntentPages["icms-st-contadores"];
export const metadata = seoIntentMetadata(page);
export default function IcmsStLanding() { return <SeoIntentLanding page={page} />; }
