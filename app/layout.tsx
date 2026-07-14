import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Margem Clara — Inteligência tributária para PMEs",
    description: "Simule o impacto de IBS e CBS na margem da sua empresa e transforme mudanças tributárias em decisões claras.",
    openGraph: {
      title: "Margem Clara — Decisões fiscais. Margens protegidas.",
      description: "Entenda o impacto tributário antes que ele chegue à sua margem.",
      images: [{ url: `${origin}/og.png`, width: 1736, height: 909, alt: "Margem Clara — decisões fiscais, margens protegidas" }],
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Margem Clara",
      description: "Decisões fiscais. Margens protegidas.",
      images: [`${origin}/og.png`],
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
