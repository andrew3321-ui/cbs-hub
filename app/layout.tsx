import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Margem Clara — Inteligência tributária para PMEs e contadores",
    description: "Monitore empresas, compare cenários e simule o impacto de IBS e CBS sobre margens e preços.",
    openGraph: {
      title: "Margem Clara — Decisões fiscais. Margens protegidas.",
      description: "Monitore clientes e entenda o impacto tributário antes que ele chegue à margem.",
      images: [{ url: `${origin}/og.jpg`, width: 1736, height: 909, alt: "Margem Clara — decisões fiscais, margens protegidas" }],
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Margem Clara",
      description: "Decisões fiscais. Margens protegidas.",
      images: [`${origin}/og.jpg`],
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
