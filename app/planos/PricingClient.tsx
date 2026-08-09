"use client";

import { useCallback, useEffect, useState } from "react";
import {
  billingPlans,
  type PurchasablePaidPlanKey,
} from "../../domain/billing-plans";
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
  canManageBilling: boolean;
  workspaceType: "individual" | "office";
  billingProfileComplete: boolean;
  entitlements: WorkspaceEntitlements | null;
  billing: {
    planKey: string;
    status: string;
    checkoutUrl: string | null;
    nextPaymentAt: string | null;
    paymentFlow: "card_subscription" | "pix_monthly" | null;
    renewalEligible: boolean;
    companyAddonBlocks: number;
    pendingCompanyAddonBlocks: number;
    pix: PixCheckout | null;
  };
};

const statusLabels: Record<string, string> = {
  beta: "Beta gratuito",
  trial: "Teste profissional",
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

function formatMoney(valueCents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(valueCents / 100);
}

export default function PricingClient({ signedIn }: { signedIn: boolean }) {
  const [authenticated, setAuthenticated] = useState(signedIn);
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
    let current = true;
    const returnedFromProvider = new URLSearchParams(window.location.search).get("retorno") === "mercado-pago";
    fetch("/api/billing", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<BillingState> : Promise.reject())
      .then((data) => {
        if (!current) return;
        setAuthenticated(true);
        setBilling(data);
        if (returnedFromProvider) setMessage(data.billing.status === "active" ? "Pagamento confirmado pelo Mercado Pago. Seu acesso está ativo." : "Retorno recebido. A confirmação ainda está sendo conciliada.");
        if (returnedFromProvider) window.history.replaceState({}, "", "/planos");
      })
      .catch(() => { if (current) setBilling(null); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!billing?.billing.pix || !["pending", "in_process", "in_mediation"].includes(billing.billing.pix.status)) return;
    const timer = window.setInterval(() => void loadBilling(false).catch(() => undefined), 8_000);
    return () => window.clearInterval(timer);
  }, [billing?.billing.pix, loadBilling]);

  async function choosePlan(planKey: PurchasablePaidPlanKey, paymentMethod: "card" | "pix") {
    if (!authenticated) {
      window.location.assign(`/entrar?returnTo=${encodeURIComponent("/planos")}`);
      return;
    }
    setLoadingPlan(`${planKey}:${paymentMethod}`);
    setMessage("");
    try {
      const response = await fetch(paymentMethod === "pix" ? "/api/billing/pix" : "/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, addonBlocks: 0 }),
      });
      const data = await response.json() as { checkoutUrl?: string; pix?: PixCheckout | null; message?: string; error?: string; mode?: string; status?: string; supportCode?: string; code?: string; profileUrl?: string };
      if (data.code === "BILLING_PROFILE_REQUIRED" && data.profileUrl) {
        window.location.assign(data.profileUrl);
        return;
      }
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
      setBilling((current) => current ? {
        ...current,
        billing: {
          ...current.billing,
          planKey,
          status: "interest",
          pendingCompanyAddonBlocks: 0,
        },
      } : current);
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

  function paidPlanActions(planKey: PurchasablePaidPlanKey) {
    const cardBusy = loadingPlan === `${planKey}:card`;
    const pixBusy = loadingPlan === `${planKey}:pix`;
    const isCurrentPlan = Boolean(active && billing?.billing.planKey === planKey);

    if (authenticated && billing && !billing.canManageBilling) {
      return <div className="pricing-payment-actions single">
        <p className="pricing-contract-note">A assinatura pertence ao espaço profissional. Somente o proprietário pode contratar ou cancelar.</p>
      </div>;
    }

    if (billing?.workspaceType === "office" && planKey === "pro") {
      return <div className="pricing-payment-actions single">
        <p className="pricing-contract-note">Este workspace já opera como escritório. Para preservar equipe, papéis e revisões, contrate o plano Escritório.</p>
      </div>;
    }

    if (active && billing?.billing.planKey === "unico") {
      return <div className="pricing-payment-actions single">
        <p className="pricing-contract-note">Seu contrato CBSHub 30 continua preservado no valor e na capacidade atuais. Cancele-o antes de contratar um dos novos modos.</p>
      </div>;
    }

    if (active && !isCurrentPlan) {
      return <div className="pricing-payment-actions single">
        <p className="pricing-contract-note">Cancele o plano atual antes de mudar de modo, evitando contratos simultâneos.</p>
      </div>;
    }

    if (isCurrentPlan && billing?.billing.paymentFlow === "pix_monthly") {
      return <div className="pricing-payment-actions single">
        <button className="pricing-button pix" onClick={() => void choosePlan(planKey, "pix")} disabled={Boolean(loadingPlan) || !pixCanRenew}>
          {pixBusy ? "Gerando Pix…" : pixCanRenew ? "Renovar este plano com Pix" : "Plano atual · renovação ainda fechada"}
        </button>
        <small>A renovação por Pix é liberada sete dias antes do término do acesso pago.</small>
      </div>;
    }

    if (isCurrentPlan) return <div className="pricing-payment-actions single"><button className="pricing-button dark" disabled>Plano atual</button></div>;

    return <div className="pricing-payment-actions">
      <button className="pricing-button dark" onClick={() => void choosePlan(planKey, "card")} disabled={Boolean(loadingPlan) || active}>
        {cardBusy ? "Preparando…" : billing?.paymentsEnabled ? "Cartão automático" : "Registrar interesse"}
      </button>
      <button className="pricing-button pix" onClick={() => void choosePlan(planKey, "pix")} disabled={Boolean(loadingPlan) || active}>
        {pixBusy ? "Gerando Pix…" : billing?.paymentsEnabled ? "Pix mensal" : "Interesse em Pix"}
      </button>
      <small>Cartão renova automaticamente · Pix exige confirmação a cada mês</small>
    </div>;
  }

  return (
    <>
      <section className="payment-mode-notice live">
        <span>DOIS MODOS · A MESMA BASE FISCAL COMPLETA</span>
        <p>Escolha o espaço individual por R$ 59 ou o escritório colaborativo por R$ 149. Todos os módulos fiscais permanecem incluídos.</p>
      </section>
      {authenticated && billing && <section className={`payment-mode-notice ${billing.paymentsEnabled ? "live" : "beta"}`}>
        <span>{billing.entitlements?.trialActive ? `TESTE PROFISSIONAL · ${billing.entitlements.trialDaysRemaining} DIA(S) RESTANTE(S)` : billing.paymentsEnabled ? "CONTRATAÇÃO DISPONÍVEL" : "CONTRATAÇÃO TEMPORARIAMENTE INDISPONÍVEL"}</span>
        <p>{billing.entitlements?.trialActive
          ? `Todos os recursos e até 10 empresas estão liberados até ${formatDate(billing.entitlements.trialEndsAt)}. Depois disso, a conta volta ao acesso básico se não houver contratação.`
          : billing.paymentsEnabled
            ? "O servidor aplica a capacidade contratada. Todos os recursos profissionais permanecem incluídos."
            : "Nenhuma nova cobrança será iniciada enquanto o pagamento estiver bloqueado. Seu acesso atual permanece preservado."}</p>
      </section>}
      {authenticated && billing && <section className={`billing-status-card ${billing.billing.status}`}>
        <div><span>SEU ACESSO EFETIVO</span><strong>Plano {billing.entitlements?.name ?? statusLabels[billing.billing.status] ?? billing.billing.status}</strong><small>{billing.entitlements?.companyLimit === null ? "Empresas e recursos sem restrições enquanto este acesso estiver vigente." : `Até ${billing.entitlements?.companyLimit ?? 1} empresa(s) · recursos aplicados pelo servidor.`}</small></div>
        {billing.billing.status === "active" && <div><span>ASSINATURA REGISTRADA</span><strong>{`${formatMoney(billing.entitlements?.monthlyPriceCents ?? billingPlans[billing.billing.planKey as keyof typeof billingPlans]?.priceCents ?? 0)}/mês`}</strong><small>{billing.betaEnabled ? "O beta não cancela a renovação automática existente." : billing.billing.planKey === "unico" ? "Contrato CBSHub 30 preservado." : billing.billing.planKey === "escritorio" ? "Modo escritório com equipe ilimitada." : "Modo contador independente."}</small></div>}
        {billing.billing.nextPaymentAt && <div><span>{billing.billing.paymentFlow === "pix_monthly" ? "ACESSO PAGO ATÉ" : "PRÓXIMA COBRANÇA"}</span><strong>{new Date(billing.billing.nextPaymentAt).toLocaleDateString("pt-BR")}</strong><small>{billing.billing.paymentFlow === "pix_monthly" ? "Renove por Pix quando faltar até 7 dias" : "Renovação automática; cancele antes desta data para impedir a próxima cobrança"}</small></div>}
        {billing.billing.status === "pending" && billing.billing.paymentFlow === "card_subscription" && billing.billing.checkoutUrl && <a href={billing.billing.checkoutUrl}>Continuar no cartão →</a>}
        {billing.canManageBilling && billing.billing.status === "active" && billing.billing.paymentFlow === "card_subscription" && <button onClick={cancelPayment}>Cancelar renovação</button>}
        {billing.canManageBilling && ["pending", "renewal_pending"].includes(billing.billing.status) && billing.billing.paymentFlow === "pix_monthly" && <button onClick={cancelPayment}>Descartar Pix</button>}
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
          <span className="pricing-label">TESTE GRATUITO</span>
          <h2>5 dias de acesso completo</h2>
          <div className="pricing-value"><strong>R$ 0</strong><small>/5 dias</small></div>
          <p>Conheça a operação profissional com todos os módulos liberados e escolha seu modo definitivo somente depois de testar.</p>
          <ul><li>Até 10 empresas durante o teste</li><li>Todos os módulos fiscais e cálculos</li><li>Relatórios, documentos e importações</li><li>Fluxo individual e colaborativo para avaliação</li><li>Sem cobrança automática no cadastro</li></ul>
          <a className="pricing-button secondary" href={authenticated ? "/app" : "/cadastro"}>{authenticated ? "Voltar ao aplicativo" : "Iniciar teste de 5 dias"}</a>
        </article>

        <article className="pricing-card featured">
          <span className="pricing-popular">PARA QUEM TRABALHA SOZINHO</span>
          <span className="pricing-label">CONTADOR INDEPENDENTE</span>
          <h2>Espaço profissional individual</h2>
          <div className="pricing-value"><strong>{formatMoney(billingPlans.pro.priceCents)}</strong><small>/mês</small></div>
          <p>Para o profissional que prepara, revisa e responde pela própria carteira em um único acesso.</p>
          <ul><li>Até 10 empresas</li><li>Todos os módulos fiscais e cálculos</li><li>Inteligência e laboratório fiscal</li><li>Relatórios, documentos e importações</li><li>Dossiês, fontes, memória e histórico versionado</li></ul>
          {paidPlanActions("pro")}
        </article>

        <article className="pricing-card office-plan">
          <span className="pricing-label">ESCRITÓRIO CONTÁBIL</span>
          <h2>Workspace colaborativo</h2>
          <div className="pricing-value"><strong>{formatMoney(billingPlans.escritorio.priceCents)}</strong><small>/mês</small></div>
          <p>Para escritórios que distribuem preparação, revisão e administração sem pagar por usuário.</p>
          <ul><li>Até 50 empresas</li><li>Pessoas e convites ilimitados no workspace</li><li>Proprietário, administradores, preparadores e revisores</li><li>Bloqueio de autoaprovação e autoria preservada</li><li>Todos os módulos do plano individual</li></ul>
          {paidPlanActions("escritorio")}
        </article>
      </div>

      <p className="pricing-safety"><span>✓</span> Cartão e Pix são processados pelo Mercado Pago. O CBSHub não recebe números de cartão nem armazena sua chave Pix.</p>
    </>
  );
}
