"use client";

import { useEffect, useMemo, useState } from "react";

type BillingTransaction = {
  id: number;
  customerName: string;
  customerEmail: string;
  providerInvoiceId: string;
  providerPaymentId: string | null;
  status: string;
  statusDetail: string;
  grossAmountCents: number;
  feeAmountCents: number | null;
  netAmountCents: number | null;
  paymentMethod: string | null;
  approvedAt: string | null;
  createdAt: string;
  issuanceId: number | null;
  fiscalStatus: string | null;
  customerType: string | null;
  fiscalCustomerName: string | null;
  customerTaxId: string | null;
  noteRequested: boolean | null;
  serviceCode: string | null;
  serviceDescription: string | null;
  competenceMonth: string | null;
  nfseNumber: string | null;
  nfseKey: string | null;
  issuedAt: string | null;
  internalNote: string | null;
};

type BillingPayload = {
  configuration: { accessToken: boolean; webhookSecret: boolean; adminAccess: boolean; mode: "test" | "production" | "disabled"; webhookUrl: string; requiredEvents: string[] };
  metrics: { activeSubscriptions: number; estimatedMrrCents: number; grossThisMonthCents: number; netThisMonthCents: number; pendingFiscal: number };
  subscriptions: Array<{ id: number; customerName: string; customerEmail: string; planKey: string; status: string; nextPaymentAt: string | null; updatedAt: string }>;
  transactions: BillingTransaction[];
};

type FiscalDraft = {
  customerType: string;
  customerName: string;
  customerTaxId: string;
  noteRequested: boolean;
  serviceCode: string;
  serviceDescription: string;
  competenceMonth: string;
  internalNote: string;
  nfseNumber: string;
  nfseKey: string;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const statusLabels: Record<string, string> = {
  approved: "Pagamento aprovado",
  pending: "Pagamento pendente",
  rejected: "Pagamento recusado",
  pending_data: "Faltam dados fiscais",
  pending_issue: "Pronta para emissão",
  issued: "NFS-e emitida",
  not_required: "Dispensada · pessoa física",
  awaiting_payment: "Aguardando pagamento",
};

function toDraft(transaction: BillingTransaction | null): FiscalDraft {
  return {
    customerType: transaction?.customerType ?? "unknown",
    customerName: transaction?.fiscalCustomerName || transaction?.customerName || "",
    customerTaxId: transaction?.customerTaxId ?? "",
    noteRequested: transaction?.noteRequested ?? false,
    serviceCode: transaction?.serviceCode ?? "",
    serviceDescription: transaction?.serviceDescription ?? "Assinatura mensal Margem Clara",
    competenceMonth: transaction?.competenceMonth ?? new Date().toISOString().slice(0, 7),
    internalNote: transaction?.internalNote ?? "",
    nfseNumber: transaction?.nfseNumber ?? "",
    nfseKey: transaction?.nfseKey ?? "",
  };
}

export default function BillingCenter() {
  const [data, setData] = useState<BillingPayload | null>(null);
  const [activeIssuanceId, setActiveIssuanceId] = useState<number | null>(null);
  const [draft, setDraft] = useState<FiscalDraft>(() => toDraft(null));
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const active = useMemo(() => data?.transactions.find((item) => item.issuanceId === activeIssuanceId) ?? null, [data, activeIssuanceId]);
  const fiscalQueue = useMemo(() => data?.transactions.filter((item) => item.issuanceId && item.status === "approved") ?? [], [data]);

  function installPayload(payload: BillingPayload) {
    const selectedId = activeIssuanceId ?? payload.transactions.find((item) => item.issuanceId)?.issuanceId ?? null;
    setData(payload);
    setActiveIssuanceId(selectedId);
    setDraft(toDraft(payload.transactions.find((item) => item.issuanceId === selectedId) ?? null));
  }

  useEffect(() => {
    fetch("/api/admin/billing", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as BillingPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Central indisponível.");
        return payload;
      })
      .then((payload) => {
        const selectedId = payload.transactions.find((item) => item.issuanceId)?.issuanceId ?? null;
        setData(payload);
        setActiveIssuanceId(selectedId);
        setDraft(toDraft(payload.transactions.find((item) => item.issuanceId === selectedId) ?? null));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Central indisponível."));
  }, []);

  async function mutate(action: string) {
    if (!active?.issuanceId) return;
    setBusy(action);
    setMessage("");
    try {
      const response = await fetch("/api/admin/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: active.issuanceId, action, ...draft }) });
      const payload = await response.json() as BillingPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir.");
      installPayload(payload);
      setMessage(action === "mark_issued" ? "NFS-e vinculada ao pagamento." : action === "mark_not_required" ? "Dispensa registrada." : "Fila fiscal atualizada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir.");
    } finally {
      setBusy("");
    }
  }

  function update<K extends keyof FiscalDraft>(key: K, value: FiscalDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  if (!data) return <div className="page-content billing-admin-page"><div className="billing-admin-loading">{message || "Carregando Central de Faturamento…"}</div></div>;

  return <div className="page-content billing-admin-page">
    <div className="page-heading billing-admin-heading">
      <div><p className="kicker">GESTÃO FINANCEIRA · ACESSO DO RESPONSÁVEL</p><h1>Central de Faturamento</h1><p>Concilie assinaturas, pagamentos do Mercado Pago e a fila manual de NFS-e sem guardar credenciais no navegador.</p></div>
      <a className="primary-button" href="https://www.nfse.gov.br/EmissorNacional" target="_blank" rel="noreferrer">Abrir Emissor Nacional ↗</a>
    </div>
    {message && <div className="toast" role="status">{message}</div>}

    <section className="billing-admin-metrics" aria-label="Indicadores de faturamento">
      <article><span>ASSINATURAS ATIVAS</span><strong>{data.metrics.activeSubscriptions}</strong><small>autorizações recorrentes</small></article>
      <article><span>MRR CONTRATADO</span><strong>{money.format(data.metrics.estimatedMrrCents / 100)}</strong><small>estimativa pelos planos ativos</small></article>
      <article><span>RECEBIDO NO MÊS</span><strong>{money.format(data.metrics.grossThisMonthCents / 100)}</strong><small>bruto confirmado pelo provedor</small></article>
      <article className={data.metrics.pendingFiscal ? "attention" : "good"}><span>PENDÊNCIAS FISCAIS</span><strong>{data.metrics.pendingFiscal}</strong><small>dados ou emissão aguardando</small></article>
    </section>

    <section className="panel billing-integration-card">
      <div className="panel-heading"><div><span className="eyebrow">INTEGRAÇÃO PREPARADA</span><h3>Mercado Pago</h3></div><span className={`billing-mode ${data.configuration.mode}`}>{data.configuration.mode === "production" ? "Produção" : data.configuration.mode === "test" ? "Teste" : "Desativada"}</span></div>
      <div className="billing-config-grid">
        <div className={data.configuration.accessToken ? "ready" : "pending"}><span>{data.configuration.accessToken ? "✓" : "1"}</span><p><b>MERCADO_PAGO_ACCESS_TOKEN</b><small>{data.configuration.accessToken ? "Credencial reconhecida no servidor." : "Adicionar como segredo da hospedagem."}</small></p></div>
        <div className={data.configuration.webhookSecret ? "ready" : "pending"}><span>{data.configuration.webhookSecret ? "✓" : "2"}</span><p><b>MERCADO_PAGO_WEBHOOK_SECRET</b><small>{data.configuration.webhookSecret ? "Assinatura de notificações ativa." : "Copiar a chave secreta do webhook."}</small></p></div>
        <div className={data.configuration.adminAccess ? "ready" : "pending"}><span>{data.configuration.adminAccess ? "✓" : "3"}</span><p><b>PLATFORM_ADMIN_EMAILS</b><small>Acesso restrito ao responsável da plataforma.</small></p></div>
      </div>
      <div className="billing-webhook-box"><span>URL DO WEBHOOK</span><code>{data.configuration.webhookUrl}</code><button type="button" onClick={() => void navigator.clipboard.writeText(data.configuration.webhookUrl)}>Copiar</button><small>Ative os eventos: {data.configuration.requiredEvents.join(" e ")}.</small></div>
    </section>

    <section className="billing-fiscal-layout">
      <article className="panel billing-fiscal-queue">
        <div className="panel-heading"><div><span className="eyebrow">FILA FISCAL</span><h3>Pagamentos confirmados</h3></div><span className="editable-chip">{fiscalQueue.length} registro(s)</span></div>
        <div className="billing-queue-list">
          {fiscalQueue.map((item) => <button type="button" className={item.issuanceId === activeIssuanceId ? "active" : ""} onClick={() => { setActiveIssuanceId(item.issuanceId); setDraft(toDraft(item)); }} key={item.id}>
            <span className={`billing-fiscal-dot ${item.fiscalStatus}`} />
            <p><b>{item.customerName}</b><small>{item.customerEmail} · competência {item.competenceMonth ?? "—"}</small></p>
            <strong>{money.format(item.grossAmountCents / 100)}</strong>
            <em>{statusLabels[item.fiscalStatus ?? ""] ?? item.fiscalStatus}</em>
          </button>)}
          {!fiscalQueue.length && <div className="billing-empty"><span>✓</span><b>Nenhum pagamento confirmado na fila</b><p>Quando o webhook receber a primeira cobrança aprovada, a pendência aparecerá aqui.</p></div>}
        </div>
      </article>

      <article className="panel billing-fiscal-editor">
        {active ? <>
          <div className="panel-heading"><div><span className="eyebrow">PREPARAÇÃO DA NFS-e</span><h3>{active.customerName}</h3></div><span className={`billing-fiscal-status ${active.fiscalStatus}`}>{statusLabels[active.fiscalStatus ?? ""] ?? active.fiscalStatus}</span></div>
          <div className="billing-fiscal-warning"><b>A nota continua manual.</b><p>O painel organiza os dados e registra a emissão; não escolhe um código de serviço por você e não envia nada à Receita ou prefeitura.</p></div>
          <div className="billing-fiscal-form">
            <label>Tipo do cliente<select value={draft.customerType} onChange={(event) => update("customerType", event.target.value)}><option value="unknown">Não confirmado</option><option value="individual">Pessoa física</option><option value="legal_entity">Pessoa jurídica</option></select></label>
            <label>CPF/CNPJ<input inputMode="numeric" maxLength={18} value={draft.customerTaxId} onChange={(event) => update("customerTaxId", event.target.value.replace(/\D/g, "").slice(0, 14))} placeholder="Somente números" /></label>
            <label className="wide">Nome do tomador<input maxLength={160} value={draft.customerName} onChange={(event) => update("customerName", event.target.value)} /></label>
            <label>Código oficial do serviço<input maxLength={40} value={draft.serviceCode} onChange={(event) => update("serviceCode", event.target.value)} placeholder="Validar no Emissor Nacional" /></label>
            <label>Competência<input type="month" value={draft.competenceMonth} onChange={(event) => update("competenceMonth", event.target.value)} /></label>
            <label className="wide">Descrição real do serviço<textarea maxLength={240} value={draft.serviceDescription} onChange={(event) => update("serviceDescription", event.target.value)} /></label>
            <label className="wide billing-note-request"><input type="checkbox" checked={draft.noteRequested} onChange={(event) => update("noteRequested", event.target.checked)} /><span>Cliente pessoa física solicitou NFS-e</span></label>
            <label className="wide">Nota interna<textarea maxLength={500} value={draft.internalNote} onChange={(event) => update("internalNote", event.target.value)} placeholder="Pendências, conferências ou observações" /></label>
          </div>
          <div className="billing-fiscal-actions"><button type="button" className="secondary-button" disabled={Boolean(busy) || active.fiscalStatus === "issued"} onClick={() => void mutate("save_fiscal_data")}>{busy === "save_fiscal_data" ? "Salvando…" : "Salvar e classificar"}</button>{active.fiscalStatus === "not_required" && <button type="button" className="secondary-button" onClick={() => void mutate("reopen")}>Reabrir</button>}</div>
          {(active.fiscalStatus === "pending_issue" || active.fiscalStatus === "issued") && <div className="billing-nfse-confirmation"><label>Número da NFS-e<input value={draft.nfseNumber} onChange={(event) => update("nfseNumber", event.target.value)} placeholder="Obrigatório" /></label><label>Chave/código de verificação<input value={draft.nfseKey} onChange={(event) => update("nfseKey", event.target.value)} placeholder="Opcional" /></label><button type="button" className="primary-button" disabled={Boolean(busy) || active.fiscalStatus === "issued" || !draft.nfseNumber.trim()} onClick={() => void mutate("mark_issued")}>{active.fiscalStatus === "issued" ? "Emissão registrada" : busy === "mark_issued" ? "Registrando…" : "Registrar NFS-e emitida"}</button></div>}
        </> : <div className="billing-empty editor"><span>↗</span><b>Selecione um pagamento</b><p>Os dados fiscais e o controle da NFS-e aparecerão aqui.</p></div>}
      </article>
    </section>

    <section className="panel billing-transactions-panel">
      <div className="panel-heading"><div><span className="eyebrow">CONCILIAÇÃO</span><h3>Últimas transações</h3></div><span className="editable-chip">até 100 registros</span></div>
      <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Pagamento</th><th>Data</th><th>Bruto</th><th>Taxa</th><th>Líquido</th><th>Fiscal</th></tr></thead><tbody>{data.transactions.map((item) => <tr key={item.id}><td><b>{item.customerName}</b><small>{item.customerEmail}</small></td><td><b>{statusLabels[item.status] ?? item.status}</b><small>#{item.providerPaymentId ?? item.providerInvoiceId}</small></td><td>{new Date(item.approvedAt ?? item.createdAt).toLocaleDateString("pt-BR")}</td><td>{money.format(item.grossAmountCents / 100)}</td><td>{item.feeAmountCents == null ? "A confirmar" : money.format(item.feeAmountCents / 100)}</td><td><b>{item.netAmountCents == null ? "A confirmar" : money.format(item.netAmountCents / 100)}</b></td><td><span className={`billing-table-status ${item.fiscalStatus}`}>{statusLabels[item.fiscalStatus ?? ""] ?? "Sem fila"}</span></td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
