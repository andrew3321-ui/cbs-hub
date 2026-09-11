

export const SEO_SITE_URL = "https://cbshub.com.br";
export const SEO_STRUCTURED_DATA_VERSION = "seo-structured-v3.0.0";

export const seoEligibilityPolicy = {
  faqPage: "not_eligible_general_saas",
  softwareRichResult: "not_eligible_without_real_review_or_rating",
} as const;

export const seoOrganization = {
  "@type": "Organization",
  "@id": `${SEO_SITE_URL}/#organization`,
  name: "CBSHub",
  alternateName: "CBSHub Cybersecurity",
  url: SEO_SITE_URL,
  logo: `${SEO_SITE_URL}/cbshub-icon-1024.png`,
  email: "supportofficial@cbshub.com.br",
} as const;

export const seoWebSite = {
  "@type": "WebSite",
  "@id": `${SEO_SITE_URL}/#website`,
  url: SEO_SITE_URL,
  name: "CBSHub",
  alternateName: ["CBSHub Cybersecurity", "CBS Hub"],
  inLanguage: "pt-BR",
  publisher: { "@id": seoOrganization["@id"] },
} as const;

export const seoSoftwareApplication = {
  "@type": ["SoftwareApplication", "WebApplication"],
  "@id": `${SEO_SITE_URL}/#software`,
  name: "CBSHub",
  url: SEO_SITE_URL,
  applicationCategory: "SecurityApplication",
  applicationSubCategory: "Monitoramento defensivo da superfície externa",
  operatingSystem: "Web",
  inLanguage: "pt-BR",
  description: "Diagnóstico passivo de DNS, e-mail e HTTPS em ativos autorizados, com evidências e prioridades de correção.",
  publisher: { "@id": seoOrganization["@id"] },
  featureList: ["Verificação de domínio por DNS", "Diagnóstico passivo de exposição", "Monitoramento agendado", "Evidências técnicas e trilha de auditoria"],
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

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
