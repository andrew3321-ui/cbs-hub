import type { Metadata } from "next";
import "./globals.css";
import AnalyticsBeacon from "./AnalyticsBeacon";
import WebVitalsBeacon from "./WebVitalsBeacon";
import "./cbshub-landing.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cbshub.com.br"),
  title: "CBSHub — Pesquisa, cálculo e relatório fiscal em um só fluxo",
  description: "Reduza o tempo gasto procurando normas, refazendo cálculos e montando relatórios. Organize fatos, fontes oficiais, memória e entrega fiscal no mesmo fluxo.",
  icons: {
    icon: [{ url: "/cbshub-icon-1024.png", type: "image/png", sizes: "1024x1024" }],
    shortcut: [{ url: "/cbshub-icon-1024.png", type: "image/png" }],
    apple: [{ url: "/cbshub-icon-1024.png", type: "image/png", sizes: "1024x1024" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "CBSHub — Pare de refazer a análise fiscal do zero",
    description: "Da pesquisa da norma ao relatório para o cliente: fatos, cálculo, fontes e histórico em um só fluxo.",
    images: [{ url: "/og-cbshub.png", width: 1734, height: 907, alt: "CBSHub — pesquisa, cálculo e relatório fiscal em um só fluxo" }],
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
      <body><AnalyticsBeacon /><WebVitalsBeacon />{children}</body>
    </html>
  );
}
