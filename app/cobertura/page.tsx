import type { Metadata } from "next";
import Link from "next/link";
import { buildPublicCoverageSummary } from "../../domain/public-coverage-summary";
import { buildBreadcrumbStructuredData, buildPublicCoverageStructuredData } from "../../domain/seo-structured-data";
import { StructuredData } from "../StructuredData";
import { TaxContentNavigation } from "../TaxContentNavigation";
import { PublicFiscalFreshnessIndicator } from "../PublicFiscalFreshnessIndicator";

export const metadata: Metadata = {
  title: "Cobertura tributária pública e versionada | CBSHub",
  description: "Consulte a cobertura real do CBSHub em ICMS/ST, ISS, Simples, PIS/Cofins, retenções, IPI e Reforma Tributária, com fontes oficiais, vigência, versões e limites.",
  alternates: { canonical: "/cobertura" },
  openGraph: {
    title: "Cobertura tributária pública | CBSHub",
    description: "Veja o que está suportado, parcial ou não suportado antes de iniciar uma análise fiscal.",
    url: "/cobertura",
    images: [{ url: "/og-cbshub.png", width: 1734, height: 907 }],
    type: "website",
    locale: "pt_BR",
  },
  twitter: { card: "summary_large_image", title: "Cobertura tributária pública | CBSHub", description: "Fontes, vigência, versão, testes e pendências em uma matriz sem promessas genéricas.", images: ["/og-cbshub.png"] },
};

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00Z`))
  : "não publicada para o recorte";

export default async function PublicCoveragePage() {
  const coverage = await buildPublicCoverageSummary();
  const sources = [...new Map(coverage.taxGroups.flatMap((group) => group.officialSources).map((source) => [source.code, source])).values()];
  const entries = coverage.totals.supported + coverage.totals.partial + coverage.totals.not_supported;
  return <main className="public-coverage-shell">
    <StructuredData value={buildBreadcrumbStructuredData([{ name: "Início", path: "/" }, { name: "Cobertura", path: "/cobertura" }])} />
    <StructuredData value={buildPublicCoverageStructuredData({ dateModified: coverage.checkedAt, version: coverage.indicatorVersion, entries, sourceUrls: sources.map((source) => source.url), taxes: coverage.taxGroups.map((group) => group.title) })} />
    <TaxContentNavigation />

    <section className="public-coverage-hero">
      <div>
        <span>COBERTURA PÚBLICA · {coverage.pageVersion}</span>
        <h1>Veja o que o CBSHub sustenta antes de confiar no resultado.</h1>
        <p>Cada recorte nasce dos catálogos versionados da plataforma e conserva a mesma classificação na pesquisa, no cálculo, no dossiê e no relatório. “Catalogado” nunca é promovido a “suportado” por aparência.</p>
        <div className="public-coverage-release"><b>Base {coverage.baseCoverageVersion}</b><b>Indicador {coverage.indicatorVersion}</b><b>Conferido em {formatDate(coverage.checkedAt)}</b></div>
      </div>
      <aside aria-label="Resumo da cobertura">
        <span>RECORTES PUBLICADOS</span><strong>{entries.toLocaleString("pt-BR")}</strong>
        <dl>
          <div><dt>Suportados</dt><dd className="coverage-supported">{coverage.totals.supported}</dd></div>
          <div><dt>Parciais</dt><dd className="coverage-partial">{coverage.totals.partial}</dd></div>
          <div><dt>Não suportados</dt><dd className="coverage-blocked">{coverage.totals.not_supported}</dd></div>
        </dl>
        <small>{coverage.regression.cases.toLocaleString("pt-BR")} casos regressivos · {coverage.regression.failures} falhas · {coverage.regression.modules} módulos</small>
      </aside>
    </section>

    <section className="public-coverage-legend" aria-labelledby="coverage-legend-title">
      <header><span>CONTRATO DE CLASSIFICAÇÃO</span><h2 id="coverage-legend-title">Três estados. Nenhum meio-termo escondido.</h2></header>
      <div>
        <article className="supported"><b>Suportado</b><p>Existe recorte exato, fonte, vigência, fatos obrigatórios e regressão compatível. A conclusão continua limitada à operação informada.</p></article>
        <article className="partial"><b>Parcial</b><p>A plataforma estrutura e testa parte da trilha, mas uma pendência jurídica ou factual impede a conclusão definitiva.</p></article>
        <article className="blocked"><b>Não suportado</b><p>O tema é reconhecido, porém o motor bloqueia cálculo, dossiê e relatório até existir regra específica suficiente.</p></article>
      </div>
    </section>
    <PublicFiscalFreshnessIndicator />

    <section className="public-coverage-tax-section" aria-labelledby="coverage-tax-title">
      <header><span>MATRIZ POR TRIBUTO</span><h2 id="coverage-tax-title">A cobertura real, com a pendência ao lado.</h2><p>Os números abaixo são recalculados diretamente da mesma base usada pelos motores. Não são metas comerciais nem contagens digitadas na página.</p></header>
      <div className="public-coverage-tax-grid">{coverage.taxGroups.map((group) => <article id={group.code} key={group.code}>
        <div className="public-coverage-tax-head"><div><span>{group.entries} recortes</span><h3>{group.title}</h3></div><div className="public-coverage-mini-status"><b className="supported">{group.statusTotals.supported}<small>suportados</small></b><b className="partial">{group.statusTotals.partial}<small>parciais</small></b><b className="blocked">{group.statusTotals.not_supported}<small>bloqueados</small></b></div></div>
        <p>{group.description}</p>
        <dl className="public-coverage-tax-meta">
          <div><dt>Versão</dt><dd>{group.versions.join(" · ")}</dd></div>
          <div><dt>Última verificação</dt><dd>{formatDate(group.checkedAt)}</dd></div>
          <div><dt>Vigência</dt><dd>{group.temporalEvidence.explicit} recortes com janela explícita{group.temporalEvidence.earliestFrom ? ` desde ${formatDate(group.temporalEvidence.earliestFrom)}` : ""}{group.temporalEvidence.latestTo ? ` até ${formatDate(group.temporalEvidence.latestTo)}` : ""}</dd></div>
          <div><dt>Pendência temporal</dt><dd>{group.temporalEvidence.pending} recortes não liberam conclusão sem período aplicável confirmado</dd></div>
        </dl>
        <div className="public-coverage-sources"><b>Fontes oficiais mais recorrentes</b>{group.officialSources.map((source) => <a key={source.code} href={source.url} target="_blank" rel="noreferrer"><span>{source.publisher}</span>{source.title}<small>conferida em {formatDate(source.checkedAt)} ↗</small></a>)}</div>
        <div className="public-coverage-blockers"><b>Pendências que ainda bloqueiam</b><ul>{group.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>
        <Link className="public-coverage-context-cta" href={`/cadastro?utm_source=google&utm_medium=organic&utm_campaign=cobertura_publica&utm_content=${group.code}`}>Testar um caso de {group.title} →</Link>
      </article>)}</div>
    </section>

    <section className="public-coverage-method">
      <div><span>COMO A DECISÃO É PRODUZIDA</span><h2>Determinístico significa reproduzível — não infalível.</h2><p>O motor recebe os mesmos fatos, aplica a mesma versão da regra e chega à mesma memória em centavos. Se faltar NCM, município, vigência, fonte, documento ou hipótese legal, ele falha fechado: mostra a pendência e não fabrica um valor.</p><Link href="/metodologia">Ler a metodologia completa →</Link></div>
      <ol><li><b>01</b><p><strong>Classifique o recorte</strong> Tributo, operação, jurisdição, produto, serviço e período.</p></li><li><b>02</b><p><strong>Confronte a regra</strong> Fonte oficial, versão e vigência precisam ser compatíveis.</p></li><li><b>03</b><p><strong>Reexecute os casos</strong> Alteração de regra não entra silenciosamente em produção.</p></li><li><b>04</b><p><strong>Libere ou bloqueie</strong> Pendência aparece antes do número e acompanha o relatório.</p></li></ol>
    </section>

    <section className="public-coverage-privacy"><div><span>RECORTE PÚBLICO SEGURO</span><h2>Prova técnica sem dados internos.</h2></div><p>{coverage.privacy.statement} A página não expõe perguntas, documentos, empresas, identificadores fiscais, snapshots, endpoints administrativos ou regras privadas.</p></section>
    <section className="public-coverage-final"><span>COMECE PELO RECORTE QUE IMPORTA</span><h2>Teste uma operação real e veja a plataforma dizer até onde pode ir.</h2><p>Cinco dias de acesso completo, até 10 empresas e nenhum cartão exigido no cadastro.</p><Link href="/cadastro?utm_source=google&utm_medium=organic&utm_campaign=cobertura_publica&utm_content=final">Criar acesso de avaliação →</Link></section>
    <footer className="tax-content-footer"><span>CBSHub · Cobertura versionada</span><div><Link href="/conteudos">Conteúdos</Link><Link href="/metodologia">Metodologia</Link><Link href="/termos">Termos</Link><a href="mailto:supportofficial@cbshub.com.br">Suporte</a></div></footer>
  </main>;
}
