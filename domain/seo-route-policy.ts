import { taxContentTopics } from "./tax-content.ts";

export const SEO_ROUTE_POLICY_VERSION = "seo-routes-v1.1.0";

const taxContentRoutes = [
  { path: "/conteudos", changeFrequency: "weekly" as const, priority: 0.9 },
  ...Object.values(taxContentTopics).map((topic) => ({ path: `/conteudos/${topic.slug}`, changeFrequency: "weekly" as const, priority: 0.85 })),
];

export const publicIndexableRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/planos", changeFrequency: "monthly", priority: 0.8 },
  { path: "/metodologia", changeFrequency: "monthly", priority: 0.8 },
  { path: "/cobertura", changeFrequency: "daily", priority: 0.9 },
  { path: "/privacidade", changeFrequency: "monthly", priority: 0.4 },
  { path: "/termos", changeFrequency: "monthly", priority: 0.4 },
  { path: "/responsavel", changeFrequency: "monthly", priority: 0.3 },
  { path: "/calculadora-reforma-tributaria", changeFrequency: "weekly", priority: 0.9 },
  { path: "/cbs-ibs-contadores", changeFrequency: "weekly", priority: 0.9 },
  { path: "/icms-st-contadores", changeFrequency: "weekly", priority: 0.9 },
  { path: "/inteligencia-tributaria-escritorios", changeFrequency: "weekly", priority: 0.9 },
  { path: "/relatorios-fiscais-rastreaveis", changeFrequency: "weekly", priority: 0.9 },
  ...taxContentRoutes,
] as const;

export const privateIndexRoutePrefixes = [
  "/api/",
  "/app",
  "/cadastro",
  "/entrar",
  "/recuperar-senha",
  "/sair",
  "/dossie/",
  "/relatorio/",
  "/relatorio-fiscal/",
] as const;

export function routeMustNotBeIndexed(pathname: string) {
  return privateIndexRoutePrefixes.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix));
}
