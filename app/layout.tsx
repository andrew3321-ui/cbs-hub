import type { Metadata } from "next";
import "./globals.css";
import "./marketing.css";
import "./cyber-interface.css";
import "./product-refresh.css";
import AnalyticsBeacon from "./AnalyticsBeacon";
import WebVitalsBeacon from "./WebVitalsBeacon";

export const metadata: Metadata = {
  metadataBase: new URL("https://cbshub.com.br"),
  applicationName: "CBSHub",
  title: "CBSHub Cybersecurity — Visibilidade externa antes do ataque",
  description:
    "Monitore a postura pública de domínios, e-mail e aplicações web e transforme sinais externos em prioridades de correção rastreáveis.",
  icons: {
    icon: [
      { url: "/cbshub-icon-1024.png", type: "image/png", sizes: "1024x1024" },
    ],
    shortcut: [{ url: "/cbshub-icon-1024.png", type: "image/png" }],
    apple: [
      { url: "/cbshub-icon-1024.png", type: "image/png", sizes: "1024x1024" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    siteName: "CBSHub",
    title: "CBSHub Cybersecurity — Encontre sua exposição antes do atacante",
    description:
      "Diagnóstico passivo e monitoramento da superfície externa em um workspace defensivo.",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CBSHub Cybersecurity",
    description:
      "Visibilidade externa, diagnóstico passivo e prioridades de correção.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AnalyticsBeacon />
        <WebVitalsBeacon />
        {children}
      </body>
    </html>
  );
}
