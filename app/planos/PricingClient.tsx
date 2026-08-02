"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BILLING_ADDON_COMPANY_BLOCK_SIZE,
  BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS,
  BILLING_MAX_ADDON_BLOCKS,
  billingAmountCents,
  billingCompanyLimit,
  billingPlans,
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

function capacityBlocksFromBilling(data: BillingState) {
  return data.billing.planKey === "unico"
    ? data.billing.pendingCompanyAddonBlocks ?? data.billing.companyAddonBlocks ?? 0
    : 0;
}

export default function PricingClient({ signedIn }: { signedIn: boolean }) {
  const [authenticated, setAuthenticated] = useState(signedIn);
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [message, setMessage] = useState("");
  const [selectedAddonBlocks, setSelectedAddonBlocks] = useState(0);

  const loadBilling = useCallback(async (announce = false) => {
    const response = await fetch("/api/billing", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível consultar o pagamento agora.");
    const data = await response.json() as BillingState;
    setBilling(data);
    setSelectedAddonBlocks(capacityBlocksFromBilling(data));
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
        setSelectedAddonBlocks(capacityBlocksFromBilling(data));
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

  async function choosePlan(paymentMethod: "card" | "pix") {
    if (!authenticated) {
      window.location.assign(`/entrar?returnTo=${encodeURIComponent("/planos")}`);
      return;
    }
    setLoadingPlan(`unico:${paymentMethod}`);
    setMessage("");
    try {
      const response = await fetch(paymentMethod === "pix" ? "/api/billing/pix" : "/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey: "unico", addonBlocks: selectedAddonBlocks }),
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
      setBilling((current) => current ? {
        ...current,
        billing: {
          ...current.billing,
          planKey: "unico",
          status: "interest",
          pendingCompanyAddonBlocks: selectedAddonBlocks,
        },
      } : current);
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "checkout_failed" ? error.message : "Não foi possível preparar o pagamento agora.");
    } finally {
      setLoadingPlan("");
    }
  }

  async function changeCapacity() {
    if (!billing) return;
    const companyLimit = billingCompanyLimit("unico", selectedAddonBlocks);
    const monthlyAmount = billingAmountCents("unico", selectedAddonBlocks);
    if (!window.confirm(`Alterar a assinatura para ${companyLimit} empresas por ${formatMoney(monthlyAmount)} por mês?`)) return;
    setLoadingPlan("unico:capacity");
    setMessage("");
    try {
      const response = await fetch("/api/billing/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAddonBlocks: selectedAddonBlocks }),
      });
      const data = await response.json() as { error?: string; message?: string; supportCode?: string };
      if (!response.ok) throw new Error(`${data.error || "Não foi possível alterar a capacidade."}${data.supportCode ? ` · Código ${data.supportCode}` : ""}`);
      await loadBilling(false);
      setMessage(data.message || `Capacidade atualizada para ${companyLimit} empresas.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível alterar a capacidade agora.");
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
  const activeUniquePlan = Boolean(active && billing?.billing.planKey === "unico");
  const legacyActive = Boolean(active && billing?.billing.planKey !== "unico");
  const selectedCompanyLimit = billingCompanyLimit("unico", selectedAddonBlocks);
  const selectedMonthlyAmount = billingAmountCents("unico", selectedAddonBlocks);
  const currentAddonBlocks = billing?.billing.companyAddonBlocks ?? 0;
  const capacityChanged = activeUniquePlan && selectedAddonBlocks !== currentAddonBlocks;

  function paidPlanActions() {
    const cardBusy = loadingPlan === "unico:card";
    const pixBusy = loadingPlan === "unico:pix";
    const capacityBusy = loadingPlan === "unico:capacity";

    if (authenticated && billing && !billing.canManageBilling) {
      return <div className="pricing-payment-actions single">
        <p className="pricing-contract-note">A assinatura pertence ao espaço profissional. Somente o proprietário pode contratar, alterar capacidade ou cancelar.</p>
      </div>;
    }

    if (legacyActive) {
      return <div className="pricing-payment-actions single">
        <p className="pricing-contract-note">Sua assinatura antiga continua no valor contratado. Cancele-a antes de migrar para o novo plano para evitar duas cobranças.</p>
      </div>;
    }

    if (activeUniquePlan && billing?.billing.paymentFlow === "card_subscription") {
      return <div className="pricing-payment-actions single">
        <button className="pricing-button dark" onClick={() => void changeCapacity()} disabled={Boolean(loadingPlan) || !capacityChanged}>
          {capacityBusy ? "Atualizando…" : capacityChanged ? `Atualizar para ${formatMoney(selectedMonthlyAmount)}/mês` : "Capacidade atual"}
        </button>
        <small>A alteração muda o valor das próximas cobranças automáticas no Mercado Pago.</small>
      </div>;
    }

    if (activeUniquePlan && billing?.billing.paymentFlow === "pix_monthly") {
      return <div className="pricing-payment-actions single">
        <button className="pricing-button pix" onClick={() => void choosePlan("pix")} disabled={Boolean(loadingPlan) || !pixCanRenew}>
          {pixBusy ? "Gerando Pix…" : pixCanRenew ? `Renovar ${selectedCompanyLimit} empresas com Pix` : "Alteração disponível na renovação"}
        </button>
        <small>No Pix, a nova capacidade entra na próxima mensalidade, quando a renovação estiver liberada.</small>
      </div>;
    }

    return <div className="pricing-payment-actions">
      <button className="pricing-button dark" onClick={() => void choosePlan("card")} disabled={Boolean(loadingPlan) || active}>
        {cardBusy ? "Preparando…" : billing?.paymentsEnabled ? "Cartão automático" : "Registrar interesse"}
      </button>
      <button className="pricing-button pix" onClick={() => void choosePlan("pix")} disabled={Boolean(loadingPlan) || active}>
        {pixBusy ? "Gerando Pix…" : billing?.paymentsEnabled ? "Pix mensal" : "Interesse em Pix"}
      </button>
      <small>Cartão renova automaticamente · Pix exige confirmação a cada mês</small>
    </div>;
  }

  return (
    <>
      <section className="payment-mode-notice live">
        <span>PLANO ÚNICO COM CAPACIDADE AJUSTÁVEL</span>
        <p>R$ 450 por mês com 30 empresas. Cada bloco adicional inclui 10 empresas por R$ 100 mensais, sem liberar ou retirar módulos.</p>
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
        {billing.billing.status === "active" && <div><span>ASSINATURA REGISTRADA</span><strong>{billing.billing.planKey === "unico" ? `${formatMoney(billing.entitlements?.monthlyPriceCents ?? billingPlans.unico.priceCents)}/mês` : `Contrato legado ${billing.billing.planKey}`}</strong><small>{billing.betaEnabled ? "O beta não cancela a renovação automática existente." : billing.billing.planKey === "unico" ? `${billing.billing.companyAddonBlocks} bloco(s) adicional(is) ativo(s).` : "Valor histórico preservado sem reajuste automático."}</small></div>}
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

      <div className="pricing-grid single-plan">
        <article className="pricing-card beta">
          <span className="pricing-label">TESTE GRATUITO</span>
          <h2>5 dias de acesso completo</h2>
          <div className="pricing-value"><strong>R$ 0</strong><small>/5 dias</small></div>
          <p>Conheça a operação profissional com todos os módulos liberados e capacidade suficiente para testar uma carteira real.</p>
          <ul><li>Até 10 empresas durante o teste</li><li>Todos os módulos fiscais e cálculos</li><li>Relatórios, documentos e importações</li><li>Equipe, revisão e entrega rastreável</li><li>Sem cobrança automática no cadastro</li></ul>
          <a className="pricing-button secondary" href={authenticated ? "/app" : "/cadastro"}>{authenticated ? "Voltar ao aplicativo" : "Iniciar teste de 5 dias"}</a>
        </article>

        <article className="pricing-card featured">
          <span className="pricing-popular">PLANO COMPLETO</span>
          <span className="pricing-label">CBSHUB</span>
          <h2>Operação fiscal completa</h2>
          <div className="pricing-value"><strong>{formatMoney(billingPlans.unico.priceCents)}</strong><small>/mês</small></div>
          <p>Um único plano para contadores independentes e escritórios, com toda a plataforma e capacidade ajustável.</p>
          <ul><li>30 empresas incluídas</li><li>Todos os módulos fiscais, relatórios e importações</li><li>Inteligência e laboratório fiscal sem IA paga</li><li>Equipe, papéis, revisão e entrega rastreável</li><li>Governança, cobertura nacional e apuração assistida</li></ul>

          <div className="capacity-selector" aria-label="Capacidade de empresas">
            <div>
              <span>CAPACIDADE CONTRATADA</span>
              <strong>{selectedCompanyLimit} empresas</strong>
              <small>{selectedAddonBlocks === 0 ? "30 incluídas no plano" : `30 incluídas + ${selectedAddonBlocks * BILLING_ADDON_COMPANY_BLOCK_SIZE} adicionais`}</small>
            </div>
            <div className="capacity-stepper">
              <button type="button" aria-label="Remover um bloco de empresas" onClick={() => setSelectedAddonBlocks((current) => Math.max(0, current - 1))} disabled={selectedAddonBlocks === 0 || Boolean(loadingPlan) || Boolean(authenticated && billing && !billing.canManageBilling)}>−</button>
              <b>{selectedAddonBlocks}</b>
              <button type="button" aria-label="Adicionar um bloco de empresas" onClick={() => setSelectedAddonBlocks((current) => Math.min(BILLING_MAX_ADDON_BLOCKS, current + 1))} disabled={selectedAddonBlocks === BILLING_MAX_ADDON_BLOCKS || Boolean(loadingPlan) || Boolean(authenticated && billing && !billing.canManageBilling)}>+</button>
            </div>
            <p>Cada bloco adiciona {BILLING_ADDON_COMPANY_BLOCK_SIZE} empresas por {formatMoney(BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS)}/mês.</p>
            <output>Total mensal: <strong>{formatMoney(selectedMonthlyAmount)}</strong></output>
          </div>
          {paidPlanActions()}
        </article>
      </div>

      <p className="pricing-safety"><span>✓</span> Cartão e Pix são processados pelo Mercado Pago. O CBSHub não recebe números de cartão nem armazena sua chave Pix.</p>
    </>
  );
}
