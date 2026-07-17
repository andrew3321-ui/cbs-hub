"use client";

import { useMemo, useState } from "react";
import { LEGAL_REFERENCE_CATALOG_VERSION, legalAreaLabels, legalCatalogMetrics, searchLegalReferences, type LegalArea } from "../../domain/legal-reference-catalog";

const areas: Array<{ id: "all" | LegalArea; label: string }> = [
  { id: "all", label: "Todas" },
  ...Object.entries(legalAreaLabels).map(([id, label]) => ({ id: id as LegalArea, label })),
];

export default function LegalReferenceCenter() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<"all" | LegalArea>("all");
  const metrics = useMemo(() => legalCatalogMetrics(), []);
  const results = useMemo(() => searchLegalReferences(query, area), [query, area]);

  return (
    <section className="legal-center" aria-labelledby="legal-center-title">
      <header className="legal-center-hero">
        <div>
          <span className="eyebrow">BASE LEGAL CONTROLADA · {LEGAL_REFERENCE_CATALOG_VERSION}</span>
          <h2 id="legal-center-title">Biblioteca normativa conectada aos cálculos</h2>
          <p>Pesquise leis, resoluções, convênios e manuais oficiais. Cada item declara o que sustenta — e também o limite do seu uso.</p>
        </div>
        <div className="legal-center-verification"><span>✓</span><p><b>Fonte oficial conferida</b><small>Não equivale a regra homologada</small></p></div>
      </header>

      <div className="legal-center-metrics" aria-label="Cobertura da biblioteca normativa">
        <article><strong>{metrics.total}</strong><span>referências oficiais</span></article>
        <article><strong>{metrics.areas}</strong><span>áreas cobertas</span></article>
        <article><strong>{metrics.calculationLinked}</strong><span>ligadas a cálculos</span></article>
        <article><strong>{metrics.current2026}</strong><span>fontes de 2026</span></article>
        <article><strong>{metrics.officialDomains}</strong><span>domínios oficiais</span></article>
      </div>

      <div className="legal-center-controls">
        <label className="legal-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lei, tributo, tema, NCM, fator R, retenção…" aria-label="Buscar na biblioteca normativa" /></label>
        <div className="legal-area-tabs" role="tablist" aria-label="Filtrar por área">
          {areas.map((item) => <button key={item.id} type="button" className={area === item.id ? "active" : ""} onClick={() => setArea(item.id)}>{item.label}</button>)}
        </div>
      </div>

      <div className="legal-results-heading"><p><b>{results.length}</b> {results.length === 1 ? "referência encontrada" : "referências encontradas"}</p><small>Conferência da fonte: 17/07/2026</small></div>
      {results.length === 0 ? <div className="legal-empty"><b>Nenhuma fonte encontrada.</b><p>Tente um tributo, número da lei, obrigação, documento ou tema mais amplo.</p></div> :
        <div className="legal-reference-grid">
          {results.map((item) => <article className="legal-reference-card" key={item.code}>
            <div className="legal-reference-top"><span>{item.code}</span><small>{legalAreaLabels[item.area]}</small></div>
            <h3>{item.shortTitle}</h3>
            <p className="legal-reference-title">{item.title}</p>
            <dl><div><dt>Referência</dt><dd>{item.legalReference}</dd></div><div><dt>Escopo e limite</dt><dd>{item.scope}</dd></div></dl>
            <div className="legal-supports">{item.supports.map((support) => <span key={support}>{support}</span>)}</div>
            <footer><p><b>{item.issuer}</b><small>{item.calculationCodes.length ? `${item.calculationCodes.length} módulo(s) vinculado(s)` : "Fonte de contexto e bloqueio"}</small></p><a href={item.url} target="_blank" rel="noreferrer">Abrir fonte oficial <span>↗</span></a></footer>
          </article>)}
        </div>}

      <aside className="legal-governance-note"><span>!</span><p><b>Cobertura documental não autoriza cálculo automático.</b> Uma fonte só vira regra executável depois de modelagem, casos de regressão, revisão profissional, vigência confirmada e aprovação registrada. Até lá, ela serve para pesquisa, classificação e bloqueio seguro.</p></aside>
    </section>
  );
}
