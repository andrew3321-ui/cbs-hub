import SeoIntentLanding from "../SeoIntentLanding";
import { seoIntentMetadata } from "../seo-intent-metadata";
import { seoIntentPages } from "../../domain/seo-intent-pages";

const page = seoIntentPages["calculadora-reforma-tributaria"];
export const metadata = seoIntentMetadata(page);
export default function ReformaCalculatorLanding() { return <SeoIntentLanding page={page} />; }
