import type { MetadataRoute } from "next";

const SITE_URL = "https://cbshub.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/app",
        "/cadastro",
        "/entrar",
        "/recuperar-senha",
        "/sair",
        "/dossie/",
        "/relatorio/",
        "/relatorio-fiscal/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
