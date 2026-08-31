import type { Metadata } from "next";
import CybersecurityLanding from "../CybersecurityLanding";
import "./cybersecurity.css";
import "./cybersecurity-theme.css";

export const metadata: Metadata = {
  title: "CBSHub Cybersecurity — Diagnóstico de exposição digital",
  description: "Encontre sinais de exposição no domínio, e-mail e site da sua empresa antes que virem incidentes.",
  alternates: { canonical: "/" },
  robots: { index: false, follow: true },
  openGraph: { title: "CBSHub Cybersecurity — Encontre sua exposição antes do atacante", description: "Diagnóstico passivo da superfície externa para empresas.", url: "/", locale: "pt_BR", type: "website" },
};

export default function CybersecurityAliasPage() {
  return <CybersecurityLanding />;
}
