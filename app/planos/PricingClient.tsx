"use client";

import { useCallback, useEffect, useState } from "react";
import { billingPlans, billingPricingMode } from "../../domain/billing-plans";
import type { WorkspaceEntitlements } from "../../domain/plan-entitlements";

type PixCheckout = {
  paymentId: string;
  status: string;
  statusDetail: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
};

type BillingState = {
  configured: boolean;
  betaEnabled: boolean;
  paymentsEnabled: boolean;
  entitlements: WorkspaceEntitlements | null;
  billing: {
    planKey: string;
    status: string;
    checkoutUrl: string | null;
    nextPaymentAt: string | null;
    paymentFlow: "card_subscription" | "pix_monthly" | null;
    renewalEligible: boolean;
    pix: PixCheckout | null;
  };
};

const statusLabels: Record<string, string> = {
  beta: "Beta gratuito",
  interest: "Interesse registrado",
  pix_creating: "Preparando Pix",
  pending: "Pagamento pendente",
  renewal_pending: "Renovação Pix pendente",
  active: "Acesso ativo",
  paused: "Assinatura pausada",
  payment_failed: "Pagamento não concluído",
  overdue: "Renovação necessária",
  canceled: "Assinatura cancelada",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export default function PricingClient({ signedIn }: { signedIn: boolean }) {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [message, setMessage] = useState("");

  const loadBilling = useCallback(async (announce = false) => {
    const response = await fetch("/api/billing", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível consultar o pagamento agora.");
    const data = await response.json() as BillingState;
    setBilling(data);
    if (data.billing.status === "active" && announce) setMessage("Pagamento confirmado pelo Mercado Pago. Seu acesso está ativo.");
    else if (announce) setMessage("Pagamento ainda não confirmado. Você pode atualizar novamente após concluir o Pix.");
    return data;
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let current = true;
    const returnedFromProvider = new URLSearchParams(window.location.search).get("retorno") === "mercado-pago";
    fetch("/api/billing", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<BillingState> : Promise.reject())
      .then((data) => {
        if (!current) return;
        setBilling(data);
        if (returnedFromProvider) setMessage(data.billing.status === "active" ? "Pagamento confirmado pelo Mercado Pago. Seu acesso está ativo." : "Retorno recebido. A confirmação ainda está sendo conciliada.");
        if (returnedFromProvider) window.history.replaceState({}, "", "/planos");
      })
      .catch(() => { if (current) setBilling(null); });
    return () => { current = false; };
  }, [signedIn]);

  useEffect(() => {
    if (!billing?.billing.pix || !["pending", "in_process", "in_mediation"].includes(billing.billing.pix.status)) return;
    const timer = window.setInterval(() => void loadBilling(false).catch(() => undefined), 8_000);
    return () => window.clearInterval(timer);
  }, [billing?.billing.pix, loadBilling]);

  async function choosePlan(planKey: "pro" | "escritorio", paymentMethod: "card" | "pix") {
    if (!signedIn) {
      window.location.assign(`/entrar?returnTo=${encodeURIComponent("/planos")}`);
      return;
    }
    setLoadingPlan(`${planKey}:${paymentMethod}`);
    setMessage("");
    try {
      const response = await fetch(paymentMethod === "pix" ? "/api/billing/pix" : "/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const data = await response.json() as { checkoutUrl?: string; pix?: PixCheckout | null; message?: string; error?: string; mode?: string; status?: string; supportCode?: string };
      if (!response.ok && response.status !== 202) throw new Error(`${data.error || "checkout_failed"}${data.supportCode ? ` · Código ${data.supportCode}` : ""}`);
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      if (data.mode === "pix") {
        await loadBilling(false);
        setMessage(data.message || (data.status === "active" ? "Pix confirmado. Seu acesso está ativo." : "Pix criado. Pague pelo QR Code ou Copia e Cola."));
        return;
      }
      setMessage(data.message || "Interesse registrado com sucesso.");
      setBilling((current) => current ? { ...current, billing: { ...current.billing, planKey, status: "interest" } } : current);
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "checkout_failed" ? error.message : "Não foi possível preparar o pagamento agora.");
    } finally {
      setLoadingPlan("");
    }
  }

  async function cancelPayment() {
    const pixFlow = billing?.billing.paymentFlow === "pix_monthly";
    const confirmation = pixFlow ? "Descartar este Pix pendente?" : "Cancelar a renovação automática da assinatura?";
    if (!window.confirm(confirmation)) return;
    setMessage("");
    const response = await fetch("/api/billing/cancel", { method: "POST" });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "Não foi possível cancelar agora.");
      return;
    }
    await loadBilling(false).catch(() => undefined);
    setMessage(pixFlow ? "Pix pendente descartado." : "Assinatura cancelada. Não haverá nova renovação automática.");
  }

  async function copyPix() {
    const code = billing?.billing.pix?.qrCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Código Pix copiado. Cole-o no aplicativo do seu banco.");
    } catch {
      setMessage("Não foi possível copiar automaticamente. Selecione o código e copie manualmente.");
    }
  }

  const active = billing?.billing.status === "active";
  const pixCanRenew = Boolean(active && billing?.billing.paymentFlow === "pix_monthly" && billing.billing.renewalEligible);
  const pix = billing?.billing.pix;

  function paidPlanActions(planKey: "pro" | "escritorio", dark = false) {
    const cardBusy = loadingPlan === `${planKey}:card`;
    const pixBusy = loadingPlan === `${planKey}:pix`;
    return <div className="pricing-payment-actions">
      <button className={`pricing-button${dark ? " dark" : ""}`} onClick={() => void choosePlan(planKey, "card")} disabled={Boolean(loadingPlan) || active}>
        {cardBusy ? "Preparando…" : billing?.paymentsEnabled ? "Cartão automático" : "Registrar interesse"}
      </button>
      <button className="pricing-button pix" onClick={() => void choosePlan(planKey, "pix")} disabled={Boolean(loadingPlan) || (active && !pixCanRenew)}>
        {pixBusy ? "Gerando Pix…" : pixCanRenew ? "Renovar com Pix" : billing?.paymentsEnabled ? "Pix mensal" : "Interesse em Pix"}
      </button>
      <small>Cartão renova automaticamente · Pix exige confirmação a cada mês</small>
    </div>;
  }

  return (
    <>
      {billingPricingMode === "checkout_test" && <section className="payment-mode-notice beta">
        <span>PREÇO TEMPORÁRIO DE TESTE</span>
        <p>Pro e Escritório custam R$ 1 por mês durante a validação. Cancele a assinatura após o teste quando usar cartão; o Pix não possui renovação automática.</p>
      </section>}
      {signedIn && billing && <section className={`payment-mode-notice ${billing.paymentsEnabled ? "live" : "beta"}`}>
        <span>{billing.paymentsEnabled ? "CARTÃO E PIX ATIVOS" : "BETA INTEGRAL ATIVO"}</span>
        <p>{billing.paymentsEnabled ? "Cada conta segue os limites e recursos do pacote contratado. Escolha cartão automático ou Pix mensal." : "Todos os recursos e empresas estão temporariamente liberados para todas as contas; novas cobranças estão bloqueadas no servidor."}</p>
      </section>}
      {signedIn && billing && <section className={`billing-status-card ${billing.billing.status}`}>
        <div><span>SEU ACESSO EFETIVO</span><strong>Plano {billing.entitlements?.name ?? statusLabels[billing.billing.status] ?? billing.billing.status}</strong><small>{billing.entitlements?.companyLimit === null ? "Empresas e recursos sem restrições enquanto este acesso estiver vigente." : `Até ${billing.entitlements?.companyLimit ?? 1} empresa(s) · recursos aplicados pelo servidor.`}</small></div>
        {billing.betaEnabled && billing.billing.status === "active" && <div><span>ASSINATURA REGISTRADA</span><strong>Plano {billing.billing.planKey}</strong><small>A ativação do beta não cancela a renovação automática existente.</small></div>}
        {billing.billing.nextPaymentAt && <div><span>{billing.billing.paymentFlow === "pix_monthly" ? "ACESSO PAGO ATÉ" : "PRÓXIMA COBRANÇA"}</span><strong>{new Date(billing.billing.nextPaymentAt).toLocaleDateString("pt-BR")}</strong><small>{billing.billing.paymentFlow === "pix_monthly" ? "Renove por Pix quando faltar até 7 dias" : "Data informada pelo Mercado Pago"}</small></div>}
        {billing.billing.status === "pending" && billing.billing.paymentFlow === "card_subscription" && billing.billing.checkoutUrl && <a href={billing.billing.checkoutUrl}>Continuar no cartão →</a>}
        {billing.billing.status === "active" && billing.billing.paymentFlow === "card_subscription" && <button onClick={cancelPayment}>Cancelar renovação</button>}
        {["pending", "renewal_pending"].includes(billing.billing.status) && billing.billing.paymentFlow === "pix_monthly" && <button onClick={cancelPayment}>Descartar Pix</button>}
      </section>}

      {message && <div className="pricing-message" role="status">{message}</div>}

      {pix && <section className="pix-checkout-panel" aria-labelledby="pix-checkout-title">
        <div className="pix-checkout-heading">
          <div><span>PAGAMENTO PROTEGIDO PELO MERCADO PAGO</span><h2 id="pix-checkout-title">Pague com Pix</h2><p>O plano só é ativado depois que o Mercado Pago confirmar o recebimento.</p></div>
          <div className="pix-pending-chip"><i /> Aguardando pagamento</div>
        </div>
        <div className="pix-checkout-body">
          <div className="pix-qr-box">
            {pix.qrCodeBase64 ? <>
              {/* The provider returns a one-use data URL, so it cannot use the image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix deste pagamento" />
            </> : <div className="pix-qr-placeholder">Abra o pagamento no Mercado Pago para visualizar o QR Code.</div>}
          </div>
          <div className="pix-instructions">
            <strong>Pix Copia e Cola</strong>
            <p>Copie o código abaixo e pague no aplicativo do seu banco. Este código é exclusivo para esta mensalidade.</p>
            {pix.qrCode && <textarea aria-label="Código Pix Copia e Cola" readOnly value={pix.qrCode} onFocus={(event) => event.currentTarget.select()} />}
            <div className="pix-actions">
              {pix.qrCode && <button type="button" onClick={() => void copyPix()}>Copiar código Pix</button>}
              {pix.ticketUrl && <a href={pix.ticketUrl} target="_blank" rel="noreferrer">Abrir no Mercado Pago ↗</a>}
              <button type="button" className="secondary" onClick={() => void loadBilling(true)}>Já paguei · atualizar</button>
            </div>
            <small>Vencimento: {formatDate(pix.expiresAt)} · A confirmação também é consultada automaticamente.</small>
          </div>
        </div>
        <div className="pix-safety-note"><span>!</span><p><b>Pix mensal não é débito automático.</b> A cada renovação será gerado um novo código; nunca transfira diretamente para uma chave enviada por mensagem.</p></div>
      </section>}

      <div className="pricing-grid">
        <article className="pricing-card beta">
          <span className="pricing-label">GRATUITO</span>
          <h2>Gratuito</h2>
          <div className="pricing-value"><strong>R$ 0</strong><small>/mês</small></div>
          <p>Entrada permanente para testar o fluxo essencial quando o beta integral estiver desligado.</p>
          <ul><li>Até 1 empresa monitorada</li><li>Simulador completo</li><li>Cenários e comparações</li><li>Relatórios compartilháveis</li><li>Importação local de XML</li></ul>
          <a className="pricing-button secondary" href={signedIn ? "/app" : "/cadastro"}>{signedIn ? "Continuar no beta" : "Começar gratuitamente"}</a>
        </article>

        <article className="pricing-card featured">
          <span className="pricing-popular">MAIS INDICADO</span>
          <span className="pricing-label">PRO</span>
          <h2>Operação consultiva</h2>
          <div className="pricing-value"><strong>R$ {billingPlans.pro.priceCents / 100}</strong><small>/mês · teste</small></div>
          <p>Sugerido para o contador independente que prepara e assume a própria revisão.</p>
          <ul><li>Até 10 empresas monitoradas</li><li>Simulador, cenários, relatórios e XML</li><li>Inteligência e laboratório fiscal</li><li>Cobertura nacional e expansão fiscal</li><li>Regras, governança e apuração assistida</li></ul>
          {paidPlanActions("pro")}
        </article>

        <article className="pricing-card">
          <span className="pricing-label">ESCRITÓRIO</span>
          <h2>Carteira em escala</h2>
          <div className="pricing-value"><strong>R$ {billingPlans.escritorio.priceCents / 100}</strong><small>/mês · teste</small></div>
          <p>Sugerido para escritórios que dividem preparação, revisão e entrega.</p>
          <ul><li>Até 50 empresas monitoradas</li><li>Todos os módulos fiscais do Pro</li><li>Preparadores, revisores e administradores</li><li>Bloqueio de autoaprovação por quem preparou</li><li>Autoria, revisão e entrega separadas</li></ul>
          {paidPlanActions("escritorio", true)}
        </article>
      </div>

      <p className="pricing-safety"><span>✓</span> Cartão e Pix são processados pelo Mercado Pago. O Margem Clara não recebe números de cartão nem armazena sua chave Pix.</p>
    </>
  );
}
