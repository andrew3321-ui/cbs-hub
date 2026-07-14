"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type Section = "overview" | "simulator" | "documents";

type SavedScenario = {
  id: number;
  name: string;
  revenueCents: number;
  currentRateBps: number;
  newRateBps: number;
  costRateBps: number;
  createdAt: string;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const products = [
  { name: "Consultoria mensal", share: "34%", current: "8,65%", projected: "13,45%", impact: "+ R$ 3.860", tone: "danger" },
  { name: "Implantação de processos", share: "26%", current: "8,65%", projected: "11,90%", impact: "+ R$ 2.170", tone: "danger" },
  { name: "Treinamento corporativo", share: "18%", current: "8,65%", projected: "9,20%", impact: "+ R$ 282", tone: "neutral" },
  { name: "Licenciamento de conteúdo", share: "14%", current: "8,65%", projected: "7,80%", impact: "− R$ 338", tone: "good" },
];

const documentRows = [
  { name: "NFS-e · Prefeitura de São Paulo", date: "08 jul 2026", count: "42 notas", status: "Conciliado" },
  { name: "NF-e de entradas · XML", date: "05 jul 2026", count: "117 notas", status: "Conciliado" },
  { name: "Serviços tomados · Junho", date: "30 jun 2026", count: "28 notas", status: "Revisar 3" },
];

export default function Home() {
  const [section, setSection] = useState<Section>("overview");
  const [revenue, setRevenue] = useState(284650);
  const [currentRate, setCurrentRate] = useState(8.65);
  const [newRate, setNewRate] = useState(13.45);
  const [costRate, setCostRate] = useState(67.2);
  const [scenarioName, setScenarioName] = useState("Cenário base · 2027");
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [importedFiles, setImportedFiles] = useState<string[]>([]);

  const figures = useMemo(() => {
    const currentTax = revenue * (currentRate / 100);
    const projectedTax = revenue * (newRate / 100);
    const costs = revenue * (costRate / 100);
    const currentMargin = revenue - costs - currentTax;
    const projectedMargin = revenue - costs - projectedTax;
    const delta = projectedTax - currentTax;
    return {
      currentTax,
      projectedTax,
      currentMargin,
      projectedMargin,
      delta,
      currentMarginRate: (currentMargin / revenue) * 100,
      projectedMarginRate: (projectedMargin / revenue) * 100,
    };
  }, [revenue, currentRate, newRate, costRate]);

  useEffect(() => {
    fetch("/api/scenarios")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { scenarios?: SavedScenario[] }) => setSavedScenarios(data.scenarios ?? []))
      .catch(() => setSavedScenarios([]));
  }, []);

  async function saveScenario() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scenarioName,
          revenueCents: Math.round(revenue * 100),
          currentRateBps: Math.round(currentRate * 100),
          newRateBps: Math.round(newRate * 100),
          costRateBps: Math.round(costRate * 100),
        }),
      });
      if (!response.ok) throw new Error("save failed");
      const data = (await response.json()) as { scenario: SavedScenario };
      setSavedScenarios((current) => [data.scenario, ...current].slice(0, 8));
      setMessage("Cenário salvo com sucesso.");
    } catch {
      setMessage("Não foi possível salvar agora. A simulação continua disponível nesta tela.");
    } finally {
      setSaving(false);
    }
  }

  function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const xmlFiles = files.filter((file) => file.name.toLowerCase().endsWith(".xml"));
    setImportedFiles(xmlFiles.map((file) => file.name));
    setMessage(
      xmlFiles.length
        ? `${xmlFiles.length} arquivo${xmlFiles.length > 1 ? "s" : ""} XML analisado${xmlFiles.length > 1 ? "s" : ""} localmente.`
        : "Selecione arquivos no formato XML."
    );
    event.target.value = "";
  }

  function loadScenario(item: SavedScenario) {
    setRevenue(item.revenueCents / 100);
    setCurrentRate(item.currentRateBps / 100);
    setNewRate(item.newRateBps / 100);
    setCostRate(item.costRateBps / 100);
    setScenarioName(item.name);
    setMessage("Cenário carregado.");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand" aria-label="Margem Clara">
          <span className="brand-mark">mc</span>
          <span>margem<span>clara</span></span>
        </div>

        <nav className="main-nav" aria-label="Navegação principal">
          <button className={section === "overview" ? "active" : ""} onClick={() => setSection("overview")}>
            <span className="nav-icon">⌂</span>Visão geral
          </button>
          <button className={section === "simulator" ? "active" : ""} onClick={() => setSection("simulator")}>
            <span className="nav-icon">↗</span>Simulador
          </button>
          <button className={section === "documents" ? "active" : ""} onClick={() => setSection("documents")}>
            <span className="nav-icon">▤</span>Documentos
          </button>
        </nav>

        <div className="sidebar-insight">
          <span className="eyebrow">Transição fiscal</span>
          <strong>Você está em 62%</strong>
          <div className="progress-track"><span /></div>
          <p>Faltam revisar 3 categorias de receita.</p>
        </div>

        <button className="support-button"><span>?</span> Central de ajuda</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="company-label">EMPRESA ANALISADA</p>
            <select className="company-select" aria-label="Empresa analisada">
              <option>Aurora Consultoria Ltda.</option>
              <option>Empresa demonstrativa</option>
            </select>
          </div>
          <div className="topbar-actions">
            <span className="year-chip"><i /> Ano teste 2026</span>
            <button className="notification" aria-label="Notificações">•</button>
            <div className="avatar" aria-label="Perfil de Marina Costa">MC</div>
          </div>
        </header>

        {section === "overview" && (
          <div className="page-content">
            <div className="page-heading">
              <div>
                <p className="kicker">SEGUNDA-FEIRA, 13 DE JULHO</p>
                <h1>Bom dia, Marina.</h1>
                <p>Acompanhe o impacto estimado da transição tributária na sua operação.</p>
              </div>
              <button className="primary-button" onClick={() => setSection("simulator")}>Abrir simulador <span>→</span></button>
            </div>

            <section className="impact-banner">
              <div className="impact-symbol">↘</div>
              <div>
                <span className="eyebrow">ALERTA DE MARGEM</span>
                <h2>Sua margem pode cair {Math.abs(figures.currentMarginRate - figures.projectedMarginRate).toFixed(1).replace(".", ",")} p.p.</h2>
                <p>O aumento projetado concentra-se em consultoria mensal e implantação. Simule um reajuste antes de renovar contratos.</p>
              </div>
              <button onClick={() => setSection("simulator")}>Ver recomendações</button>
            </section>

            <section className="metrics-grid" aria-label="Indicadores principais">
              <article className="metric-card">
                <span>Receita analisada</span>
                <strong>{currency.format(revenue)}</strong>
                <small><b>↑ 8,4%</b> vs. mês anterior</small>
              </article>
              <article className="metric-card">
                <span>Tributos no cenário atual</span>
                <strong>{currency.format(figures.currentTax)}</strong>
                <small>Alíquota efetiva de {currentRate.toFixed(2).replace(".", ",")}%</small>
              </article>
              <article className="metric-card accent-card">
                <span>Projeção IBS + CBS</span>
                <strong>{currency.format(figures.projectedTax)}</strong>
                <small><b>+ {currency.format(figures.delta)}</b> de exposição</small>
              </article>
              <article className="metric-card">
                <span>Margem projetada</span>
                <strong>{figures.projectedMarginRate.toFixed(1).replace(".", ",")}%</strong>
                <small><em>↓ {(figures.currentMarginRate - figures.projectedMarginRate).toFixed(1).replace(".", ",")} p.p.</em> sem reajuste</small>
              </article>
            </section>

            <div className="overview-grid">
              <section className="panel chart-panel">
                <div className="panel-heading">
                  <div><span className="eyebrow">EVOLUÇÃO MENSAL</span><h3>Tributos sobre receita</h3></div>
                  <div className="legend"><span className="current-dot" /> Atual <span className="future-dot" /> Projetado</div>
                </div>
                <div className="chart" aria-label="Comparação mensal entre tributos atuais e projetados">
                  {[42, 48, 45, 56, 52, 61, 58, 66, 62, 72, 68, 78].map((height, index) => (
                    <div className="bar-group" key={index}>
                      <div className="bars"><span style={{ height: `${height}%` }} /><span style={{ height: `${height + 16}%` }} /></div>
                      <small>{["Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"][index]}</small>
                    </div>
                  ))}
                </div>
                <div className="chart-summary">
                  <span>Exposição anual estimada</span><strong>{compactCurrency.format(figures.delta * 12)}</strong><small>se o faturamento permanecer estável</small>
                </div>
              </section>

              <section className="panel actions-panel">
                <div className="panel-heading"><div><span className="eyebrow">PRÓXIMAS AÇÕES</span><h3>O que merece atenção</h3></div><span className="count-badge">3</span></div>
                <button onClick={() => setSection("simulator")} className="action-row">
                  <span className="action-icon urgent">!</span><span><b>Revisar preço da consultoria</b><small>Impacto potencial de R$ 3,8 mil/mês</small></span><i>→</i>
                </button>
                <button onClick={() => setSection("documents")} className="action-row">
                  <span className="action-icon">▤</span><span><b>Classificar 3 notas de entrada</b><small>Créditos ainda não considerados</small></span><i>→</i>
                </button>
                <button onClick={() => setSection("simulator")} className="action-row">
                  <span className="action-icon good">✓</span><span><b>Comparar cenários de crédito</b><small>Economia possível de R$ 1,2 mil/mês</small></span><i>→</i>
                </button>
              </section>
            </div>

            <section className="panel product-panel">
              <div className="panel-heading"><div><span className="eyebrow">POR CATEGORIA</span><h3>Onde o impacto se concentra</h3></div><button className="text-button" onClick={() => setSection("simulator")}>Analisar tudo →</button></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Receita</th><th>Participação</th><th>Atual</th><th>Projetado</th><th>Impacto mensal</th></tr></thead>
                  <tbody>{products.map((product) => <tr key={product.name}><td><b>{product.name}</b></td><td>{product.share}</td><td>{product.current}</td><td>{product.projected}</td><td><span className={`impact-pill ${product.tone}`}>{product.impact}</span></td></tr>)}</tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {section === "simulator" && (
          <div className="page-content simulator-page">
            <div className="page-heading">
              <div><p className="kicker">PLANEJAMENTO</p><h1>Simulador de margem</h1><p>Ajuste as premissas e compare o cenário atual com a transição.</p></div>
              <button className="primary-button" onClick={saveScenario} disabled={saving}>{saving ? "Salvando…" : "Salvar cenário"}</button>
            </div>

            {message && <div className="toast" role="status">{message}</div>}

            <div className="simulator-grid">
              <section className="panel assumptions-panel">
                <div className="panel-heading"><div><span className="eyebrow">PREMISSAS</span><h3>Configure o cenário</h3></div><span className="editable-chip">Editável</span></div>
                <label>Nome do cenário<input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /></label>
                <label>Receita mensal (R$)<input type="number" min="1000" step="1000" value={revenue} onChange={(event) => setRevenue(Number(event.target.value))} /></label>
                <div className="field-row">
                  <label>Alíquota atual (%)<input type="number" min="0" max="100" step="0.05" value={currentRate} onChange={(event) => setCurrentRate(Number(event.target.value))} /></label>
                  <label>IBS + CBS efetivos (%)<input type="number" min="0" max="100" step="0.05" value={newRate} onChange={(event) => setNewRate(Number(event.target.value))} /></label>
                </div>
                <label>Custos operacionais (% da receita)<input type="range" min="20" max="90" step="0.1" value={costRate} onChange={(event) => setCostRate(Number(event.target.value))} /><span className="range-value">{costRate.toFixed(1).replace(".", ",")}%</span></label>
                <p className="helper-text">Use as alíquotas efetivas estimadas pelo seu contador. Este MVP não substitui parecer fiscal.</p>
              </section>

              <section className="panel result-panel">
                <div className="result-header"><span>Resultado projetado</span><small>Cenário mensal</small></div>
                <strong className="result-number">{currency.format(figures.projectedMargin)}</strong>
                <p>margem líquida de <b>{figures.projectedMarginRate.toFixed(1).replace(".", ",")}%</b></p>
                <div className="comparison-bars">
                  <div><span>Margem atual</span><b>{currency.format(figures.currentMargin)}</b><i><em style={{ width: `${Math.max(figures.currentMarginRate, 2)}%` }} /></i></div>
                  <div><span>Margem projetada</span><b>{currency.format(figures.projectedMargin)}</b><i><em className="projected" style={{ width: `${Math.max(figures.projectedMarginRate, 2)}%` }} /></i></div>
                </div>
                <div className="recommendation">
                  <span>RECOMENDAÇÃO</span>
                  <b>Reajuste mínimo sugerido: {((figures.delta / revenue) * 100).toFixed(1).replace(".", ",")}%</b>
                  <p>Esse reajuste recompõe a exposição tributária estimada, mantendo as demais premissas.</p>
                </div>
              </section>
            </div>

            <section className="panel saved-panel">
              <div className="panel-heading"><div><span className="eyebrow">HISTÓRICO</span><h3>Cenários salvos</h3></div><span>{savedScenarios.length} registros</span></div>
              {savedScenarios.length ? (
                <div className="saved-list">{savedScenarios.map((item) => (
                  <button key={item.id} onClick={() => loadScenario(item)}>
                    <span><b>{item.name}</b><small>{new Date(item.createdAt).toLocaleDateString("pt-BR")} · receita {currency.format(item.revenueCents / 100)}</small></span>
                    <span><b>{(item.newRateBps / 100).toFixed(2).replace(".", ",")}%</b><small>IBS + CBS</small></span>
                    <i>Carregar →</i>
                  </button>
                ))}</div>
              ) : <div className="empty-state"><span>＋</span><b>Nenhum cenário salvo</b><p>Ajuste as premissas e salve sua primeira comparação.</p></div>}
            </section>
          </div>
        )}

        {section === "documents" && (
          <div className="page-content documents-page">
            <div className="page-heading">
              <div><p className="kicker">BASE DE CÁLCULO</p><h1>Documentos fiscais</h1><p>Organize as notas usadas nas projeções e identifique lacunas.</p></div>
              <label className="primary-button file-button">Importar XML<input type="file" accept=".xml,text/xml,application/xml" multiple onChange={handleFileImport} /></label>
            </div>

            {message && <div className="toast" role="status">{message}</div>}

            <section className="upload-zone">
              <div className="upload-symbol">⇧</div>
              <h2>Traga suas notas fiscais</h2>
              <p>Selecione arquivos XML. Nesta versão, a leitura acontece no seu navegador e nenhum documento é enviado.</p>
              <label className="secondary-button">Selecionar arquivos<input type="file" accept=".xml,text/xml,application/xml" multiple onChange={handleFileImport} /></label>
              <small>XML · múltiplos arquivos permitidos</small>
            </section>

            {importedFiles.length > 0 && <section className="import-success"><span>✓</span><div><b>{importedFiles.length} arquivo{importedFiles.length > 1 ? "s" : ""} pronto{importedFiles.length > 1 ? "s" : ""} para classificação</b><p>{importedFiles.slice(0, 3).join(" · ")}{importedFiles.length > 3 ? ` · +${importedFiles.length - 3}` : ""}</p></div><button onClick={() => setImportedFiles([])}>Limpar</button></section>}

            <section className="panel docs-panel">
              <div className="panel-heading"><div><span className="eyebrow">ÚLTIMAS IMPORTAÇÕES</span><h3>Conciliação fiscal</h3></div><span className="health-chip"><i /> 96% conciliado</span></div>
              <div className="docs-list">{documentRows.map((doc) => (
                <div className="doc-row" key={doc.name}><span className="doc-icon">XML</span><span><b>{doc.name}</b><small>{doc.date}</small></span><span>{doc.count}</span><span className={doc.status.startsWith("Revisar") ? "review-status" : "ok-status"}>{doc.status}</span><button aria-label={`Mais opções para ${doc.name}`}>•••</button></div>
              ))}</div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
