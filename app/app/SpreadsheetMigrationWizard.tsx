"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Company = { id: number; name: string };
type Mapping = Record<string, string>;
type PreviewRow = { rowNumber: number; documentKey: string; normalized: Record<string, string | number | null>; issues: string[]; status: string };
type Preview = { filename: string; format: string; headers: string[]; mapping: Mapping; rows: PreviewRow[]; summary: { total: number; accepted: number; invalid: number; formulasDiscarded: number }; missingColumns: string[]; formulaCells: Array<{ row: number; column: string }>; sourceHash: string; rawFilePersisted: boolean };
type Batch = { id: string; companyName: string; periodKey: string; filename: string; format: string; model: string; status: string; totalRows: number; acceptedRows: number; invalidRows: number; duplicateRows: number; divergentRows: number; formulaCellsDiscarded: number; rawFilePersisted: boolean; report: { errors?: Array<{ rowNumber: number; documentKey: string; status: string; issues: string[] }> }; rolledBackAt: string | null; createdAt: string; createdByName: string };
type Profile = { id: string; name: string; model: string; columnMapping: Mapping };

const modelLabels: Record<string, string> = { revenue: "Faturamento", taxes: "Impostos", withholdings: "Retenções", services: "Serviços", products: "Produtos", pending: "Pendências" };
const fieldLabels: Record<string, string> = { ignore: "Ignorar", document_key: "Chave do documento", date: "Data", amount: "Valor", description: "Descrição", tax_code: "Tributo", municipality_code: "Código do município", ncm: "NCM", cest: "CEST", status: "Status", note: "Observação" };

function periodNow() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
async function responseJson<T>(response: Response) { return await response.json() as T & { error?: string }; }

export default function SpreadsheetMigrationWizard({ companies, activeCompanyId }: { companies: Company[]; activeCompanyId: number | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState("revenue");
  const [companyId, setCompanyId] = useState(activeCompanyId ?? companies[0]?.id ?? 0);
  const [periodKey, setPeriodKey] = useState(periodNow);
  const [profileName, setProfileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [mappingDirty, setMappingDirty] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "commit" | "rollback">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/spreadsheet-imports", { cache: "no-store" });
      const data = await responseJson<{ batches?: Batch[]; profiles?: Profile[] }>(response);
      if (!response.ok) throw new Error(data.error || "Falha ao carregar o histórico.");
      setBatches(data.batches ?? []); setProfiles(data.profiles ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar o histórico."); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadHistory(), 0); return () => window.clearTimeout(timer); }, [loadHistory]);

  async function send(action: "preview" | "commit") {
    if (!file) { setError("Escolha um arquivo CSV ou XLSX."); return; }
    setBusy(action); setError(""); setSuccess("");
    try {
      const form = new FormData(); form.set("action", action); form.set("file", file); form.set("model", model); form.set("mapping", JSON.stringify(mapping));
      if (action === "commit") { form.set("companyId", String(companyId)); form.set("periodKey", periodKey); if (profileName.trim()) form.set("profileName", profileName.trim()); }
      const response = await fetch("/api/spreadsheet-imports", { method: "POST", body: form });
      const data = await responseJson<{ preview?: Preview; batch?: { id: string; report: unknown } }>(response);
      if (!response.ok) throw new Error(data.error || "Não foi possível processar a planilha.");
      if (data.preview) { setPreview(data.preview); setMapping(data.preview.mapping); setMappingDirty(false); setSuccess("Preview concluído. Revise o mapeamento e as pendências antes de confirmar."); }
      if (data.batch) { setSelectedBatch(data.batch.id); setSuccess("Lote confirmado. O arquivo bruto foi descartado e o relatório de conciliação foi registrado."); setPreview(null); setMappingDirty(false); setFile(null); await loadHistory(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível processar a planilha."); }
    finally { setBusy(""); }
  }

  async function rollback(batchId: string) {
    if (!window.confirm("Reverter integralmente as linhas deste lote? O evento de rollback permanecerá na auditoria.")) return;
    setBusy("rollback"); setError("");
    try {
      const response = await fetch("/api/spreadsheet-imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rollback", batchId }) });
      const data = await responseJson<{ deletedRows?: number }>(response);
      if (!response.ok) throw new Error(data.error || "Não foi possível reverter o lote.");
      setSuccess(`Rollback concluído: ${data.deletedRows ?? 0} linha(s) removida(s), com evento preservado.`); await loadHistory();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível reverter o lote."); }
    finally { setBusy(""); }
  }

  const activeBatch = useMemo(() => batches.find((batch) => batch.id === selectedBatch) ?? batches[0] ?? null, [batches, selectedBatch]);
  const mappingComplete = preview && !mappingDirty && preview.missingColumns.length === 0 && preview.headers.every((header) => Boolean(mapping[header]));

  return <div className="page-content spreadsheet-page">
    <div className="page-heading"><div><p className="kicker">MIGRAÇÃO SEGURA · CSV E XLSX</p><h1>Traga seus controles sem importar fórmulas opacas</h1><p>Mapeie colunas, confira o preview e reconcilie cada documento. Valores entram como evidência — nunca como regra legal.</p></div><div className="template-actions"><span>MODELOS CBSHUB</span><a href={`/api/spreadsheet-imports?template=${model}&format=csv`}>Baixar CSV</a><a href={`/api/spreadsheet-imports?template=${model}&format=xlsx`}>Baixar XLSX</a></div></div>
    {error && <div className="toast error" role="alert">{error}</div>}{success && <div className="toast" role="status">{success}</div>}
    <section className="spreadsheet-layout">
      <section className="panel spreadsheet-wizard">
        <div className="spreadsheet-steps"><span className={file ? "done" : "active"}>01 Arquivo</span><span className={preview ? "done" : file ? "active" : ""}>02 Mapeamento</span><span className={preview ? "active" : ""}>03 Confirmação</span></div>
        <div className="spreadsheet-config-grid"><label>Modelo<select value={model} onChange={(event) => { setModel(event.target.value); setPreview(null); setMapping({}); setMappingDirty(false); }}>{Object.entries(modelLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Empresa<select value={companyId} onChange={(event) => setCompanyId(Number(event.target.value))}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label>Competência<input type="month" value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} /></label></div>
        <label className="spreadsheet-drop"><input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setMapping({}); setMappingDirty(false); }} /><strong>{file ? file.name : "Escolha ou arraste uma planilha"}</strong><span>CSV ou XLSX · até 5 MB · até 5.000 linhas · primeira aba</span></label>
        <div className="spreadsheet-safety"><b>Barreira de segurança</b><span>O arquivo bruto fica apenas na memória da requisição e é descartado. Fórmulas não são executadas nem persistidas como valor.</span><em>RAW: NÃO PERSISTIDO</em></div>
        <button className="primary-button spreadsheet-preview-button" type="button" onClick={() => void send("preview")} disabled={!file || Boolean(busy)}>{busy === "preview" ? "Lendo com segurança…" : "Gerar preview →"}</button>

        {preview && <div className="spreadsheet-preview">
          <div className="panel-heading"><div><span className="eyebrow">MAPEAMENTO DE COLUNAS</span><h3>O que cada coluna significa</h3></div><span>{preview.format.toUpperCase()} · #{preview.sourceHash.slice(0, 10)}</span></div>
          <div className="mapping-grid">{preview.headers.map((header) => <label key={header}><span>{header}</span><select value={mapping[header] ?? "ignore"} onChange={(event) => { setMapping((current) => ({ ...current, [header]: event.target.value })); setMappingDirty(true); }}>{Object.entries(fieldLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>)}</div>
          <div className="preview-metrics"><article><b>{preview.summary.total}</b><span>linhas</span></article><article className="ok"><b>{preview.summary.accepted}</b><span>válidas</span></article><article className="warn"><b>{preview.summary.invalid}</b><span>com pendência</span></article><article className="danger"><b>{preview.summary.formulasDiscarded}</b><span>fórmulas descartadas</span></article></div>
          {preview.missingColumns.length > 0 && <div className="spreadsheet-warning">Campos obrigatórios sem coluna: {preview.missingColumns.map((field) => fieldLabels[field] ?? field).join(", ")}. Ajuste o mapeamento e gere o preview novamente.</div>}
          {mappingDirty && <div className="spreadsheet-warning">O mapeamento foi alterado. Gere o preview novamente para validar exatamente os dados que serão confirmados.</div>}
          <div className="preview-table-wrap"><table><thead><tr><th>Linha</th><th>Documento</th><th>Valores normalizados</th><th>Validação</th></tr></thead><tbody>{preview.rows.slice(0, 20).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.documentKey}</td><td>{Object.entries(row.normalized).map(([key, value]) => `${fieldLabels[key] ?? key}: ${value ?? "—"}`).join(" · ")}</td><td><span className={`row-status ${row.status}`}>{row.status === "accepted" ? "Válida" : row.issues.join(", ")}</span></td></tr>)}</tbody></table></div>
          <div className="spreadsheet-confirm"><label>Salvar mapeamento (opcional)<input value={profileName} list="spreadsheet-profiles" onChange={(event) => { setProfileName(event.target.value); const profile = profiles.find((item) => item.name === event.target.value && item.model === model); if (profile) { setMapping(profile.columnMapping); setMappingDirty(true); } }} placeholder="Ex.: Exportação do ERP mensal" /><datalist id="spreadsheet-profiles">{profiles.filter((profile) => profile.model === model).map((profile) => <option value={profile.name} key={profile.id} />)}</datalist></label><button className="primary-button" type="button" disabled={!mappingComplete || Boolean(busy)} onClick={() => void send("commit")}>{busy === "commit" ? "Confirmando…" : "Confirmar e reconciliar →"}</button></div>
        </div>}
      </section>

      <aside className="panel spreadsheet-history"><div className="panel-heading"><div><span className="eyebrow">LOTES</span><h3>Processamento e rollback</h3></div><span>{batches.length}</span></div>{!batches.length ? <div className="report-empty"><strong>Nenhuma migração ainda</strong><p>O primeiro lote aparecerá aqui com o relatório completo.</p></div> : batches.map((batch) => <button type="button" key={batch.id} className={activeBatch?.id === batch.id ? "active" : ""} onClick={() => setSelectedBatch(batch.id)}><span><b>{batch.companyName}</b><small>{batch.filename} · {batch.periodKey}</small></span><em className={batch.status}>{batch.status === "committed" ? "Ativo" : "Revertido"}</em></button>)}
        {activeBatch && <div className="batch-report"><span className="eyebrow">RELATÓRIO DO LOTE</span><h4>{modelLabels[activeBatch.model] ?? activeBatch.model}</h4><dl><div><dt>Linhas</dt><dd>{activeBatch.totalRows}</dd></div><div><dt>Aceitas</dt><dd>{activeBatch.acceptedRows}</dd></div><div><dt>Inválidas</dt><dd>{activeBatch.invalidRows}</dd></div><div><dt>Duplicadas</dt><dd>{activeBatch.duplicateRows}</dd></div><div><dt>Divergentes</dt><dd>{activeBatch.divergentRows}</dd></div><div><dt>Fórmulas</dt><dd>{activeBatch.formulaCellsDiscarded}</dd></div></dl><p>Arquivo bruto persistido: <b>{activeBatch.rawFilePersisted ? "SIM — BLOQUEIO" : "não"}</b></p>{activeBatch.report.errors?.length ? <details><summary>Ver erros e divergências</summary>{activeBatch.report.errors.slice(0, 30).map((item) => <p key={`${item.rowNumber}-${item.documentKey}`}>Linha {item.rowNumber} · {item.documentKey}: {item.issues.join(", ")}</p>)}</details> : <p>Sem erros no relatório.</p>}{activeBatch.status === "committed" && <button className="danger-button" type="button" disabled={Boolean(busy)} onClick={() => void rollback(activeBatch.id)}>Reverter lote integralmente</button>}</div>}
      </aside>
    </section>
  </div>;
}
