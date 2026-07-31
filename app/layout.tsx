import type { Metadata } from "next";
import "./globals.css";
import AnalyticsBeacon from "./AnalyticsBeacon";
import "./cbshub-landing.css";
import "./homologation.css";
import "./homologation-simulations.css";
import "./federal-pme.css";
import "./national-coverage.css";
import "./national-coverage-v64.css";
import "./fiscal-expansion.css";
import "./deterministic-tax-lab.css";
import "./legal-reference-center.css";
import "./tax-reform-impact.css";
import "./account-onboarding.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cbshub.com.br"),
  title: "CBSHub — Inteligência tributária rastreável",
  description: "Pesquise normas, estruture operações, execute cálculos determinísticos e entregue dossiês fiscais com fonte, memória e versão.",
  openGraph: {
    title: "CBSHub — Da regra fiscal à decisão defendível",
    description: "Inteligência tributária, cálculo determinístico e dossiês versionados para contadores e tributaristas.",
    images: [{ url: "/og-cbshub.png", width: 1734, height: 907, alt: "CBSHub — da regra fiscal à decisão defendível" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CBSHub",
    description: "Inteligência tributária e revisão responsável para escritórios contábeis.",
    images: ["/og-cbshub.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><AnalyticsBeacon />{children}</body>
    </html>
  );
}
