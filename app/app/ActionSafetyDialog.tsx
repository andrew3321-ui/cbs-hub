"use client";

import { useState } from "react";
import { onboardingActionWarnings } from "../../domain/account-onboarding";

type Props = {
  mode: "save" | "deliver";
  clientName: string;
  scenarioName: string;
  detail: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ActionSafetyDialog({ mode, clientName, scenarioName, detail, busy, onClose, onConfirm }: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const warning = onboardingActionWarnings[mode];
  return (
    <div className="action-safety-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="action-safety-dialog" role="dialog" aria-modal="true" aria-labelledby={`action-safety-${mode}`}>
        <header>
          <div><span>CONFERÊNCIA OBRIGATÓRIA</span><h2 id={`action-safety-${mode}`}>{warning.title}</h2></div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Fechar conferência">×</button>
        </header>
        <div className="action-safety-context">
          <div><span>CLIENTE</span><b>{clientName || "Não selecionado"}</b></div>
          <div><span>VERSÃO</span><b>{scenarioName || "Sem nome"}</b></div>
          <p>{detail}</p>
        </div>
        <div className="action-safety-checks">{warning.checks.map((check) => <p key={check}><span>□</span>{check}</p>)}</div>
        <label className="action-safety-acknowledgement"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span><b>Conferi os itens acima</b><small>{mode === "save" ? "Quero congelar estas premissas em uma versão auditável." : "Quero liberar exatamente esta versão ao cliente identificado."}</small></span></label>
        <footer><button type="button" onClick={onClose} disabled={busy}>Voltar e conferir</button><button type="button" className="confirm" onClick={onConfirm} disabled={!acknowledged || busy}>{busy ? "Confirmando…" : mode === "save" ? "Confirmar e salvar versão" : "Confirmar e gerar link"}</button></footer>
      </section>
    </div>
  );
}
