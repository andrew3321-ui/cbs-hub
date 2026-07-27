import type { Metadata } from "next";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Margem Clara — Inteligência tributária para escritórios contábeis",
    description: "Organize clientes, revise versões e entregue análises tributárias rastreáveis com responsabilidade explícita.",
    openGraph: {
      title: "Margem Clara — Do cálculo à entrega revisada",
      description: "Fluxo técnico para contadores organizarem clientes, revisarem versões e entregarem análises rastreáveis.",
      images: [{ url: `${origin}/og-accountants.png`, width: 1736, height: 909, alt: "Margem Clara — do cálculo à entrega revisada para escritórios contábeis" }],
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Margem Clara",
      description: "Inteligência tributária e revisão responsável para escritórios contábeis.",
      images: [`${origin}/og-accountants.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
