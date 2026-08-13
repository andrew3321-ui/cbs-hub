"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Member = { userId: number; name: string; role: string };
type Cycle = {
  id: string;
  company_name: string;
  period_key: string;
  report_id: string;
  stage: string;
  due_at: string;
  activeDeadline: string;
  report_status: string;
  revision: number;
  snapshot_hash: string | null;
  due_day: number;
  preparation_sla_hours: number;
  review_sla_hours: number;
  preparer_user_id: number | null;
  config_reviewer_user_id: number | null;
  preparer_name: string | null;
  reviewer_name: string | null;
  required_document_count: number;
  require_snapshot: number;
  require_conclusion: number;
  document_count: number;
  reminder_count: number;
  active_share_id: string | null;
  blockers: Array<{ code: string; label: string }>;
  overdue: boolean;
};
const stageLabels: Record<string, string> = {
  preparation: "Preparação",
  review: "Revisão",
  approved: "Aprovado",
  delivered: "Entregue",
  accepted: "Aceito",
  rejected: "Recusado",
  changes_requested: "Alteração solicitada",
};
function currentPeriod() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
async function result<T>(response: Response) {
  return (await response.json()) as T & { error?: string };
}

export default function MonthlyClosingCenter({
  onOpenReports,
}: {
  onOpenReports: () => void;
}) {
  const [period, setPeriod] = useState(currentPeriod);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [permissions, setPermissions] = useState({
    canConfigure: false,
    canPrepare: false,
    canReview: false,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const selected = cycles.find((cycle) => cycle.id === selectedId) ?? null;
  const canCreateDelivery =
    selected?.stage === "approved" ||
    (selected?.stage === "delivered" && !selected.active_share_id);
  const read = useCallback(async () => {
    const response = await fetch(`/api/monthly-closing?period=${period}`, {
      cache: "no-store",
    });
    const data = await result<{
      cycles?: Cycle[];
      members?: Member[];
      permissions?: typeof permissions;
    }>(response);
    if (!response.ok) throw new Error(data.error || "Fila indisponível.");
    setCycles(data.cycles ?? []);
    setMembers(data.members ?? []);
    if (data.permissions) setPermissions(data.permissions);
    return data;
  }, [period]);
  const sync = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const current = await read();
      if (current.permissions?.canPrepare) {
        const response = await fetch("/api/monthly-closing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync_queue", period }),
        });
        const data = await result<{ synchronized?: number }>(response);
        if (!response.ok)
          throw new Error(data.error || "Não foi possível formar a fila.");
        await read();
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Fila indisponível.");
    } finally {
      setLoading(false);
    }
  }, [period, read]);
  useEffect(() => {
    const timer = window.setTimeout(() => void sync(), 0);
    return () => window.clearTimeout(timer);
  }, [sync]);
  const metrics = useMemo(
    () => ({
      total: cycles.length,
      blocked: cycles.filter((cycle) => cycle.blockers.length).length,
      overdue: cycles.filter((cycle) => cycle.overdue).length,
      delivered: cycles.filter((cycle) =>
        ["delivered", "accepted", "rejected", "changes_requested"].includes(
          cycle.stage,
        ),
      ).length,
    }),
    [cycles],
  );
  const visible = cycles.filter(
    (cycle) =>
      filter === "all" ||
      (filter === "blocked"
        ? cycle.blockers.length
        : filter === "overdue"
          ? cycle.overdue
          : filter === "delivered"
            ? [
                "delivered",
                "accepted",
                "rejected",
                "changes_requested",
              ].includes(cycle.stage)
            : cycle.stage === filter),
  );
  async function action(payload: Record<string, unknown>, success: string) {
    setMessage("");
    try {
      const response = await fetch("/api/monthly-closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId: selectedId, ...payload }),
      });
      const data = await result<{ url?: string; deduplicated?: boolean }>(
        response,
      );
      if (!response.ok)
        throw new Error(data.error || "Operação não concluída.");
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        setMessage(
          "Link seguro copiado. A entrega está vinculada à revisão aprovada.",
        );
      } else
        setMessage(
          data.deduplicated
            ? "Este lembrete já foi registrado hoje; nenhuma duplicata foi criada."
            : success,
        );
      await read();
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Operação não concluída.",
      );
    }
  }
  return (
    <section className="closing-center page-shell">
      <header className="section-heading">
        <div>
          <span className="eyebrow">FLUXO RECORRENTE E RASTREÁVEL</span>
          <h1>Fechamento mensal</h1>
          <p>
            Da documentação ao aceite do cliente, com prazo, segregação e versão
            preservada.
          </p>
        </div>
        <div className="closing-period">
          <label>
            Competência
            <input
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            />
          </label>
          <button onClick={() => void sync()}>Atualizar fila</button>
        </div>
      </header>
      {message && <div className="closing-message">{message}</div>}
      <div className="closing-metrics">
        <button onClick={() => setFilter("all")}>
          <span>Fila mensal</span>
          <strong>{metrics.total}</strong>
        </button>
        <button onClick={() => setFilter("blocked")}>
          <span>Com bloqueios</span>
          <strong>{metrics.blocked}</strong>
        </button>
        <button onClick={() => setFilter("overdue")}>
          <span>Em atraso</span>
          <strong>{metrics.overdue}</strong>
        </button>
        <button onClick={() => setFilter("delivered")}>
          <span>Entregues</span>
          <strong>{metrics.delivered}</strong>
        </button>
      </div>
      <div className="closing-layout">
        <section className="closing-queue">
          {loading ? (
            <p>Sincronizando competências…</p>
          ) : !visible.length ? (
            <p>Nenhuma empresa neste recorte.</p>
          ) : (
            visible.map((cycle) => (
              <button
                className={`${selectedId === cycle.id ? "active" : ""} ${cycle.overdue ? "overdue" : ""}`}
                onClick={() => setSelectedId(cycle.id)}
                key={cycle.id}
              >
                <div>
                  <span>{cycle.company_name}</span>
                  <small>
                    Prazo do estágio{" "}
                    {new Date(cycle.activeDeadline).toLocaleDateString("pt-BR")} ·
                    v{cycle.revision}
                  </small>
                </div>
                <strong>{stageLabels[cycle.stage] ?? cycle.stage}</strong>
                <i>
                  {cycle.blockers.length
                    ? `${cycle.blockers.length} bloqueio(s)`
                    : "Pronto no estágio"}
                </i>
              </button>
            ))
          )}
        </section>
        <section className="closing-detail panel">
          {!selected ? (
            <div className="closing-empty">
              <span>SELECIONE UMA EMPRESA</span>
              <h2>Acompanhe o fechamento por competência.</h2>
              <p>
                Os bloqueios são recalculados com os documentos e a revisão
                atual.
              </p>
            </div>
          ) : (
            <>
              <header>
                <div>
                  <span className="eyebrow">
                    {selected.period_key} · {stageLabels[selected.stage]}
                  </span>
                  <h2>{selected.company_name}</h2>
                  <p>
                    Preparador: {selected.preparer_name ?? "não definido"} ·
                    Revisor: {selected.reviewer_name ?? "não definido"}
                  </p>
                </div>
                <button onClick={onOpenReports}>Abrir relatório →</button>
              </header>
              <div className="closing-stage-strip">
                {[
                  "preparation",
                  "review",
                  "approved",
                  "delivered",
                  "accepted",
                ].map((stage, index) => (
                  <div
                    className={
                      stage === selected.stage ||
                      (["rejected", "changes_requested"].includes(
                        selected.stage,
                      ) &&
                        stage === "delivered")
                        ? "current"
                        : ""
                    }
                    key={stage}
                  >
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <span>{stageLabels[stage]}</span>
                  </div>
                ))}
              </div>
              <section
                className={`closing-blockers ${selected.blockers.length ? "blocked" : "clear"}`}
              >
                <span>
                  {selected.blockers.length
                    ? "BLOQUEIOS OBJETIVOS"
                    : "PRONTO PARA O PRÓXIMO ESTÁGIO"}
                </span>
                {selected.blockers.length ? (
                  selected.blockers.map((blocker) => (
                    <p key={blocker.code}>! {blocker.label}</p>
                  ))
                ) : (
                  <p>
                    Documentos, fatos, conclusão e pendências estão conciliados.
                  </p>
                )}
              </section>
              {permissions.canConfigure && (
                <ClosingConfig
                  cycle={selected}
                  members={members}
                  onSave={(config) =>
                    void action(
                      { action: "configure", ...config },
                      "Configuração e SLAs atualizados.",
                    )
                  }
                />
              )}
              <div className="closing-actions">
                <button
                  onClick={() =>
                    void action(
                      {
                        action: "remind",
                        kind:
                          selected.stage === "review"
                            ? "review_due"
                            : selected.stage === "delivered"
                              ? "client_pending"
                              : "preparation_due",
                      },
                      "Lembrete registrado sem duplicidade.",
                    )
                  }
                >
                  Registrar lembrete
                </button>
                {canCreateDelivery && (
                  <button
                    className="primary-button"
                    onClick={() =>
                      void action(
                        { action: "deliver", expiryDays: 14 },
                        "Entrega criada.",
                      )
                    }
                  >
                    Entregar ao cliente
                  </button>
                )}
                {selected.active_share_id && (
                  <button
                    onClick={() =>
                      void action({ action: "revoke" }, "Link revogado.")
                    }
                  >
                    Revogar link
                  </button>
                )}
                {permissions.canConfigure &&
                  [
                    "approved",
                    "delivered",
                    "accepted",
                    "rejected",
                    "changes_requested",
                  ].includes(selected.stage) && (
                    <button
                      onClick={() =>
                        void action(
                          { action: "reopen" },
                          "Fechamento reaberto; a versão aprovada foi preservada.",
                        )
                      }
                    >
                      Reabrir nova revisão
                    </button>
                  )}
              </div>
              <footer>
                <span>{selected.reminder_count} lembrete(s) na trilha</span>
                <code>
                  {selected.snapshot_hash
                    ? `#${selected.snapshot_hash.slice(0, 16)}`
                    : "sem snapshot"}
                </code>
              </footer>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function ClosingConfig({
  cycle,
  members,
  onSave,
}: {
  cycle: Cycle;
  members: Member[];
  onSave: (config: Record<string, unknown>) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      dueDay: Number(data.get("dueDay")),
      preparationSlaHours: Number(data.get("prepHours")),
      reviewSlaHours: Number(data.get("reviewHours")),
      preparerUserId: Number(data.get("preparer")),
      reviewerUserId: Number(data.get("reviewer")),
      requiredDocumentCount: Number(data.get("docs")),
      requireSnapshot: true,
      requireConclusion: true,
    });
  }
  return (
    <details className="closing-config">
      <summary>Responsáveis, SLA e requisitos</summary>
      <form key={cycle.id} onSubmit={submit}>
        <label>
          Dia do vencimento
          <input
            name="dueDay"
            type="number"
            min={1}
            max={28}
            defaultValue={cycle.due_day}
          />
        </label>
        <label>
          SLA preparação (h)
          <input
            name="prepHours"
            type="number"
            min={1}
            max={720}
            defaultValue={cycle.preparation_sla_hours}
          />
        </label>
        <label>
          SLA revisão (h)
          <input
            name="reviewHours"
            type="number"
            min={1}
            max={720}
            defaultValue={cycle.review_sla_hours}
          />
        </label>
        <label>
          Documentos mínimos
          <input
            name="docs"
            type="number"
            min={0}
            max={50}
            defaultValue={cycle.required_document_count}
          />
        </label>
        <label>
          Preparador
          <select name="preparer" defaultValue={cycle.preparer_user_id ?? 0}>
            <option value={0}>Selecione</option>
            {members
              .filter((member) => member.role !== "reviewer")
              .map((member) => (
                <option value={member.userId} key={member.userId}>
                  {member.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Revisor
          <select
            name="reviewer"
            defaultValue={cycle.config_reviewer_user_id ?? 0}
          >
            <option value={0}>Selecione</option>
            {members
              .filter((member) =>
                ["owner", "admin", "reviewer"].includes(member.role),
              )
              .map((member) => (
                <option value={member.userId} key={member.userId}>
                  {member.name}
                </option>
              ))}
          </select>
        </label>
        <button type="submit">Salvar configuração</button>
      </form>
    </details>
  );
}
