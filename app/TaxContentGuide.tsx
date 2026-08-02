import Link from "next/link";
import { evaluateTaxContentFreshness, taxContentAuthor, taxContentTopics, type TaxContentTopic } from "../domain/tax-content";
import { buildBreadcrumbStructuredData, buildTaxContentArticleStructuredData } from "../domain/seo-structured-data";
import { StructuredData } from "./StructuredData";
import { TaxContentNavigation } from "./TaxContentNavigation";

function date(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("pt-BR");
}

export default function TaxContentGuide({ topic }: { topic: TaxContentTopic }) {
  const path = `/conteudos/${topic.slug}`;
  const freshness = evaluateTaxContentFreshness(topic);
  const related = Object.values(taxContentTopics).filter((candidate) => candidate.slug !== topic.slug).slice(0, 3);
  return <main className="tax-content-shell">
    <StructuredData value={buildTaxContentArticleStructuredData({ path, title: topic.title, description: topic.description, tax: topic.tax, reviewedAt: topic.reviewedAt, version: topic.version, sourceUrls: topic.sources.map((source) => source.url) })} />
    <StructuredData value={buildBreadcrumbStructuredData([{ name: "Início", path: "/" }, { name: "Conteúdos", path: "/conteudos" }, { name: topic.tax, path }])} />
    <TaxContentNavigation />

    <section className="tax-content-hero">
      <div><span>{topic.eyebrow}</span><h1>{topic.headline}</h1><p>{topic.summary}</p><div className="tax-content-meta"><b>Versão {topic.version}</b><span>Revisado em {date(topic.reviewedAt)}</span><span>Próxima revisão {date(topic.nextReviewAt)}</span></div></div>
      <aside className={`freshness-${freshness.freshness}`}><span>FRESCOR EDITORIAL</span><strong>{freshness.operationalStatus}</strong><p>{freshness.freshness === "stale" ? "A referência foi automaticamente suspensa até nova conferência das fontes." : freshness.freshness === "review_due" ? "A janela de revisão está próxima; a fonte continua visível e a atualização já é prioridade." : "Fontes conferidas dentro da janela de revisão controlada."}</p><small>{topic.effectiveWindow}</small></aside>
    </section>

    {freshness.freshness === "stale" && <section className="tax-content-stale-warning"><b>Conteúdo rebaixado automaticamente</b><p>Esta página continua pública para preservar o histórico, mas não deve ser usada como referência atual até que uma nova versão confirme fonte, vigência e limites.</p></section>}

    <section className="tax-content-section"><header><span>FATOS QUE DECIDEM</span><h2>Antes de calcular, feche o recorte</h2></header><div className="tax-content-fact-grid">{topic.keyFacts.map((fact, index) => <article key={fact.title}><em>{String(index + 1).padStart(2, "0")}</em><h3>{fact.title}</h3><p>{fact.detail}</p></article>)}</div></section>

    <section className="tax-content-section tax-content-path"><header><span>TRILHA DE ANÁLISE</span><h2>Uma decisão reproduzível em quatro etapas</h2></header><ol>{topic.decisionPath.map((step, index) => <li key={step.title}><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{step.title}</h3><p>{step.detail}</p></div></li>)}</ol></section>

    <section className="tax-content-section tax-content-example"><div><span>EXEMPLO OPERACIONAL · NÃO É PARECER</span><h2>{topic.example.title}</h2><ul>{topic.example.facts.map((fact) => <li key={fact}>✓ {fact}</li>)}</ul></div><aside><b>Saída segura</b><p>{topic.example.outcome}</p><Link href={topic.example.toolHref}>{topic.example.toolLabel} →</Link></aside></section>

    <section className="tax-content-section tax-content-limits"><header><span>LIMITES EXPLÍCITOS</span><h2>O que esta referência não conclui sozinha</h2></header><ul>{topic.limits.map((limit) => <li key={limit}>{limit}</li>)}</ul></section>

    <section className="tax-content-section tax-content-sources"><header><span>FONTES PRIMÁRIAS</span><h2>Base oficial conferida</h2></header><div>{topic.sources.map((source) => <article key={source.code}><span>{source.code}</span><h3>{source.title}</h3><p>{source.publisher}</p><dl><div><dt>Vigência de referência</dt><dd>{date(source.effectiveFrom)}</dd></div><div><dt>Conferida</dt><dd>{date(source.checkedAt)}</dd></div></dl><a href={source.url} target="_blank" rel="noreferrer">Abrir fonte oficial ↗</a></article>)}</div></section>

    <section className="tax-content-section tax-content-version"><div><span>AUTORIA TÉCNICA INSTITUCIONAL</span><h2>{taxContentAuthor.name}</h2><p>{taxContentAuthor.role}. A autoria descreve curadoria e modelagem; não representa homologação profissional individual.</p></div><div><span>HISTÓRICO DE ALTERAÇÕES</span>{topic.history.map((entry) => <article key={`${entry.version}-${entry.date}`}><b>v{entry.version}</b><time dateTime={entry.date}>{date(entry.date)}</time><p>{entry.change}</p></article>)}</div></section>

    <nav className="tax-content-related" aria-label="Guias tributários relacionados"><span>CONTINUE A PESQUISA</span><div>{related.map((item) => <Link key={item.slug} href={`/conteudos/${item.slug}`}><small>{item.tax}</small><b>{item.operation}</b><span>Ver guia →</span></Link>)}</div></nav>
    <section className="tax-content-final"><span>DA REFERÊNCIA À MEMÓRIA</span><h2>Leve os fatos para uma análise versionada.</h2><p>O conteúdo público ajuda a estruturar a pergunta. O sistema só libera o que estiver dentro do recorte suportado e mantém pendências visíveis.</p><Link href="/cadastro?utm_source=google&utm_medium=organic&utm_campaign=conteudo_tributario_final">Criar espaço profissional →</Link></section>
    <footer className="tax-content-footer"><span>CBSHub · Conteúdo técnico versionado</span><div><Link href="/conteudos">Central</Link><Link href="/privacidade">Privacidade</Link><a href="mailto:supportofficial@cbshub.com.br">Suporte</a></div></footer>
  </main>;
}
