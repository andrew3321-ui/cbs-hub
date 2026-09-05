export const SEO_ROUTE_POLICY_VERSION = "seo-routes-v2.0.0-cybersecurity";

export const publicIndexableRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/privacidade", changeFrequency: "monthly", priority: 0.4 },
  { path: "/termos", changeFrequency: "monthly", priority: 0.4 },
  { path: "/responsavel", changeFrequency: "monthly", priority: 0.3 },
] as const;

export const privateIndexRoutePrefixes = [
  "/api/",
  "/app",
  "/experimentar",
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
