"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type Check = {
  code: string;
  title: string;
  status: "pass" | "warning" | "risk" | "unavailable";
  detail: string;
  action: string;
};

type Result = {
  domain: string;
  checkedAt: string;
  posture: { score: number; level: "strong" | "attention" | "exposed"; passCount: number; warningCount: number; riskCount: number; unavailableCount: number };
  checks: Check[];
  limitation: string;
};

const statusLabel = { pass: "Protegido", warning: "Atenção", risk: "Exposto", unavailable: "Não verificado" } as const;
const statusClass = { pass: "protected", warning: "attention", risk: "exposed", unavailable: "unknown" } as const;
const levelCopy = {
  strong: { title: "Boa postura nos sinais verificados", text: "Os controles públicos analisados estão majoritariamente presentes." },
  attention: { title: "Há pontos que merecem atenção", text: "Priorize os itens indicados antes que uma configuração fraca seja explorada." },
  exposed: { title: "Exposição relevante identificada", text: "Existem controles ausentes ou sinais que precisam de correção prioritária." },
} as const;

function track(campaign: string, reason = "") {
  const url = new URL(window.location.href);
  const payload = JSON.stringify({
    eventType: "seo_cta",
    pathname: url.pathname,
    source: url.searchParams.get("utm_source") ?? "",
    medium: url.searchParams.get("utm_medium") ?? "",
    campaign,
    reason: reason || campaign,
  });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics/collect", new Blob([payload], { type: "application/json" }));
  else void fetch("/api/analytics/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
}

export default function CybersecurityPreview() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signupPath = useMemo(() => {
    const query = new URLSearchParams({ interest: "cybersecurity" });
    if (result?.domain) query.set("domain", result.domain);
    return `/cadastro?${query.toString()}`;
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    track("cyber_preview_start");
    try {
      const response = await fetch("/api/public/cybersecurity-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const payload = await response.json() as Result & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível verificar este domínio.");
      setResult(payload);
      track(`cyber_preview_result_${payload.posture.level}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir a verificação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cyber-preview">
      <form className="cyber-preview-form" onSubmit={submit}>
        <label htmlFor="cyber-domain">Domínio da empresa</label>
        <div>
          <span>https://</span>
          <input id="cyber-domain" name="domain" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="suaempresa.com.br" required autoComplete="url" inputMode="url" />
          <button type="submit" disabled={loading}>{loading ? "Verificando…" : "Analisar exposição"}<b>→</b></button>
        </div>
        <small>Use somente um domínio que você administra ou tem autorização para avaliar.</small>
      </form>

      {error ? <div className="cyber-preview-error" role="alert"><b>Não concluímos a leitura.</b><span>{error}</span></div> : null}

      {loading ? (
        <div className="cyber-preview-loading" aria-live="polite">
          <i /><div><b>Mapeando controles públicos…</b><span>DNS, e-mail, HTTPS e cabeçalhos de navegador.</span></div>
        </div>
      ) : null}

      {result ? (
        <div className={`cyber-result cyber-result-${result.posture.level}`} aria-live="polite">
          <div className="cyber-result-summary">
            <div className="cyber-score"><strong>{result.posture.score}</strong><span>/100</span></div>
            <div><span>POSTURA EXTERNA · {result.domain}</span><h3>{levelCopy[result.posture.level].title}</h3><p>{levelCopy[result.posture.level].text}</p></div>
            <div className="cyber-result-counts"><b>{result.posture.passCount}<small>protegidos</small></b><b>{result.posture.warningCount}<small>atenção</small></b><b>{result.posture.riskCount}<small>expostos</small></b></div>
          </div>
          <div className="cyber-result-grid">
            {result.checks.map((check) => (
              <article key={check.code} className={`cyber-check-${statusClass[check.status]}`}>
                <div><i /><span>{statusLabel[check.status]}</span></div>
                <h4>{check.title}</h4><b>{check.detail}</b><p>{check.action}</p>
              </article>
            ))}
          </div>
          <div className="cyber-result-next">
            <div><span>PRÓXIMO PASSO</span><h3>Quer transformar os achados em um plano acompanhado?</h3><p>Cadastre seu interesse na nova CBSHub Cybersecurity e ajude a definir a primeira versão.</p></div>
            <Link href={signupPath} onClick={() => track("cyber_preview_signup", result.posture.level)}>Quero participar <span>→</span></Link>
          </div>
          <p className="cyber-limitation">{result.limitation}</p>
        </div>
      ) : null}
    </div>
  );
}
