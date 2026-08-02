"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import LandingTrackedCta from "./LandingTrackedCta";

type FiscalPreview = {
  status: { code: "supported" | "partial" | "not_supported"; label: string };
  topicCode: string;
  headline: string;
  summary: string;
  completeness: { known: number; required: number; percentage: number };
  identifiedFacts: Array<{ key: string; label: string; value: string }>;
  pendingFacts: Array<{ field: string; prompt: string }>;
  pendingFactCount: number;
  finding: { label: string; value: string; detail: string } | null;
  source: { title: string; publisher: string; url: string; legalReference: string; checkedAt: string } | null;
  knowledge: { version: string; fingerprint: string; checkedAt: string };
  limitation: string;
};

const examples = [
  "ICMS-ST de autopeças de SP para MG",
  "Como destacar IBS e CBS em 2026?",
  "ISS de consultoria entre Campinas e Belo Horizonte",
];

function trackedPayload(campaign: string) {
  const url = new URL(window.location.href);
  let referrerHost = "";
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch { referrerHost = ""; }
  return JSON.stringify({
    eventType: "seo_cta",
    pathname: url.pathname,
    source: url.searchParams.get("utm_source") ?? "",
    medium: url.searchParams.get("utm_medium") ?? "",
    campaign,
    reason: campaign,
    referrerHost,
  });
}

function track(campaign: string) {
  const payload = trackedPayload(campaign);
  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/analytics/collect", new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch("/api/analytics/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
}

function continuationHref(question: string, authenticated: boolean) {
  const appPath = `/app?view=intelligence&question=${encodeURIComponent(question)}`;
  if (authenticated) return appPath;
  const params = new URLSearchParams({ returnTo: appPath });
  const current = new URLSearchParams(window.location.search);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = current.get(key);
    if (value) params.set(key, value);
  }
  return `/cadastro?${params.toString()}`;
}

export default function LandingFiscalPreview({ authenticated, onEngagement }: { authenticated: boolean; onEngagement?: () => void }) {
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [preview, setPreview] = useState<FiscalPreview | null>(null);
  const [continueHref, setContinueHref] = useState(authenticated ? "/app?view=intelligence" : "/cadastro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => () => requestController.current?.abort(), []);

  async function analyze(nextQuestion = question) {
    const normalized = nextQuestion.trim();
    if (normalized.length < 5 || loading) return;
    onEngagement?.();
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    setError("");
    setPreview(null);
    track("home_public_preview_submit");
    try {
      const response = await fetch("/api/public/fiscal-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: normalized }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json() as { error?: string; preview?: FiscalPreview };
      if (!response.ok || !data.preview) throw new Error(data.error ?? "Não foi possível gerar a prévia agora.");
      if (sequence !== requestSequence.current) return;
      setSubmittedQuestion(normalized);
      setContinueHref(continuationHref(normalized, authenticated));
      setPreview(data.preview);
      track(`home_public_preview_${data.preview.status.code}`);
    } catch (cause) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar a prévia agora.");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void analyze();
  }

  function chooseExample(example: string) {
    requestSequence.current += 1;
    requestController.current?.abort();
    setLoading(false);
    setQuestion(example);
    setPreview(null);
    setError("");
    void analyze(example);
  }

  return (
    <section className={`cbs-live-preview ${preview ? "has-result" : ""}`} aria-label="Experimente a inteligência fiscal" onFocusCapture={onEngagement}>
      <form onSubmit={submit}>
        <div className="cbs-live-preview-label">
          <span><i /> TESTE SEM CADASTRO</span>
          <small>nenhuma pergunta é armazenada</small>
        </div>
        <label htmlFor="landing-fiscal-question">Qual caso você precisa resolver?</label>
        <div className="cbs-live-preview-input">
          <textarea
            id="landing-fiscal-question"
            rows={2}
            minLength={5}
            maxLength={500}
            value={question}
            onChange={(event) => {
              requestSequence.current += 1;
              requestController.current?.abort();
              setLoading(false);
              setQuestion(event.target.value);
              setPreview(null);
              setError("");
            }}
            placeholder="Ex.: qual o tratamento de ICMS-ST para autopeças de SP para MG?"
          />
          <button type="submit" disabled={loading || question.trim().length < 5}>
            {loading ? "Estruturando…" : "Analisar agora"}<span>→</span>
          </button>
        </div>
        <div className="cbs-live-preview-examples" aria-label="Casos de exemplo">
          {examples.map((example) => <button type="button" onClick={() => chooseExample(example)} key={example}>{example}</button>)}
        </div>
      </form>

      <div className="cbs-live-preview-feedback" aria-live="polite" aria-busy={loading}>
        {loading && <div className="cbs-live-preview-loading"><i /><span>Extraindo tributo, rota, produto e fatos da operação…</span></div>}
        {error && <div className="cbs-live-preview-error" role="alert"><b>Prévia interrompida</b><span>{error}</span></div>}
        {preview && <div className="cbs-live-result">
          <div className={`cbs-live-result-status ${preview.status.code}`}>
            <span><i /> {preview.status.label}</span>
            <small>{preview.completeness.known}/{preview.completeness.required} fatos mínimos identificados</small>
          </div>
          <div className="cbs-live-result-body">
            <div>
              <small>TRATAMENTO ENCONTRADO</small>
              <h2>{preview.headline}</h2>
              <p>{preview.summary}</p>
            </div>
            {preview.finding && <div className="cbs-live-finding"><small>{preview.finding.label}</small><strong>{preview.finding.value}</strong><span>referência de triagem</span></div>}
          </div>
          {preview.identifiedFacts.length > 0 && <div className="cbs-live-facts">
            {preview.identifiedFacts.map((fact) => <span key={fact.key}><small>{fact.label}</small><b>{fact.value}</b></span>)}
          </div>}
          {preview.pendingFacts.length > 0 && <div className="cbs-live-pending">
            <b>Para concluir dentro da plataforma:</b>
            <ul>{preview.pendingFacts.map((fact) => <li key={fact.field}>{fact.prompt}</li>)}</ul>
            {preview.pendingFactCount > preview.pendingFacts.length && <small>+ {preview.pendingFactCount - preview.pendingFacts.length} confirmação(ões) necessária(s)</small>}
          </div>}
          {preview.source && <a className="cbs-live-source" href={preview.source.url} target="_blank" rel="noreferrer">
            <span><small>FONTE OFICIAL DA PRÉVIA</small><b>{preview.source.title}</b></span><em>Conferir ↗</em>
          </a>}
          <div className="cbs-live-result-action">
            <p><b>Sua pergunta continuará preenchida.</b><span>{preview.limitation}</span></p>
            <LandingTrackedCta className="cbs-button" href={continueHref} campaign="home_public_preview_continue">
              {authenticated ? "Concluir no meu workspace" : "Criar conta e concluir"}<span>→</span>
            </LandingTrackedCta>
          </div>
          <small className="cbs-live-result-version">Base {preview.knowledge.version} · #{preview.knowledge.fingerprint} · caso: “{submittedQuestion}”</small>
        </div>}
      </div>
    </section>
  );
}
