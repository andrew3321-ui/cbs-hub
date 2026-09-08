import type { Metadata } from "next";
import Link from "next/link";
import { CyberMarketingFooter, CyberMarketingHeader } from "../CyberMarketingShell";
import { PublicPageBreadcrumb } from "../StructuredData";

export const metadata: Metadata = {
  title: "Produto | CBSHub Cybersecurity",
  description: "Conheça o Security Workspace da CBSHub: postura externa, priorização, monitoramento e mudanças defensivas controladas.",
  alternates: { canonical: "/produto" },
  openGraph: { title: "Produto | CBSHub Cybersecurity", description: "Da descoberta passiva à correção rastreável em um workspace defensivo.", url: "/produto", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Produto | CBSHub Cybersecurity", description: "Visibilidade, priorização e proteção controlada para ativos autorizados." },
};

export default function ProductPage() {
  return <main className="marketing-page"><PublicPageBreadcrumb current="Produto" path="/produto" /><div className="marketing-grid" aria-hidden="true" />
    <CyberMarketingHeader />
    <section className="marketing-hero product-hero"><span>SECURITY WORKSPACE</span><h1>Da superfície exposta<br /><em>à ação defensiva.</em></h1><p>Um único fluxo para observar ativos autorizados, entender o que merece atenção e conduzir correções com limites, evidências e aprovação humana.</p><div><Link className="marketing-button" href="/cadastro">Reservar acesso <span>→</span></Link><Link className="marketing-text-link" href="/#diagnostico">Testar diagnóstico público</Link></div></section>
    <section className="product-pillars"><article><span>01 / DISCOVER</span><h2>Veja o que está público</h2><p>Leitura passiva de DNS, autenticação de e-mail, HTTPS e cabeçalhos do navegador sem varredura invasiva.</p></article><article><span>02 / PRIORITIZE</span><h2>Separe sinal de ruído</h2><p>O agente organiza evidências objetivas, indica impacto e mantém a origem técnica de cada conclusão.</p></article><article><span>03 / OPERATE</span><h2>Transforme achado em trabalho</h2><p>Fila, responsáveis, prazos, aceite de risco e histórico tornam a correção acompanhável.</p></article><article><span>04 / DEFEND</span><h2>Aplique mudanças controladas</h2><p>Conectores defensivos geram prévia, aprovação e rollback antes de qualquer alteração externa.</p></article></section>
    <section className="product-flow"><div><span>CONTROLE POR DESENHO</span><h2>Autonomia onde é seguro. Aprovação onde importa.</h2><p>A CBSHub não entrega uma IA com acesso irrestrito ao ambiente. Cada capacidade tem escopo autorizado, política fechada e trilha auditável.</p></div><ol><li><b>Autorização</b><span>O domínio é declarado e comprovado por DNS.</span></li><li><b>Evidência</b><span>O sistema coleta apenas o necessário para a análise.</span></li><li><b>Decisão</b><span>Risco e recomendação permanecem vinculados aos fatos.</span></li><li><b>Mudança</b><span>Ações externas sensíveis exigem aprovação explícita.</span></li></ol></section>
    <section className="product-boundary"><span>LIMITES ATUAIS</span><h2>Segurança séria também diz o que não faz.</h2><p>Diagnóstico passivo não equivale a pentest. Monitoramento externo não equivale a SOC interno. A CBSHub complementa a equipe e organiza a resposta; não elimina validação profissional.</p><Link href="/precos">Conhecer plano e limites →</Link></section>
    <CyberMarketingFooter />
  </main>;
}
