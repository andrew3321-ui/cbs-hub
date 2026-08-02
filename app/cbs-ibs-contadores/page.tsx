import SeoIntentLanding from "../SeoIntentLanding";
import { seoIntentMetadata } from "../seo-intent-metadata";
import { seoIntentPages } from "../../domain/seo-intent-pages";

const page = seoIntentPages["cbs-ibs-contadores"];
export const metadata = seoIntentMetadata(page);
export default function CbsIbsLanding() { return <SeoIntentLanding page={page} />; }
