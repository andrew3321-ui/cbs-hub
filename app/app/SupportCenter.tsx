"use client";

import { useEffect, useMemo, useState } from "react";
import {
  supportCategories,
  supportCategoryLabels,
  supportModuleLabels,
  supportModules,
  supportStatusLabels,
  supportStatuses,
  type SupportCategory,
  type SupportModule,
  type SupportStatus,
} from "../../domain/support-tickets";

type SupportCompany = { id: number; name: string };

type SupportTicket = {
  id: string;
  protocol: string;
  workspaceId: number;
  reporterUserId: number;
  companyId: number | null;
  companyName: string | null;
  category: SupportCategory;
  moduleCode: SupportModule;
  releaseId: string;
  releaseTag: string;
  traceCode: string | null;
  subject: string;
  description: string;
  consentVersion: string;
  status: SupportStatus;
  responseDueAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SupportCenterProps = {
  companies: SupportCompany[];
  activeCompanyId: number | null;
  initialModule: SupportModule;
  isPlatformAdmin: boolean;
};

function friendlyDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function SupportCenter({ companies, activeCompanyId, initialModule, isPlatformAdmin }: SupportCenterProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [category, setCategory] = useState<SupportCategory>("question");
  const [moduleCode, setModuleCode] = useState<SupportModule>(initialModule);
  const [companyId, setCompanyId] = useState<number | "">(activeCompanyId ?? "");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [traceCode, setTraceCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCompanyName = useMemo(
    () => companies.find((company) => company.id === Number(companyId))?.name ?? null,
    [companies, companyId],
  );

  async function loadTickets() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/support-tickets", { cache: "no-store" });
      const data = await response.json() as { tickets?: SupportTicket[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os chamados.");
      setTickets(data.tickets ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os chamados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/support-tickets", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { tickets?: SupportTicket[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar os chamados.");
        return data.tickets ?? [];
      })
      .then((items) => {
        if (active) setTickets(items);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar os chamados.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitTicket(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          moduleCode,
          companyId: companyId || null,
          subject,
          description,
          traceCode: category === "technical_problem" ? traceCode : "",
          dataMinimizationAccepted: consent,
        }),
      });
      const data = await response.json() as { ticket?: SupportTicket; error?: string; requestId?: string };
      if (!response.ok || !data.ticket) throw new Error(data.error || `Não foi possível abrir o chamado${data.requestId ? ` · código ${data.requestId}` : ""}.`);
      const ticket = { ...data.ticket, companyName: activeCompanyName };
      setTickets((current) => [ticket, ...current]);
      setMessage(`Chamado ${ticket.protocol} recebido. A primeira resposta é esperada até ${friendlyDate(ticket.responseDueAt)}.`);
      setSubject("");
      setDescription("");
      setTraceCode("");
      setConsent(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir o chamado.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(ticket: SupportTicket, status: SupportStatus) {
    if (status === ticket.status) return;
    setUpdatingId(ticket.id);
    setError("");
    try {
      const response = await fetch("/api/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, status }),
      });
      const data = await response.json() as { ticket?: SupportTicket; error?: string };
      if (!response.ok || !data.ticket) throw new Error(data.error || "Não foi possível atualizar o chamado.");
      setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, ...data.ticket } : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o chamado.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="page-content support-page">
      <div className="page-heading support-page-heading">
        <div>
          <p className="kicker">CANAL OFICIAL · SUPORTE CBSHUB</p>
          <h1>Suporte com contexto e protocolo</h1>
          <p>Relate dúvidas, regras ausentes, divergências ou falhas técnicas. Primeira resposta em até 2 dias úteis.</p>
        </div>
        <span className="support-sla"><i /> Atendimento rastreável</span>
      </div>

      {message && <div className="support-feedback success" role="status">{message}</div>}
      {error && <div className="support-feedback error" role="alert">{error}</div>}

      <section className="support-layout">
        <form className="panel support-form" onSubmit={submitTicket}>
          <div className="panel-heading">
            <div><span className="eyebrow">NOVO CHAMADO</span><h3>Contexto essencial</h3></div>
            <span>Sem anexos e sem dados pessoais</span>
          </div>

          <div className="support-form-grid">
            <label>Categoria
              <select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)}>
                {supportCategories.map((item) => <option value={item} key={item}>{supportCategoryLabels[item]}</option>)}
              </select>
            </label>
            <label>Módulo
              <select value={moduleCode} onChange={(event) => setModuleCode(event.target.value as SupportModule)}>
                {supportModules.map((item) => <option value={item} key={item}>{supportModuleLabels[item]}</option>)}
              </select>
            </label>
            <label>Empresa relacionada (opcional)
              <select value={companyId} onChange={(event) => setCompanyId(event.target.value ? Number(event.target.value) : "")}>
                <option value="">Nenhuma empresa específica</option>
                {companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}
              </select>
            </label>
          </div>

          <label>Assunto
            <input minLength={5} maxLength={120} required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex.: resultado diferente da memória conferida" />
          </label>
          <label>Descrição objetiva
            <textarea minLength={20} maxLength={2000} required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Informe o que esperava, o que ocorreu e como reproduzir. Não inclua CPF, CNPJ, e-mail, XML, senha, token ou chave." />
          </label>
          {category === "technical_problem" && <label>Código de rastreio (opcional)
            <input maxLength={80} value={traceCode} onChange={(event) => setTraceCode(event.target.value.replace(/[^A-Za-z0-9-]/g, ""))} placeholder="Ex.: MC-CHECKOUT-UNAVAILABLE" />
            <small>Copie somente o código exibido pelo sistema. Nunca envie logs, credenciais ou segredos.</small>
          </label>}

          <label className="support-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>Revisei o relato e confirmo que ele contém apenas os dados mínimos necessários, sem dados pessoais, documentos fiscais completos ou credenciais.</span>
          </label>

          <div className="support-boundary">
            <b>Feedback não altera regras automaticamente.</b>
            <p>Relatos fiscais entram em triagem. Qualquer correção de regra continua sujeita a fonte oficial, testes, versionamento e governança antes de chegar aos cálculos.</p>
          </div>

          <div className="form-actions">
            <button className="primary-button" disabled={submitting || !consent || subject.trim().length < 5 || description.trim().length < 20}>
              {submitting ? "Abrindo chamado…" : "Gerar protocolo"}
            </button>
          </div>
        </form>

        <section className="panel support-history">
          <div className="panel-heading">
            <div><span className="eyebrow">{isPlatformAdmin ? "FILA DA PLATAFORMA" : "MEUS CHAMADOS"}</span><h3>Status do atendimento</h3></div>
            <button type="button" className="text-button" onClick={() => void loadTickets()} disabled={loading}>{loading ? "Atualizando…" : "Atualizar"}</button>
          </div>
          {loading && !tickets.length && <p className="support-empty">Carregando protocolos…</p>}
          {!loading && !tickets.length && <p className="support-empty">Nenhum chamado aberto. Novos protocolos aparecerão aqui.</p>}
          <div className="support-ticket-list">
            {tickets.map((ticket) => (
              <article className={`support-ticket ${ticket.status}`} key={ticket.id}>
                <header>
                  <div><code>{ticket.protocol}</code><span className={`support-ticket-status ${ticket.status}`}>{supportStatusLabels[ticket.status]}</span></div>
                  <time dateTime={ticket.createdAt}>{friendlyDate(ticket.createdAt)}</time>
                </header>
                <h3>{ticket.subject}</h3>
                <p>{ticket.description}</p>
                <dl>
                  <div><dt>Categoria</dt><dd>{supportCategoryLabels[ticket.category]}</dd></div>
                  <div><dt>Módulo</dt><dd>{supportModuleLabels[ticket.moduleCode]}</dd></div>
                  <div><dt>Empresa</dt><dd>{ticket.companyName ?? "Não vinculada"}</dd></div>
                  <div><dt>Versão</dt><dd title={ticket.releaseId}>{ticket.releaseTag === "unversioned" ? ticket.releaseId.slice(0, 12) : ticket.releaseTag}</dd></div>
                  {ticket.traceCode && <div><dt>Rastreio</dt><dd><code>{ticket.traceCode}</code></dd></div>}
                  <div><dt>Resposta esperada</dt><dd>{friendlyDate(ticket.responseDueAt)}</dd></div>
                </dl>
                {isPlatformAdmin && <label className="support-admin-status">Atualizar status
                  <select value={ticket.status} disabled={updatingId === ticket.id} onChange={(event) => void updateStatus(ticket, event.target.value as SupportStatus)}>
                    {supportStatuses.map((status) => <option value={status} key={status}>{supportStatusLabels[status]}</option>)}
                  </select>
                </label>}
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
