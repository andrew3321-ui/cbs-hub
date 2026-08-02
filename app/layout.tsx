import type { Metadata } from "next";
import "./globals.css";
import AnalyticsBeacon from "./AnalyticsBeacon";
import WebVitalsBeacon from "./WebVitalsBeacon";
import "./cbshub-landing.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cbshub.com.br"),
  title: "CBSHub — Inteligência tributária rastreável",
  description: "Pesquise normas, estruture operações, execute cálculos determinísticos e entregue dossiês fiscais com fonte, memória e versão.",
  icons: {
    icon: [{ url: "/cbshub-icon-1024.png", type: "image/png", sizes: "1024x1024" }],
    shortcut: [{ url: "/cbshub-icon-1024.png", type: "image/png" }],
    apple: [{ url: "/cbshub-icon-1024.png", type: "image/png", sizes: "1024x1024" }],
  },
  manifest: "/site.webmanifest",
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
      <body><AnalyticsBeacon /><WebVitalsBeacon />{children}</body>
    </html>
  );
}
