import type { Metadata } from "next";
import CybersecurityLanding from "./CybersecurityLanding";
import "./cyberseguranca/cybersecurity.css";
import "./cyberseguranca/cybersecurity-theme.css";
import "./landing-refresh.css";

export const metadata: Metadata = {
  title: "CBSHub Cybersecurity — Encontre sua exposição antes do atacante",
  description: "Mapeie sinais públicos de risco no domínio, e-mail e site da sua empresa. Diagnóstico passivo, imediato e sem cadastro.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "CBSHub Cybersecurity — Visibilidade para agir antes do incidente",
    description: "Diagnóstico passivo da superfície externa para pequenas e médias empresas.",
    url: "/",
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "CBSHub Cybersecurity", description: "Encontre sua exposição antes do atacante." },
};

export default function LandingPage() {
  return <CybersecurityLanding />;
}
