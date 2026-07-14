"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type Section = "overview" | "companies" | "simulator" | "documents";

type SavedScenario = {
  id: number;
  name: string;
  revenueCents: number;
  currentRateBps: number;
  newRateBps: number;
  costRateBps: number;
  priceAdjustmentBps: number;
  companyId: number;
  createdAt: string;
};

type Company = {
  id: number;
  name: string;
  cnpj: string | null;
  taxRegime: string;
  sector: string;
  createdAt: string;
  latestScenario: SavedScenario | null;
};

type CompanyForm = {
  name: string;
  cnpj: string;
  taxRegime: string;
  sector: string;
};

type ScenarioInputs = {
  revenue: number;
  currentRate: number;
  newRate: number;
  costRate: number;
  priceAdjustment: number;
};

type ImportedDocument = {
  name: string;
  issuer: string;
  date: string;
  value: number;
  status: "Lido" | "Sem total" | "Inválido";
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

function findXmlText(document: XMLDocument, names: string[]) {
  const elements = Array.from(document.getElementsByTagName("*"));
  for (const name of names) {
    const match = elements.find((element) => element.localName === name);
    const value = match?.textContent?.trim();
    if (value) return value;
  }
  return "";
}

function parseXmlNumber(value: string) {
  if (!value) return 0;
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatXmlDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "Data não informada";
}

function formatCnpj(value: string | null) {
  if (!value || value.length !== 14) return "CNPJ não informado";
  return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function calculateScenarioValues({ revenue, currentRate, newRate, costRate, priceAdjustment }: ScenarioInputs) {
  const safeRevenue = Math.max(revenue || 0, 1);
  const projectedRevenue = safeRevenue * (1 + priceAdjustment / 100);
  const currentTax = revenue * (currentRate / 100);
  const projectedTax = projectedRevenue * (newRate / 100);
  const costs = revenue * (costRate / 100);
  const currentMargin = revenue - costs - currentTax;
  const projectedMargin = projectedRevenue - costs - projectedTax;
  const delta = projectedTax - currentTax;
  const newRateDecimal = newRate / 100;
  const requiredPriceIncrease = newRateDecimal >= 1
    ? 0
    : Math.max(0, (((1 - currentRate / 100) / (1 - newRateDecimal)) - 1) * 100);

  return {
    projectedRevenue,
    currentTax,
    projectedTax,
    currentMargin,
    projectedMargin,
    delta,
    requiredPriceIncrease,
    currentMarginRate: (currentMargin / safeRevenue) * 100,
    projectedMarginRate: (projectedMargin / projectedRevenue) * 100,
  };
}

export default function Home() {
  const [section, setSection] = useState<Section>("overview");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyForm>({ name: "", cnpj: "", taxRegime: "Simples Nacional", sector: "Serviços B2B" });
  const [revenue, setRevenue] = useState(284650);
  const [currentRate, setCurrentRate] = useState(8.65);
  const [newRate, setNewRate] = useState(13.45);
  const [costRate, setCostRate] = useState(67.2);
  const [priceAdjustment, setPriceAdjustment] = useState(0);
  const [scenarioName, setScenarioName] = useState("Cenário base · 2027");
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [comparisonIds, setComparisonIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [importedDocuments, setImportedDocuments] = useState<ImportedDocument[]>([]);

  const activeCompany = useMemo(() => companies.find((company) => company.id === activeCompanyId) ?? null, [companies, activeCompanyId]);

  const figures = useMemo(() => calculateScenarioValues({ revenue, currentRate, newRate, costRate, priceAdjustment }), [revenue, currentRate, newRate, costRate, priceAdjustment]);

  const comparedScenarios = useMemo(() => comparisonIds.map((id) => {
    const scenario = savedScenarios.find((item) => item.id === id);
    if (!scenario) return null;
    const values = calculateScenarioValues({
      revenue: scenario.revenueCents / 100,
      currentRate: scenario.currentRateBps / 100,
      newRate: scenario.newRateBps / 100,
      costRate: scenario.costRateBps / 100,
      priceAdjustment: (scenario.priceAdjustmentBps ?? 0) / 100,
    });
    return { scenario, values };
  }).filter((item): item is NonNullable<typeof item> => item !== null), [comparisonIds, savedScenarios]);

  const importSummary = useMemo(() => ({
    total: importedDocuments.reduce((sum, item) => sum + item.value, 0),
    valid: importedDocuments.filter((item) => item.status === "Lido").length,
    issues: importedDocuments.filter((item) => item.status !== "Lido").length,
  }), [importedDocuments]);

  const portfolioInsights = useMemo(() => {
    const analyses = companies.map((company) => {
      if (!company.latestScenario) return { company, values: null };
      const item = company.latestScenario;
      return { company, values: calculateScenarioValues({ revenue: item.revenueCents / 100, currentRate: item.currentRateBps / 100, newRate: item.newRateBps / 100, costRate: item.costRateBps / 100, priceAdjustment: (item.priceAdjustmentBps ?? 0) / 100 }) };
    });
    return {
      analyzed: analyses.filter((item) => item.values).length,
      atRisk: analyses.filter((item) => item.values && item.values.projectedMargin < item.values.currentMargin).length,
      protected: analyses.filter((item) => item.values && item.values.projectedMargin >= item.values.currentMargin).length,
      pending: analyses.filter((item) => !item.values).length,
      revenue: companies.reduce((sum, company) => sum + (company.latestScenario?.revenueCents ?? 0) / 100, 0),
    };
  }, [companies]);

  useEffect(() => {
    fetch("/api/companies")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { companies?: Company[] }) => {
        const rows = data.companies ?? [];
        setCompanies(rows);
        const storedId = Number(window.localStorage.getItem("margem-clara-company"));
        const selected = rows.find((company) => company.id === storedId)?.id ?? rows[0]?.id ?? null;
        setActiveCompanyId(selected);
      })
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    if (!activeCompanyId) return;
    window.localStorage.setItem("margem-clara-company", String(activeCompanyId));
    setComparisonIds([]);
    setImportedDocuments([]);
    fetch(`/api/scenarios?companyId=${activeCompanyId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { scenarios?: SavedScenario[] }) => {
        const rows = data.scenarios ?? [];
        setSavedScenarios(rows);
        if (rows[0]) loadScenario(rows[0], false);
        else resetScenarioFields();
      })
      .catch(() => setSavedScenarios([]));
  }, [activeCompanyId]);

  async function refreshCompanies() {
    try {
      const response = await fetch("/api/companies");
      if (!response.ok) return;
      const data = (await response.json()) as { companies?: Company[] };
      setCompanies(data.companies ?? []);
    } catch {
      // The active workflow remains usable if the portfolio refresh fails.
    }
  }

  function resetScenarioFields() {
    setRevenue(100000);
    setCurrentRate(8.65);
    setNewRate(13.45);
    setCostRate(65);
    setPriceAdjustment(0);
    setScenarioName("Primeiro cenário");
  }

  async function saveScenario() {
    if (!activeCompanyId) {
      setMessage("Cadastre ou selecione uma empresa antes de salvar.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scenarioName,
          companyId: activeCompanyId,
          revenueCents: Math.round(revenue * 100),
          currentRateBps: Math.round(currentRate * 100),
          newRateBps: Math.round(newRate * 100),
          costRateBps: Math.round(costRate * 100),
          priceAdjustmentBps: Math.round(priceAdjustment * 100),
        }),
      });
      if (!response.ok) throw new Error("save failed");
      const data = (await response.json()) as { scenario: SavedScenario };
      setSavedScenarios((current) => [data.scenario, ...current].slice(0, 8));
      setCompanies((current) => current.map((company) => company.id === activeCompanyId ? { ...company, latestScenario: data.scenario } : company));
      setMessage("Cenário salvo com sucesso.");
    } catch {
      setMessage("Não foi possível salvar agora. A simulação continua disponível nesta tela.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const xmlFiles = files
      .filter((file) => file.name.toLowerCase().endsWith(".xml") && file.size <= 8 * 1024 * 1024)
      .slice(0, 100);

    const parsedDocuments = await Promise.all(xmlFiles.map(async (file): Promise<ImportedDocument> => {
      try {
        const xml = new DOMParser().parseFromString(await file.text(), "application/xml");
        if (xml.getElementsByTagName("parsererror").length) throw new Error("invalid xml");
        const value = parseXmlNumber(findXmlText(xml, ["vNF", "vServ", "ValorServicos", "ValorLiquidoNfse", "vProd", "vRec"]));
        return {
          name: file.name,
          issuer: findXmlText(xml, ["xNome", "RazaoSocial", "CNPJ", "CPF"]) || "Emitente não identificado",
          date: formatXmlDate(findXmlText(xml, ["dhEmi", "dEmi", "DataEmissao", "dCompet", "Competencia"])),
          value,
          status: value > 0 ? "Lido" : "Sem total",
        };
      } catch {
        return { name: file.name, issuer: "Documento não reconhecido", date: "—", value: 0, status: "Inválido" };
      }
    }));

    setImportedDocuments(parsedDocuments);
    setMessage(
      parsedDocuments.length
        ? `${parsedDocuments.length} XML analisado${parsedDocuments.length > 1 ? "s" : ""} localmente. Nenhum arquivo foi enviado.`
        : "Selecione XMLs válidos de até 8 MB."
    );
    event.target.value = "";
  }

  function loadScenario(item: SavedScenario, notify = true) {
    setRevenue(item.revenueCents / 100);
    setCurrentRate(item.currentRateBps / 100);
    setNewRate(item.newRateBps / 100);
    setCostRate(item.costRateBps / 100);
    setPriceAdjustment((item.priceAdjustmentBps ?? 0) / 100);
    setScenarioName(item.name);
    if (notify) setMessage("Cenário carregado.");
  }

  async function deleteScenario(item: SavedScenario) {
    if (!window.confirm(`Excluir o cenário “${item.name}”?`)) return;
    try {
      const response = await fetch(`/api/scenarios?id=${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      setSavedScenarios((current) => current.filter((scenario) => scenario.id !== item.id));
      setComparisonIds((current) => current.filter((id) => id !== item.id));
      setMessage("Cenário excluído.");
      void refreshCompanies();
    } catch {
      setMessage("Não foi possível excluir o cenário agora.");
    }
  }

  function exportScenarioReport() {
    const rows = [
      ["Relatório Margem Clara", scenarioName],
      ["Empresa", activeCompany?.name ?? "Não selecionada"],
      ["Regime tributário", activeCompany?.taxRegime ?? "Não informado"],
      ["Premissa", "Valor"],
      ["Receita mensal", revenue.toFixed(2)],
      ["Alíquota atual", `${currentRate.toFixed(2)}%`],
      ["IBS + CBS efetivos", `${newRate.toFixed(2)}%`],
      ["Reajuste simulado", `${priceAdjustment.toFixed(2)}%`],
      ["Margem atual", figures.currentMargin.toFixed(2)],
      ["Margem projetada", figures.projectedMargin.toFixed(2)],
      ["Reajuste de equilíbrio", `${figures.requiredPriceIncrease.toFixed(2)}%`],
      ["Observação", "Estimativa gerencial; valide as premissas com sua contabilidade."],
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `margem-clara-${scenarioName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cenario"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Relatório exportado em CSV.");
  }

  function useImportedRevenue() {
    if (importSummary.total <= 0) return;
    setRevenue(Math.round(importSummary.total * 100) / 100);
    setScenarioName("Cenário a partir dos XMLs");
    setPriceAdjustment(0);
    setSection("simulator");
    setMessage("Receita dos XMLs aplicada ao simulador.");
  }

  function toggleComparison(id: number) {
    setComparisonIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 2) {
        setMessage("O comparador aceita até dois cenários. Remova um para continuar.");
        return current;
      }
      return [...current, id];
    });
  }

  async function createCompany() {
    setCreatingCompany(true);
    setMessage("");
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm),
      });
      if (!response.ok) throw new Error("create failed");
      const data = (await response.json()) as { company: Company };
      setCompanies((current) => [...current, data.company].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setActiveCompanyId(data.company.id);
      setCompanyForm({ name: "", cnpj: "", taxRegime: "Simples Nacional", sector: "Serviços B2B" });
      setShowCompanyForm(false);
      setSection("simulator");
      setMessage("Empresa cadastrada. Crie o primeiro cenário para iniciar a análise.");
    } catch {
      setMessage("Revise os dados. O CNPJ deve conter 14 dígitos quando informado.");
    } finally {
      setCreatingCompany(false);
    }
  }

  function openCompany(companyId: number, target: Section = "overview") {
    setActiveCompanyId(companyId);
    setSection(target);
    setMessage("");
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
          <button className={section === "companies" ? "active" : ""} onClick={() => setSection("companies")}>
            <span className="nav-icon">▦</span>Empresas
          </button>
          <button className={section === "simulator" ? "active" : ""} onClick={() => setSection("simulator")}>
            <span className="nav-icon">↗</span>Simulador
          </button>
          <button className={section === "documents" ? "active" : ""} onClick={() => setSection("documents")}>
            <span className="nav-icon">▤</span>Documentos
          </button>
        </nav>

        <div className="sidebar-insight">
          <span className="eyebrow">Cobertura da carteira</span>
          <strong>{portfolioInsights.analyzed} de {companies.length} analisadas</strong>
          <div className="progress-track"><span style={{ width: `${companies.length ? (portfolioInsights.analyzed / companies.length) * 100 : 0}%` }} /></div>
          <p>{portfolioInsights.pending ? `${portfolioInsights.pending} empresa${portfolioInsights.pending > 1 ? "s" : ""} sem cenário.` : "Toda a carteira possui análise."}</p>
        </div>

        <button className="support-button"><span>?</span> Central de ajuda</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="company-label">EMPRESA ANALISADA</p>
            <select className="company-select" aria-label="Empresa analisada" value={activeCompanyId ?? ""} onChange={(event) => setActiveCompanyId(Number(event.target.value))}>
              {!companies.length && <option value="">Carregando carteira…</option>}
              {companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}
            </select>
          </div>
          <div className="topbar-actions">
            <span className="year-chip"><i /> Ano teste 2026</span>
            <button className="notification" aria-label="Notificações">•</button>
            <div className="avatar" aria-label="Perfil de Marina Costa">MC</div>
          </div>
        </header>

        {section === "companies" && (
          <div className="page-content companies-page">
            <div className="page-heading">
              <div><p className="kicker">CARTEIRA DE CLIENTES</p><h1>Empresas monitoradas</h1><p>Priorize clientes por risco de margem e mantenha cada análise separada.</p></div>
              <button className="primary-button" onClick={() => setShowCompanyForm((current) => !current)}>{showCompanyForm ? "Fechar cadastro" : "Adicionar empresa"}</button>
            </div>

            {message && <div className="toast" role="status">{message}</div>}

            {showCompanyForm && <form className="panel company-form" onSubmit={(event) => { event.preventDefault(); void createCompany(); }}>
              <div className="panel-heading"><div><span className="eyebrow">NOVO CLIENTE</span><h3>Dados essenciais da empresa</h3></div><span className="editable-chip">Carteira privada</span></div>
              <div className="company-form-grid">
                <label>Razão social<input required value={companyForm.name} onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Horizonte Serviços Ltda." /></label>
                <label>CNPJ (opcional)<input inputMode="numeric" value={companyForm.cnpj} onChange={(event) => setCompanyForm((current) => ({ ...current, cnpj: event.target.value.replace(/\D/g, "").slice(0, 14) }))} placeholder="14 dígitos" /></label>
                <label>Regime tributário<select value={companyForm.taxRegime} onChange={(event) => setCompanyForm((current) => ({ ...current, taxRegime: event.target.value }))}><option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option><option>MEI</option></select></label>
                <label>Setor<input required value={companyForm.sector} onChange={(event) => setCompanyForm((current) => ({ ...current, sector: event.target.value }))} placeholder="Ex.: Distribuição B2B" /></label>
              </div>
              <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowCompanyForm(false)}>Cancelar</button><button className="primary-button" disabled={creatingCompany || !companyForm.name.trim() || !companyForm.sector.trim()}>{creatingCompany ? "Cadastrando…" : "Cadastrar e analisar"}</button></div>
            </form>}

            <section className="portfolio-metrics" aria-label="Indicadores da carteira">
              <article><span>Empresas</span><strong>{companies.length}</strong><small>{portfolioInsights.analyzed} com cenário salvo</small></article>
              <article className="risk"><span>Margem em risco</span><strong>{portfolioInsights.atRisk}</strong><small>Precisam de ação comercial</small></article>
              <article className="protected"><span>Margem protegida</span><strong>{portfolioInsights.protected}</strong><small>Reajuste suficiente</small></article>
              <article><span>Receita monitorada</span><strong>{compactCurrency.format(portfolioInsights.revenue)}</strong><small>Últimos cenários da carteira</small></article>
            </section>

            <section className="company-grid">
              {companies.map((company) => {
                const latest = company.latestScenario;
                const values = latest ? calculateScenarioValues({ revenue: latest.revenueCents / 100, currentRate: latest.currentRateBps / 100, newRate: latest.newRateBps / 100, costRate: latest.costRateBps / 100, priceAdjustment: (latest.priceAdjustmentBps ?? 0) / 100 }) : null;
                const protectedMargin = values ? values.projectedMargin >= values.currentMargin : false;
                return <article className={`company-card ${activeCompanyId === company.id ? "active-company" : ""}`} key={company.id}>
                  <div className="company-card-top"><span className="company-monogram">{company.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className={`portfolio-status ${!values ? "pending" : protectedMargin ? "protected" : "risk"}`}>{!values ? "Sem análise" : protectedMargin ? "Protegida" : "Em risco"}</span></div>
                  <h2>{company.name}</h2>
                  <p>{formatCnpj(company.cnpj)} · {company.taxRegime}</p>
                  <span className="sector-chip">{company.sector}</span>
                  {values ? <div className="company-analysis"><div><span>Receita</span><strong>{compactCurrency.format(latest!.revenueCents / 100)}</strong></div><div><span>Margem projetada</span><strong>{values.projectedMarginRate.toFixed(1).replace(".", ",")}%</strong></div><div><span>Reajuste</span><strong>{((latest!.priceAdjustmentBps ?? 0) / 100).toFixed(1).replace(".", ",")}%</strong></div></div> : <div className="company-empty-analysis">Crie o primeiro cenário para medir o risco tributário.</div>}
                  <div className="company-actions"><button onClick={() => openCompany(company.id, "overview")}>Abrir painel</button><button onClick={() => openCompany(company.id, "simulator")}>{values ? "Novo cenário" : "Analisar agora"}</button></div>
                </article>;
              })}
            </section>
          </div>
        )}

        {section === "overview" && (
          <div className="page-content">
            <div className="page-heading">
              <div>
                <p className="kicker">EMPRESA ATIVA · {activeCompany?.taxRegime?.toUpperCase() ?? "CARREGANDO"}</p>
                <h1>{activeCompany?.name ?? "Sua empresa"}</h1>
                <p>Acompanhe o impacto estimado da transição tributária neste cliente.</p>
              </div>
              <button className="primary-button" onClick={() => setSection("simulator")}>Abrir simulador <span>→</span></button>
            </div>

            <section className="impact-banner">
              <div className="impact-symbol">↘</div>
              <div>
                <span className="eyebrow">ALERTA DE MARGEM</span>
                <h2>{figures.projectedMargin < figures.currentMargin ? `Margem pode cair ${Math.abs(figures.currentMarginRate - figures.projectedMarginRate).toFixed(1).replace(".", ",")} p.p.` : "O reajuste informado protege a margem"}</h2>
                <p>Compare a carga estimada e teste o reajuste necessário antes de renovar contratos ou tabelas de preço.</p>
              </div>
              <button onClick={() => setSection("simulator")}>Ver recomendações</button>
            </section>

            <section className="metrics-grid" aria-label="Indicadores principais">
              <article className="metric-card">
                <span>Receita analisada</span>
                <strong>{currency.format(revenue)}</strong>
                <small><b>{savedScenarios.length ? "Cenário atualizado" : "Estimativa inicial"}</b> para {activeCompany?.sector ?? "a operação"}</small>
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
              <div><p className="kicker">PLANEJAMENTO · {activeCompany?.name?.toUpperCase() ?? "EMPRESA"}</p><h1>Simulador de margem</h1><p>Ajuste as premissas; este histórico pertence somente à empresa selecionada.</p></div>
              <div className="heading-actions"><button className="secondary-button" onClick={exportScenarioReport}>Exportar CSV</button><button className="primary-button" onClick={saveScenario} disabled={saving || !scenarioName.trim() || revenue < 1000}>{saving ? "Salvando…" : "Salvar cenário"}</button></div>
            </div>

            {message && <div className="toast" role="status">{message}</div>}

            <div className="simulator-grid">
              <section className="panel assumptions-panel">
                <div className="panel-heading"><div><span className="eyebrow">PREMISSAS</span><h3>Configure o cenário</h3></div><span className="editable-chip">Editável</span></div>
                <label>Nome do cenário<input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /></label>
                <div className="field-row">
                  <label>Receita mensal (R$)<input type="number" min="1000" step="1000" value={revenue} onChange={(event) => setRevenue(Number(event.target.value))} /></label>
                  <label>Reajuste de preço (%)<input type="number" min="0" max="100" step="0.1" value={priceAdjustment} onChange={(event) => setPriceAdjustment(Number(event.target.value))} /></label>
                </div>
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
                  <b>Reajuste de equilíbrio: {figures.requiredPriceIncrease.toFixed(1).replace(".", ",")}%</b>
                  <p>Compensa a diferença de alíquota mantendo os custos operacionais em valor.</p>
                  <button onClick={() => setPriceAdjustment(Number(figures.requiredPriceIncrease.toFixed(2)))}>Aplicar reajuste sugerido</button>
                </div>
              </section>
            </div>

            <section className="panel executive-panel">
              <div className="print-only print-brand"><span className="brand-mark">mc</span><strong>margemclara</strong><small>{activeCompany?.name ?? "Resumo executivo"}</small></div>
              <div className="panel-heading">
                <div><span className="eyebrow">RESUMO EXECUTIVO</span><h3>Decisão recomendada</h3></div>
                <button className="text-button print-button" onClick={() => window.print()}>Imprimir resumo</button>
              </div>
              <div className="executive-grid">
                <div className={`executive-status ${figures.projectedMargin >= figures.currentMargin ? "protected" : "attention"}`}>
                  <span>{figures.projectedMargin >= figures.currentMargin ? "MARGEM PROTEGIDA" : "MARGEM EM RISCO"}</span>
                  <strong>{figures.projectedMargin >= figures.currentMargin ? "O reajuste cobre a transição" : "O reajuste ainda é insuficiente"}</strong>
                  <p>A margem projetada fica em {currency.format(figures.projectedMargin)}, uma diferença de {currency.format(Math.abs(figures.projectedMargin - figures.currentMargin))} frente ao cenário atual.</p>
                </div>
                <div className="decision-list">
                  <div><span>01</span><p><b>Reajuste aplicado</b><small>{priceAdjustment.toFixed(2).replace(".", ",")}% de {figures.requiredPriceIncrease.toFixed(2).replace(".", ",")}% recomendados</small></p><strong>{priceAdjustment >= figures.requiredPriceIncrease ? "Coberto" : `Faltam ${(figures.requiredPriceIncrease - priceAdjustment).toFixed(2).replace(".", ",")} p.p.`}</strong></div>
                  <div><span>02</span><p><b>Impacto tributário</b><small>Comparação mensal entre os dois regimes</small></p><strong>{figures.delta >= 0 ? "+ " : "− "}{currency.format(Math.abs(figures.delta))}</strong></div>
                  <div><span>03</span><p><b>Receita projetada</b><small>Após o reajuste informado</small></p><strong>{currency.format(figures.projectedRevenue)}</strong></div>
                </div>
              </div>
              <p className="executive-note">Estimativa gerencial para {activeCompany?.name ?? "a empresa"}, baseada nas premissas informadas em {new Date().toLocaleDateString("pt-BR")}. Valide enquadramento, créditos e alíquotas com sua contabilidade.</p>
            </section>

            {comparedScenarios.length > 0 && <section className="panel compare-panel">
              <div className="panel-heading"><div><span className="eyebrow">COMPARADOR</span><h3>Cenários lado a lado</h3></div><button className="text-button" onClick={() => setComparisonIds([])}>Limpar seleção</button></div>
              <div className="compare-grid">
                {comparedScenarios.map(({ scenario, values }) => <article key={scenario.id}>
                  <span className="compare-label">{scenario.name}</span>
                  <strong>{currency.format(values.projectedMargin)}</strong>
                  <small>margem projetada · {values.projectedMarginRate.toFixed(1).replace(".", ",")}%</small>
                  <dl><div><dt>Receita</dt><dd>{currency.format(scenario.revenueCents / 100)}</dd></div><div><dt>IBS + CBS</dt><dd>{(scenario.newRateBps / 100).toFixed(2).replace(".", ",")}%</dd></div><div><dt>Reajuste</dt><dd>{((scenario.priceAdjustmentBps ?? 0) / 100).toFixed(2).replace(".", ",")}%</dd></div><div><dt>Tributos</dt><dd>{currency.format(values.projectedTax)}</dd></div></dl>
                </article>)}
                {comparedScenarios.length === 1 && <div className="compare-empty"><span>＋</span><b>Selecione mais um cenário</b><p>Use o botão “Comparar” no histórico abaixo.</p></div>}
              </div>
              {comparedScenarios.length === 2 && <div className="compare-verdict"><span>Melhor margem projetada</span><strong>{[...comparedScenarios].sort((a, b) => b.values.projectedMargin - a.values.projectedMargin)[0].scenario.name}</strong><small>Diferença de {currency.format(Math.abs(comparedScenarios[0].values.projectedMargin - comparedScenarios[1].values.projectedMargin))}</small></div>}
            </section>}

            <section className="panel saved-panel">
              <div className="panel-heading"><div><span className="eyebrow">HISTÓRICO</span><h3>Cenários salvos</h3></div><span>{savedScenarios.length} registros · selecione até 2</span></div>
              {savedScenarios.length ? (
                <div className="saved-list">{savedScenarios.map((item) => (
                  <div className="saved-row" key={item.id}>
                    <button className="saved-load" onClick={() => loadScenario(item)}>
                      <span><b>{item.name}</b><small>{new Date(item.createdAt).toLocaleDateString("pt-BR")} · receita {currency.format(item.revenueCents / 100)}</small></span>
                      <span><b>{(item.newRateBps / 100).toFixed(2).replace(".", ",")}%</b><small>IBS + CBS</small></span>
                      <i>Carregar →</i>
                    </button>
                    <button className={`compare-toggle ${comparisonIds.includes(item.id) ? "selected" : ""}`} onClick={() => toggleComparison(item.id)} aria-pressed={comparisonIds.includes(item.id)}>{comparisonIds.includes(item.id) ? "Selecionado" : "Comparar"}</button>
                    <button className="delete-button" onClick={() => deleteScenario(item)} aria-label={`Excluir ${item.name}`}>×</button>
                  </div>
                ))}</div>
              ) : <div className="empty-state"><span>＋</span><b>Nenhum cenário salvo</b><p>Ajuste as premissas e salve sua primeira comparação.</p></div>}
            </section>
          </div>
        )}

        {section === "documents" && (
          <div className="page-content documents-page">
            <div className="page-heading">
              <div><p className="kicker">BASE DE CÁLCULO · {activeCompany?.name?.toUpperCase() ?? "EMPRESA"}</p><h1>Documentos fiscais</h1><p>Leia os XMLs localmente e leve a receita identificada ao cenário desta empresa.</p></div>
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

            {importedDocuments.length > 0 && <>
              <section className="document-metrics">
                <article><span>Documentos lidos</span><strong>{importedDocuments.length}</strong><small>{importSummary.issues ? `${importSummary.issues} exigem revisão` : "Todos reconhecidos"}</small></article>
                <article><span>Valor identificado</span><strong>{currency.format(importSummary.total)}</strong><small>Somatório dos XMLs válidos</small></article>
                <article className="metric-action"><span>Levar para o cenário</span><strong>{importSummary.valid} notas válidas</strong><button onClick={useImportedRevenue} disabled={!importSummary.total}>Usar como receita →</button></article>
              </section>

              <section className="panel imported-panel">
                <div className="panel-heading"><div><span className="eyebrow">LEITURA LOCAL</span><h3>Documentos analisados</h3></div><button className="text-button" onClick={() => setImportedDocuments([])}>Limpar análise</button></div>
                <div className="table-wrap"><table className="import-table"><thead><tr><th>Arquivo</th><th>Emitente</th><th>Emissão</th><th>Valor</th><th>Status</th></tr></thead><tbody>{importedDocuments.map((item) => <tr key={item.name}><td><b>{item.name}</b></td><td>{item.issuer}</td><td>{item.date}</td><td>{item.value ? currency.format(item.value) : "—"}</td><td><span className={item.status === "Lido" ? "ok-status" : "review-status"}>{item.status}</span></td></tr>)}</tbody></table></div>
              </section>
            </>}

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
