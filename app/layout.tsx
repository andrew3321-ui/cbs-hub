import type { Metadata } from "next";
import "./globals.css";
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
  title: "CBSHub — Inteligência tributária para escritórios contábeis",
  description: "Organize clientes, revise versões e entregue análises tributárias rastreáveis com responsabilidade explícita.",
  openGraph: {
    title: "CBSHub — Do cálculo à entrega revisada",
    description: "Fluxo técnico para contadores organizarem clientes, revisarem versões e entregarem análises rastreáveis.",
    images: [{ url: "/og-accountants.png", width: 1736, height: 909, alt: "CBSHub — do cálculo à entrega revisada para escritórios contábeis" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CBSHub",
    description: "Inteligência tributária e revisão responsável para escritórios contábeis.",
    images: ["/og-accountants.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
