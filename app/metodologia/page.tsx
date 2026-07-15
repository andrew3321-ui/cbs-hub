import Link from "next/link";
import { TAX_DETERMINATION_ENGINE_VERSION } from "../../domain/tax-determination";
import { CALCULATION_ENGINE_VERSION, METHODOLOGY_VERSION } from "../scenario-reliability";

export const metadata = {
  title: "Metodologia e controles | Margem Clara",
  description: "Versões, fórmulas, fontes e limites de uso das análises tributárias do Margem Clara.",
};

export default function MethodologyPage() {
  return (
    <main className="methodology-shell">
      <header className="methodology-nav">
        <Link className="landing-brand" href="/"><span className="landing-brand-mark">mc</span><span>margem<strong>clara</strong></span></Link>
        <div><Link href="/">Início</Link><Link className="methodology-cta" href="/app">Abrir plataforma →</Link></div>
      </header>

      <section className="methodology-hero">
        <span>CONFIABILIDADE POR CONSTRUÇÃO</span>
        <h1>Metodologia, versões e limites claramente documentados.</h1>
        <p>O Margem Clara é um ambiente de trabalho para contadores. Esta página separa o que o motor verifica, o que o responsável técnico declara e o que ainda depende de fonte oficial.</p>
        <div className="methodology-version-grid"><div><small>MOTOR FINANCEIRO</small><strong>{CALCULATION_ENGINE_VERSION}</strong></div><div><small>MOTOR DE APURAÇÃO</small><strong>{TAX_DETERMINATION_ENGINE_VERSION}</strong></div><div><small>METODOLOGIA</small><strong>{METHODOLOGY_VERSION}</strong></div><div><small>GARANTIA DISPONÍVEL</small><strong>Revisão do responsável</strong></div></div>
      </section>

      <section className="methodology-section">
        <div className="methodology-heading"><span>01</span><div><small>ESCOPO ATUAL</small><h2>O que o motor calcula</h2></div></div>
        <div className="methodology-card-grid">
          <article><h3>Base mensal projetada</h3><code>receita × (1 + reajuste) × (1 − perda de volume)</code><p>A receita projetada incorpora apenas as duas premissas registradas. O sistema não presume elasticidade de demanda.</p></article>
          <article><h3>Tributos informados</h3><code>receita do período × alíquota informada</code><p>A alíquota é uma entrada com origem obrigatória. O valor não é apresentado como regra oficial homologada.</p></article>
          <article><h3>Margem e equilíbrio</h3><code>receita − custos variáveis − tributos − custos fixos</code><p>O ponto de equilíbrio e o reajuste são derivados matematicamente das mesmas premissas congeladas.</p></article>
        </div>
      </section>

      <section className="methodology-section assurance-section">
        <div className="methodology-heading"><span>02</span><div><small>CONTROLES IMPLEMENTADOS</small><h2>Como evitamos alterações silenciosas</h2></div></div>
        <ol className="control-list">
          <li><b>01</b><div><strong>Cálculo autoritativo no servidor</strong><p>O navegador exibe uma prévia; o resultado oficial do registro é recalculado no servidor ao salvar.</p></div></li>
          <li><b>02</b><div><strong>Snapshot imutável por versão</strong><p>Relatórios novos leem o resultado congelado. Uma futura mudança de fórmula não reescreve documentos antigos.</p></div></li>
          <li><b>03</b><div><strong>Hash SHA-256 das entradas</strong><p>Receita, alíquotas, custos, ano, origem e nota formam uma impressão digital única da versão.</p></div></li>
          <li><b>04</b><div><strong>Assinatura criptográfica HMAC</strong><p>Entradas, snapshot, empresa, proprietário e versões são assinados com uma chave secreta do servidor. Qualquer divergência bloqueia revisão, compartilhamento e relatório.</p></div></li>
          <li><b>05</b><div><strong>Trilha de responsabilidade</strong><p>Salvamento, início da revisão, aprovação responsável, entrega e revogação deixam registro com data, identidade e versão.</p></div></li>
          <li><b>06</b><div><strong>Níveis de garantia explícitos</strong><p>“Revisado pelo responsável” identifica autodeclaração do contador na mesma conta. Não é exibido como revisão independente nem como homologação do CFC ou da autoridade fiscal.</p></div></li>
        </ol>
      </section>

      <section className="methodology-section">
        <div className="methodology-heading"><span>03</span><div><small>LIMITES FISCAIS</small><h2>O que ainda não deve ser presumido</h2></div></div>
        <div className="methodology-boundary"><div><strong>O livro está modelado, mas não homologado</strong><p>Débitos, créditos, ajustes, extinções, conciliação e fechamento já possuem contrato técnico. A classificação NCM/NBS/cClassTrib, os regimes específicos e as integrações oficiais ainda precisam de regras próprias e validação profissional antes da escrita real.</p></div><div className="methodology-warning"><span>2026</span><p>A Receita Federal caracteriza 2026 como ano de teste: CBS de 0,9% e IBS de 0,1%, com regras de compensação e dispensa condicionada. Por isso, mesmo o saldo preliminar do livro não é convertido em valor exigível.</p></div></div>
      </section>

      <section className="methodology-section">
        <div className="methodology-heading"><span>04</span><div><small>APURAÇÃO ASSISTIDA</small><h2>Como o saldo líquido será fechado</h2></div></div>
        <div className="methodology-card-grid">
          <article><h3>Livros separados</h3><code>CBS ≠ IBS</code><p>Débitos, créditos, ajustes e extinções permanecem segregados. O motor não compensa um tributo com o outro.</p></article>
          <article><h3>Crédito condicionado</h3><code>elegibilidade + evidência + conciliação</code><p>Crédito pendente ou bloqueado não reduz o saldo. A divergência fica visível na fila de exceções.</p></article>
          <article><h3>Fechamento controlado</h3><code>snapshot + hash + revisão responsável</code><p>Um período fechado não é reescrito. A revisão independente exigirá uma segunda identidade; correções entram em nova versão.</p></article>
        </div>
      </section>

      <section className="methodology-section">
        <div className="methodology-heading"><span>05</span><div><small>FONTES PRIMÁRIAS</small><h2>Base normativa acompanhada</h2></div></div>
        <div className="source-list">
          <a href="https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm" target="_blank" rel="noreferrer"><span>Lei Complementar nº 214/2025, texto compilado</span><b>Planalto ↗</b></a>
          <a href="https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda" target="_blank" rel="noreferrer"><span>Entenda a Reforma Tributária do Consumo</span><b>Receita Federal ↗</b></a>
          <a href="https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026" target="_blank" rel="noreferrer"><span>Orientações oficiais para 2026</span><b>Receita Federal ↗</b></a>
          <a href="https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/marcos" target="_blank" rel="noreferrer"><span>Marcos regulatórios da implementação</span><b>Receita Federal ↗</b></a>
          <a href="https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/curso/material-de-apoio" target="_blank" rel="noreferrer"><span>Curso RFB/CFC — Apuração Assistida</span><b>Receita Federal ↗</b></a>
          <a href="https://www.gov.br/nfse/pt-br/noticias/publicada-a-nota-tecnica-009-da-nfs-e" target="_blank" rel="noreferrer"><span>Nota Técnica 009 — ajustes de débito e crédito</span><b>Portal NFS-e ↗</b></a>
          <a href="https://www.gov.br/sped/pt-br/assuntos/documentos-fiscais/dere" target="_blank" rel="noreferrer"><span>Declaração de Regimes Específicos — DeRE</span><b>SPED ↗</b></a>
        </div>
      </section>

      <section className="methodology-final"><div><small>POLÍTICA DE EVOLUÇÃO</small><h2>Nenhuma regra ou aprovação entra silenciosamente.</h2><p>Cada mudança recebe versão, fonte, casos adversos e vigência. Cada entrega identifica preparador, nível de revisão e limites; a próxima etapa é habilitar equipes com segregação real de funções.</p></div><Link href="/app">Abrir carteira do escritório →</Link></section>
    </main>
  );
}
