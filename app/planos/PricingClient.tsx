"use client";

import { useEffect, useState } from "react";

type BillingState = {
  configured: boolean;
  billing: { planKey: string; status: string; checkoutUrl: string | null; nextPaymentAt: string | null };
};

const statusLabels: Record<string, string> = {
  beta: "Beta gratuito",
  interest: "Interesse registrado",
  pending: "Pagamento pendente",
  active: "Assinatura ativa",
  paused: "Assinatura pausada",
  canceled: "Assinatura cancelada",
};

export default function PricingClient({ signedIn }: { signedIn: boolean }) {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/billing")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: BillingState) => setBilling(data))
      .catch(() => setBilling(null));
  }, [signedIn]);

  async function choosePlan(planKey: "pro" | "escritorio") {
    if (!signedIn) {
      window.location.href = `/entrar?returnTo=${encodeURIComponent("/planos")}`;
      return;
    }
    setLoadingPlan(planKey);
    setMessage("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planKey }) });
      const data = await response.json() as { checkoutUrl?: string; message?: string; error?: string; mode?: string };
      if (!response.ok && response.status !== 202) throw new Error(data.error || "checkout_failed");
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      setMessage(data.message || "Interesse registrado com sucesso.");
      setBilling((current) => current ? { ...current, billing: { ...current.billing, planKey, status: "interest" } } : current);
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "checkout_failed" ? error.message : "Não foi possível preparar o pagamento agora.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function cancelSubscription() {
    if (!window.confirm("Cancelar a renovação da assinatura?")) return;
    setMessage("");
    const response = await fetch("/api/billing/cancel", { method: "POST" });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "Não foi possível cancelar agora.");
      return;
    }
    setBilling((current) => current ? { ...current, billing: { ...current.billing, status: "canceled", checkoutUrl: null, nextPaymentAt: null } } : current);
    setMessage("Assinatura cancelada. Não haverá nova renovação.");
  }

  return (
    <>
      {signedIn && billing && <section className={`billing-status-card ${billing.billing.status}`}>
        <div><span>SEU ACESSO</span><strong>{statusLabels[billing.billing.status] ?? billing.billing.status}</strong><small>{billing.billing.status === "beta" ? "Todos os recursos atuais seguem liberados sem cobrança." : `Plano ${billing.billing.planKey}`}</small></div>
        {billing.billing.nextPaymentAt && <div><span>PRÓXIMA COBRANÇA</span><strong>{new Date(billing.billing.nextPaymentAt).toLocaleDateString("pt-BR")}</strong><small>Data informada pelo Mercado Pago</small></div>}
        {billing.billing.status === "pending" && billing.billing.checkoutUrl && <a href={billing.billing.checkoutUrl}>Continuar pagamento →</a>}
        {billing.billing.status === "active" && <button onClick={cancelSubscription}>Cancelar renovação</button>}
      </section>}

      {message && <div className="pricing-message" role="status">{message}</div>}

      <div className="pricing-grid">
        <article className="pricing-card beta">
          <span className="pricing-label">BETA ATUAL</span>
          <h2>Gratuito</h2>
          <div className="pricing-value"><strong>R$ 0</strong><small>/mês</small></div>
          <p>Para validar o produto com empresas reais durante o desenvolvimento.</p>
          <ul><li>Simulador completo</li><li>Cenários e comparações</li><li>Relatórios compartilháveis</li><li>Importação local de XML</li></ul>
          <a className="pricing-button secondary" href={signedIn ? "/app" : "/cadastro"}>{signedIn ? "Continuar no beta" : "Começar gratuitamente"}</a>
        </article>

        <article className="pricing-card featured">
          <span className="pricing-popular">MAIS INDICADO</span>
          <span className="pricing-label">PRO</span>
          <h2>Operação consultiva</h2>
          <div className="pricing-value"><strong>R$ 59</strong><small>/mês</small></div>
          <p>Sugerido para o contador independente que prepara e assume a própria revisão.</p>
          <ul><li>Até 10 empresas monitoradas</li><li>Espaço profissional individual</li><li>Revisão responsável explicitamente identificada</li><li>Histórico e suporte prioritário</li></ul>
          <button className="pricing-button" onClick={() => void choosePlan("pro")} disabled={loadingPlan === "pro"}>{loadingPlan === "pro" ? "Preparando…" : billing?.configured ? "Assinar Pro" : "Registrar interesse"}</button>
        </article>

        <article className="pricing-card">
          <span className="pricing-label">ESCRITÓRIO</span>
          <h2>Carteira em escala</h2>
          <div className="pricing-value"><strong>R$ 149</strong><small>/mês</small></div>
          <p>Sugerido para escritórios que dividem preparação, revisão e entrega.</p>
          <ul><li>Até 50 empresas monitoradas</li><li>Preparadores, revisores e administradores</li><li>Bloqueio de autoaprovação por quem preparou</li><li>Relatórios com autoria e revisão separadas</li></ul>
          <button className="pricing-button dark" onClick={() => void choosePlan("escritorio")} disabled={loadingPlan === "escritorio"}>{loadingPlan === "escritorio" ? "Preparando…" : billing?.configured ? "Assinar Escritório" : "Registrar interesse"}</button>
        </article>
      </div>

      <p className="pricing-safety"><span>✓</span> Nenhuma cobrança ocorre dentro do Margem Clara. O pagamento é concluído no ambiente seguro do Mercado Pago e a assinatura pode ser cancelada.</p>
    </>
  );
}
