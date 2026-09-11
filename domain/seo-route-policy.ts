export const SEO_ROUTE_POLICY_VERSION = "seo-routes-v3.0.0-trust-center";

export const publicIndexableRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/produto", changeFrequency: "weekly", priority: 0.8 },
  { path: "/casos-de-uso", changeFrequency: "weekly", priority: 0.7 },
  { path: "/seguranca", changeFrequency: "monthly", priority: 0.7 },
  { path: "/precos", changeFrequency: "weekly", priority: 0.8 },
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
  return privateIndexRoutePrefixes.some(
    (prefix) =>
      pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix),
  );
}
