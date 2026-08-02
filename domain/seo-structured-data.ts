import { billingPlans } from "./billing-plans.ts";

export const SEO_SITE_URL = "https://cbshub.com.br";
export const SEO_STRUCTURED_DATA_VERSION = "seo-structured-v1.0.0";

export const seoEligibilityPolicy = {
  faqPage: "not_eligible_general_saas",
  softwareRichResult: "not_eligible_without_real_review_or_rating",
} as const;

export const seoOrganization = {
  "@type": "Organization",
  "@id": `${SEO_SITE_URL}/#organization`,
  name: "CBSHub",
  url: SEO_SITE_URL,
  logo: `${SEO_SITE_URL}/cbshub-icon-1024.png`,
  email: "supportofficial@cbshub.com.br",
} as const;

export const seoWebSite = {
  "@type": "WebSite",
  "@id": `${SEO_SITE_URL}/#website`,
  url: SEO_SITE_URL,
  name: "CBSHub",
  alternateName: "CBS Hub",
  inLanguage: "pt-BR",
  publisher: { "@id": seoOrganization["@id"] },
} as const;

export const seoSoftwareApplication = {
  "@type": ["SoftwareApplication", "WebApplication"],
  "@id": `${SEO_SITE_URL}/#software`,
  name: "CBSHub",
  url: SEO_SITE_URL,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Software tributário para contadores e tributaristas",
  operatingSystem: "Web",
  inLanguage: "pt-BR",
  description: "Plataforma de inteligência tributária com pesquisa de normas, cálculos determinísticos e dossiês fiscais versionados.",
  publisher: { "@id": seoOrganization["@id"] },
  offers: {
    "@type": "Offer",
    url: `${SEO_SITE_URL}/planos`,
    price: (billingPlans.unico.priceCents / 100).toFixed(2),
    priceCurrency: "BRL",
    category: "subscription",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "Pesquisa de normas fiscais",
    "Cálculos tributários determinísticos",
    "Dossiês fiscais versionados",
    "Revisão responsável e trilha de auditoria",
  ],
} as const;

export function buildHomeStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [seoOrganization, seoWebSite, seoSoftwareApplication],
    version: SEO_STRUCTURED_DATA_VERSION,
  };
}

export type BreadcrumbItem = { name: string; path: string };

export function buildBreadcrumbStructuredData(items: BreadcrumbItem[]) {
  if (items.length < 2 || items.some((item) => !item.name.trim() || !item.path.startsWith("/"))) {
    throw new Error("invalid_seo_breadcrumb");
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SEO_SITE_URL}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function buildSeoIntentPageStructuredData(input: { path: string; title: string; description: string; keywords: string[] }) {
  if (!input.path.startsWith("/") || !input.title.trim() || !input.description.trim()) throw new Error("invalid_seo_intent_page");
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SEO_SITE_URL}${input.path}#webpage`,
    url: `${SEO_SITE_URL}${input.path}`,
    name: input.title,
    description: input.description,
    inLanguage: "pt-BR",
    keywords: input.keywords.join(", "),
    isPartOf: { "@id": seoWebSite["@id"] },
    about: { "@id": seoSoftwareApplication["@id"] },
  };
}

export function buildTaxContentArticleStructuredData(input: {
  path: string;
  title: string;
  description: string;
  tax: string;
  reviewedAt: string;
  version: string;
  sourceUrls: string[];
}) {
  if (!input.path.startsWith("/conteudos/") || !input.title.trim() || !input.description.trim() || input.sourceUrls.length < 2) throw new Error("invalid_tax_content_article");
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${SEO_SITE_URL}${input.path}#article`,
    mainEntityOfPage: `${SEO_SITE_URL}${input.path}`,
    url: `${SEO_SITE_URL}${input.path}`,
    headline: input.title,
    description: input.description,
    about: input.tax,
    inLanguage: "pt-BR",
    datePublished: "2026-08-01",
    dateModified: input.reviewedAt,
    version: input.version,
    author: { "@type": "Organization", name: "CBSHub — Engenharia de regras fiscais", url: SEO_SITE_URL },
    publisher: { "@id": seoOrganization["@id"] },
    citation: input.sourceUrls,
    isPartOf: { "@id": `${SEO_SITE_URL}/conteudos#collection` },
  };
}

export function buildTaxContentCollectionStructuredData(items: Array<{ path: string; title: string }>) {
  if (items.length < 1 || items.some((item) => !item.path.startsWith("/conteudos/") || !item.title.trim())) throw new Error("invalid_tax_content_collection");
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SEO_SITE_URL}/conteudos#collection`,
    url: `${SEO_SITE_URL}/conteudos`,
    name: "Central de conteúdo tributário CBSHub",
    description: "Guias técnicos versionados com fontes oficiais, vigência, fatos mínimos e limites operacionais.",
    inLanguage: "pt-BR",
    isPartOf: { "@id": seoWebSite["@id"] },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: `${SEO_SITE_URL}${item.path}`,
      })),
    },
  };
}

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
