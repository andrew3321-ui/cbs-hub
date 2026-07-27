"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ACCOUNT_ONBOARDING_STAGE_COUNT,
  isolatedDemonstrationCase,
  onboardingActionWarnings,
  onboardingCompletionPercentage,
  onboardingCoverageExplanation,
  onboardingModuleGuides,
  onboardingTrackFor,
  type OnboardingTarget,
  type OnboardingWorkspaceType,
} from "../../domain/account-onboarding";

type OnboardingProgress = {
  version: string;
  workspaceType: OnboardingWorkspaceType;
  currentStage: number;
  completedItemIds: string[];
  completedItems: number;
  totalItems: number;
  completionPercentage: number;
  dismissedAt: string | null;
  completedAt: string | null;
  isComplete: boolean;
  updatedAt: string | null;
};

type Props = {
  workspaceType: OnboardingWorkspaceType;
  workspaceRole: "owner" | "admin" | "preparer" | "reviewer";
  workspaceName: string;
  userName: string;
  onNavigate: (target: OnboardingTarget) => void;
};

type ProgressUpdate = {
  completedItemIds?: string[];
  currentStage?: number;
  dismissed?: boolean;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const stageLabels = ["Roteiro", "Demonstração", "Guia dos módulos", "Segurança"];

function initialProgress(workspaceType: OnboardingWorkspaceType): OnboardingProgress {
  return {
    version: "loading",
    workspaceType,
    currentStage: 0,
    completedItemIds: [],
    completedItems: 0,
    totalItems: onboardingTrackFor(workspaceType).length,
    completionPercentage: 0,
    dismissedAt: null,
    completedAt: null,
    isComplete: false,
    updatedAt: null,
  };
}

export default function AccountOnboarding({ workspaceType, workspaceRole, workspaceName, userName, onNavigate }: Props) {
  const [progress, setProgress] = useState<OnboardingProgress>(() => initialProgress(workspaceType));
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeGuideCode, setActiveGuideCode] = useState(onboardingModuleGuides[0].code);
  const track = useMemo(() => onboardingTrackFor(workspaceType), [workspaceType]);
  const activeGuide = onboardingModuleGuides.find((guide) => guide.code === activeGuideCode) ?? onboardingModuleGuides[0];

  useEffect(() => {
    let active = true;
    fetch("/api/onboarding", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { progress?: OnboardingProgress; error?: string };
        if (!response.ok || !payload.progress) throw new Error(payload.error ?? "Guia inicial indisponível.");
        return payload.progress;
      })
      .then((stored) => {
        if (!active) return;
        setProgress(stored);
        setOpen(!stored.isComplete && !stored.dismissedAt);
        setLoaded(true);
      })
      .catch((cause) => {
        if (!active) return;
        setLoaded(true);
        setError(cause instanceof Error ? cause.message : "Guia inicial indisponível.");
      });
    return () => { active = false; };
  }, []);

  async function persist(update: ProgressUpdate) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const payload = await response.json() as { progress?: OnboardingProgress; error?: string };
      if (!response.ok || !payload.progress) throw new Error(payload.error ?? "Não foi possível salvar seu progresso.");
      setProgress(payload.progress);
      return payload.progress;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar seu progresso.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(itemId: string) {
    if (saving) return;
    const completedItemIds = progress.completedItemIds.includes(itemId)
      ? progress.completedItemIds.filter((id) => id !== itemId)
      : [...progress.completedItemIds, itemId];
    setProgress((current) => ({
      ...current,
      completedItemIds,
      completedItems: completedItemIds.length,
      completionPercentage: onboardingCompletionPercentage(workspaceType, completedItemIds),
    }));
    await persist({ completedItemIds });
  }

  async function changeStage(stage: number) {
    const currentStage = Math.min(ACCOUNT_ONBOARDING_STAGE_COUNT - 1, Math.max(0, stage));
    setProgress((current) => ({ ...current, currentStage }));
    await persist({ currentStage });
  }

  async function dismiss() {
    setOpen(false);
    await persist({ dismissed: true });
  }

  async function launch() {
    setOpen(true);
    if (progress.dismissedAt) await persist({ dismissed: false });
  }

  function navigate(target: OnboardingTarget) {
    setOpen(false);
    onNavigate(target === "reviews" && workspaceType === "individual" ? "simulator" : target);
  }

  function openChecklistAction(itemId: string, target: OnboardingTarget) {
    if (itemId === "demo-reviewed") {
      void changeStage(1);
      return;
    }
    navigate(target);
  }

  return (
    <>
      <button className={`onboarding-launcher ${progress.isComplete ? "complete" : ""}`} type="button" onClick={() => void launch()} aria-label={`Abrir guia inicial, ${progress.completionPercentage}% concluído`}>
        <span>{progress.isComplete ? "✓" : "◎"}</span>
        <b>{progress.isComplete ? "Guia concluído" : "Guia inicial"}</b>
        <small>{loaded ? `${progress.completionPercentage}%` : "…"}</small>
      </button>

      {open && typeof document !== "undefined" && createPortal(<div className="onboarding-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && void dismiss()}>
        <section className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <header className="onboarding-header">
            <div>
              <span>PRIMEIRO RESULTADO CONFIÁVEL · {workspaceType === "office" ? "ESCRITÓRIO" : "CONTADOR INDEPENDENTE"}</span>
              <h2 id="onboarding-title">Olá, {userName.split(/\s+/)[0]}. Vamos configurar seu fluxo.</h2>
              <p>{workspaceName} · papel atual: {workspaceRole}</p>
            </div>
            <button type="button" onClick={() => void dismiss()} aria-label="Fechar e retomar depois">×</button>
          </header>

          <div className="onboarding-progress">
            <div><span>PROGRESSO RETOMÁVEL</span><b>{progress.completedItems}/{progress.totalItems} itens</b></div>
            <progress max={100} value={progress.completionPercentage} />
            <strong>{progress.completionPercentage}%</strong>
          </div>

          <nav className="onboarding-stages" aria-label="Etapas do guia">
            {stageLabels.map((label, index) => <button type="button" className={progress.currentStage === index ? "active" : ""} onClick={() => void changeStage(index)} disabled={saving} key={label}><span>{index + 1}</span>{label}</button>)}
          </nav>

          <div className="onboarding-body">
            {progress.currentStage === 0 && <section className="onboarding-track">
              <div className="onboarding-section-heading"><span>CHECKLIST DA CONTA</span><h3>{workspaceType === "office" ? "Do cadastro à segunda revisão" : "Do cadastro à entrega responsável"}</h3><p>Marque somente após conferir. O progresso fica salvo para continuar em outro acesso.</p></div>
              <div className="onboarding-checklist">
                {track.map((item) => {
                  const checked = progress.completedItemIds.includes(item.id);
                  return <article className={checked ? "checked" : ""} key={item.id}>
                    <label><input type="checkbox" checked={checked} disabled={saving} onChange={() => void toggleItem(item.id)} /><span>{checked ? "✓" : ""}</span></label>
                    <div><b>{item.title}</b><p>{item.evidence}</p></div>
                    <button type="button" onClick={() => openChecklistAction(item.id, item.target)}>{item.actionLabel} →</button>
                  </article>;
                })}
              </div>
            </section>}

            {progress.currentStage === 1 && <section className="onboarding-demo">
              <div className="demo-isolation-banner"><span>DEMO</span><div><b>AMBIENTE ISOLADO — NÃO É CLIENTE REAL</b><p>Não cria empresa, não consome capacidade, não salva e não pode ser entregue.</p></div></div>
              <div className="onboarding-section-heading"><span>CASO {isolatedDemonstrationCase.code}</span><h3>{isolatedDemonstrationCase.label}</h3><p>{isolatedDemonstrationCase.nature}</p></div>
              <div className="demo-case-grid">
                <section><small>FATOS PREENCHIDOS</small>{isolatedDemonstrationCase.facts.map((fact) => <p key={fact}>✓ {fact}</p>)}</section>
                <section><small>DOCUMENTOS QUE SERIAM EXIGIDOS</small>{isolatedDemonstrationCase.documents.map((document) => <p key={document}>□ {document}</p>)}</section>
              </div>
              <div className="demo-result-grid">
                <article><span>Tributos atuais declarados</span><strong>{money.format(isolatedDemonstrationCase.result.currentTaxCents / 100)}</strong></article>
                <article><span>Projeção declarada</span><strong>{money.format(isolatedDemonstrationCase.result.projectedTaxCents / 100)}</strong></article>
                <article className="attention"><span>Diferença mensal</span><strong>+ {money.format(isolatedDemonstrationCase.result.monthlyTaxDeltaCents / 100)}</strong></article>
                <article><span>Margem projetada</span><strong>{money.format(isolatedDemonstrationCase.result.projectedMarginCents / 100)}</strong></article>
              </div>
              <div className="demo-coverage"><span>PARCIAL</span><p>O cálculo financeiro fecha, mas as alíquotas são declaradas e não houve classificação jurídica da operação. Portanto, este exemplo não produz imposto a recolher.</p></div>
              <ul className="demo-limits">{isolatedDemonstrationCase.limits.map((limit) => <li key={limit}>{limit}</li>)}</ul>
              <button className="onboarding-mark-button" type="button" disabled={saving || progress.completedItemIds.includes("demo-reviewed")} onClick={() => void toggleItem("demo-reviewed")}>{progress.completedItemIds.includes("demo-reviewed") ? "✓ Demonstração revisada" : "Marcar demonstração como revisada"}</button>
            </section>}

            {progress.currentStage === 2 && <section className="onboarding-guides">
              <div className="onboarding-section-heading"><span>GUIA CONTEXTUAL</span><h3>O que preparar antes de abrir cada módulo</h3><p>Escolha o módulo para ver fatos mínimos, documentos esperados e o limite explícito da saída.</p></div>
              <div className="guide-layout">
                <nav aria-label="Módulos guiados">{onboardingModuleGuides.map((guide) => <button type="button" className={guide.code === activeGuide.code ? "active" : ""} onClick={() => setActiveGuideCode(guide.code)} key={guide.code}>{guide.title}<span>→</span></button>)}</nav>
                <article className="guide-detail">
                  <span>{activeGuide.code}</span><h3>{activeGuide.title}</h3><p>{activeGuide.purpose}</p>
                  <div><section><small>FATOS MÍNIMOS</small>{activeGuide.minimumFacts.map((fact) => <p key={fact}>✓ {fact}</p>)}</section><section><small>DOCUMENTOS</small>{activeGuide.expectedDocuments.map((document) => <p key={document}>□ {document}</p>)}</section></div>
                  <aside><b>Limites deste módulo</b>{activeGuide.explicitLimits.map((limit) => <p key={limit}>! {limit}</p>)}</aside>
                  <button type="button" onClick={() => navigate(activeGuide.target)}>Abrir {activeGuide.title} →</button>
                </article>
              </div>
            </section>}

            {progress.currentStage === 3 && <section className="onboarding-safety">
              <div className="onboarding-section-heading"><span>COBERTURA E RESPONSABILIDADE</span><h3>O estado da resposta define o que você pode fazer</h3><p>A cor ajuda na leitura, mas a consequência escrita é o controle principal.</p></div>
              <div className="coverage-explanation-grid">{onboardingCoverageExplanation.map((item) => <article className={item.status} key={item.status}><span>{item.label}</span><b>{item.meaning}</b><p>{item.consequence}</p></article>)}</div>
              <div className="action-warning-grid">{Object.entries(onboardingActionWarnings).map(([code, warning]) => <article key={code}><span>ANTES DE {code === "save" ? "SALVAR" : code === "approve" ? "APROVAR" : "ENTREGAR"}</span><h4>{warning.title}</h4>{warning.checks.map((check) => <p key={check}>□ {check}</p>)}</article>)}</div>
              <p className="onboarding-safety-note"><b>Proteção ativa:</b> salvar e entregar exigem confirmação específica. A aprovação exige declaração de responsabilidade e confirmação do servidor.</p>
            </section>}
          </div>

          {error && <div className="onboarding-error" role="alert">{error}</div>}
          <footer className="onboarding-footer">
            <button type="button" onClick={() => void dismiss()} disabled={saving}>Fechar e retomar depois</button>
            <span>{progress.updatedAt ? `Salvo em ${new Date(progress.updatedAt).toLocaleString("pt-BR")}` : "O progresso será salvo na conta."}</span>
            {progress.currentStage < ACCOUNT_ONBOARDING_STAGE_COUNT - 1
              ? <button type="button" className="primary" onClick={() => void changeStage(progress.currentStage + 1)} disabled={saving}>Continuar →</button>
              : <button type="button" className="primary" onClick={() => { setOpen(false); onNavigate("companies"); }} disabled={saving}>Ir para minha carteira →</button>}
          </footer>
        </section>
      </div>, document.body)}
    </>
  );
}
