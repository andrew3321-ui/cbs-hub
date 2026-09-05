"use client";

import { useState, type FormEvent } from "react";
import type { OperationalPlaybook } from "../../domain/security-operations";

const fields = [
  ["failedLogins", "Logins com falha"], ["successfulLogins", "Logins bem-sucedidos"],
  ["mfaFailures", "Falhas de MFA"], ["wafBlocks", "Bloqueios no WAF"],
  ["serverErrors", "Respostas 5xx"], ["totalRequests", "Total de requisições web"],
  ["privilegeChanges", "Alterações de privilégios"],
] as const;
const coverageFields = [
  ["authentication", "Autenticação e MFA"], ["perimeter", "WAF/perímetro"],
  ["application", "Aplicação e respostas HTTP"], ["administration", "Administração e privilégios"],
] as const;

export default function SecurityOperationsPanel({ scopeId, disabled, playbooks, mode, onTriage }: {
  scopeId: string; disabled: boolean; playbooks: OperationalPlaybook[]; mode?: string;
  onTriage: (action: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [localError, setLocalError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLocalError("");
    const form = new FormData(event.currentTarget);
    const start = new Date(String(form.get("start"))), end = new Date(String(form.get("end")));
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end.getTime() - start.getTime() > 86400000) { setLocalError("Informe início e fim válidos, com intervalo máximo de 24 horas."); return; }
    await onTriage("triage_telemetry", { scopeId, telemetryAuthorized: form.get("authorized") === "on", telemetry: { start: start.toISOString(), end: end.toISOString(), coverage: Object.fromEntries(coverageFields.map(([name]) => [name, form.get(`coverage-${name}`)])), metrics: Object.fromEntries(fields.map(([name]) => [name, Number(form.get(name))])) } });
  }
  return <div className="security-operations">
    <details>
      <summary>Blue team · analisar eventos do ativo</summary>
      <p>Traga os totais de uma mesma janela dos seus registros de autenticação e WAF. A triagem ajuda a investigar alertas e preparar a resposta a incidentes.</p>
      <p className="security-operations-note">Importação manual de contagens. Declare a cobertura de cada fonte: zero só significa nenhum evento observado quando a cobertura for completa. Nenhum log bruto, senha ou dado pessoal é solicitado.</p>
      <form onSubmit={submit}>
        <fieldset disabled={disabled}>
          <legend>Janela dos eventos · seu horário local</legend>
          <div className="security-operations-fields security-coverage-fields">
            {coverageFields.map(([name, label]) => <label key={name}>{label}<select name={`coverage-${name}`} required defaultValue="complete"><option value="complete">Completa</option><option value="partial">Parcial</option><option value="unavailable">Indisponível</option></select></label>)}
          </div>
          <div className="security-operations-fields">
            <label>Início<input name="start" type="datetime-local" required /></label>
            <label>Fim<input name="end" type="datetime-local" required /></label>
            {fields.map(([name, label]) => <label key={name}>{label}<input name={name} type="number" min="0" max="1000000" step="1" required placeholder="Informe a contagem" /></label>)}
          </div>
          <p>O total web deve incluir bloqueios WAF e respostas 5xx, sem contar a mesma requisição duas vezes.</p>
          <label className="security-operations-consent"><input name="authorized" type="checkbox" required />Confirmo que os totais pertencem a este ativo e que tenho autorização para analisá-los.</label>
          {localError ? <p role="alert">{localError}</p> : null}
          <button type="submit">Analisar eventos →</button>
        </fieldset>
      </form>
    </details>
    <details>
      <summary>{mode === "blue_team" ? "Plano de investigação e resposta" : "Preparação do pentest e validação de controles"}</summary>
      <p>{mode === "blue_team" ? "Passos sugeridos para o responsável investigar e validar a recuperação." : "Plano baseado no último diagnóstico. Testes ativos e autenticados ainda não são executados pela plataforma."}</p>
      {!playbooks.length ? <p>Nenhuma ação gerada. Execute uma análise para obter um plano ligado às evidências disponíveis.</p> : playbooks.map((book) => <article key={book.code}>
        <h4>{book.title}</h4><small>Evidência: {book.evidenceCodes.join(", ")} · execução manual · validação: {book.validationMethod.replaceAll("_", " ")}</small>
        <ol>{book.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p><b>Como validar:</b> {book.validation}</p>
        {book.references.length ? <p className="security-reference-list"><b>Referências:</b> {book.references.map((reference, index) => <span key={`${reference.framework}-${reference.id}`}>{index ? " · " : " "}<a href={reference.url} target="_blank" rel="noreferrer">{reference.framework} {reference.id}</a> ({reference.relationship.replaceAll("_", " ")})</span>)}</p> : null}
      </article>)}
    </details>
  </div>;
}
