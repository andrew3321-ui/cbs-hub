"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BrandMark from "../BrandMark";

type AuthMode = "login" | "register" | "recover";

const content = {
  login: { eyebrow: "BEM-VINDO DE VOLTA", title: "Entre no seu escritório", subtitle: "Continue o trabalho técnico e acompanhe cada cliente da carteira." },
  register: { eyebrow: "DOIS CAMPOS · ACESSO IMEDIATO", title: "Comece pelo seu primeiro caso real", subtitle: "Escolha seu usuário e sua senha. Você entra com 5 dias de acesso completo, sem cartão e sem informar e-mail agora." },
  recover: { eyebrow: "RECUPERAÇÃO SEGURA", title: "Defina uma nova senha", subtitle: "Use seu usuário e a chave de segurança entregue quando sua conta foi criada." },
};

type TrialResult = {
  granted: boolean;
  days: number;
  companyLimit: number;
  endsAt: string | null;
  reason: string | null;
};

const TRIAL_DEVICE_STORAGE_KEY = "mc_trial_device_v1";

function safeClientReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  try {
    const url = new URL(value, "https://cbshub.local");
    return url.origin === "https://cbshub.local" ? `${url.pathname}${url.search}${url.hash}` : "/app";
  } catch {
    return "/app";
  }
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function trialDeviceEvidence() {
  let trialDeviceId = "";
  try {
    trialDeviceId = window.localStorage.getItem(TRIAL_DEVICE_STORAGE_KEY) ?? "";
  } catch {
    // The protected server cookie and technical fingerprint remain available.
  }
  if (!/^[0-9a-f-]{36,64}$/i.test(trialDeviceId)) {
    trialDeviceId = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    try {
      window.localStorage.setItem(TRIAL_DEVICE_STORAGE_KEY, trialDeviceId);
    } catch {
      // Registration can continue; the server also persists an HttpOnly marker.
    }
  }
  const deviceMemory = "deviceMemory" in navigator ? String((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? "") : "";
  const fingerprintMaterial = [
    navigator.userAgent,
    navigator.platform,
    navigator.language,
    navigator.languages.join(","),
    navigator.hardwareConcurrency,
    deviceMemory,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen.width,
    screen.height,
    screen.colorDepth,
    navigator.maxTouchPoints,
  ].join("|");
  return { trialDeviceId, trialDeviceFingerprint: await sha256Hex(fingerprintMaterial) };
}

function trackSignupEvent(eventType: "signup_start" | "signup_submit" | "signup_client_error", reason = "") {
  const url = new URL(window.location.href);
  let referrerHost = "";
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch { referrerHost = ""; }
  const body = JSON.stringify({
    eventType,
    pathname: "/cadastro",
    reason,
    source: url.searchParams.get("utm_source") ?? "",
    medium: url.searchParams.get("utm_medium") ?? "",
    campaign: url.searchParams.get("utm_campaign") ?? "",
    referrerHost,
  });
  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/analytics/collect", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/analytics/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [issuedRecoveryKey, setIssuedRecoveryKey] = useState("");
  const [issuedTrial, setIssuedTrial] = useState<TrialResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [issuedIdentity, setIssuedIdentity] = useState<{ username: string; accountCode: string } | null>(null);
  const [returnTo, setReturnTo] = useState("/app");
  const [inviteToken, setInviteToken] = useState("");
  const [inviteInfo, setInviteInfo] = useState<{ workspaceName: string; email: string; role: string } | null>(null);
  const copy = content[mode];
  const signupStarted = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setResetComplete(mode === "login" && new URLSearchParams(window.location.search).get("senha") === "alterada"), 0);
    return () => window.clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReturnTo(safeClientReturnPath(new URLSearchParams(window.location.search).get("returnTo")));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mode !== "register") return;
    const token = new URLSearchParams(window.location.search).get("convite")?.toLowerCase() ?? "";
    if (!/^[0-9a-f]{48}$/.test(token)) {
      const suffix = bytesToHex(crypto.getRandomValues(new Uint8Array(2)));
      const defaultUsername = `profissional-${suffix}`;
      const timer = window.setTimeout(() => setUsername((current) => current || defaultUsername), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setInviteToken(token);
      fetch(`/api/office/invitations/${token}`)
        .then(async (response) => {
          const data = (await response.json()) as { invitation?: { workspaceName: string; email: string; role: string }; error?: string };
          if (!response.ok || !data.invitation) throw new Error(data.error || "Convite inválido.");
          return data.invitation;
        })
        .then((invitation) => {
          setInviteInfo(invitation);
          setEmail(invitation.email);
        })
        .catch((caught) => setError(caught instanceof Error ? caught.message : "Não foi possível validar o convite."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-zà-ÿ]/.test(password) && /[A-ZÀ-ß]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-ZÀ-ÿ\d]/.test(password)) score += 1;
    return score;
  }, [password]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "register") trackSignupEvent("signup_submit", "button_click");
    if (mode === "recover" && password !== confirmPassword) {
      if (mode === "register") trackSignupEvent("signup_client_error", "password_mismatch");
      setError("As senhas não coincidem.");
      return;
    }
    if (mode !== "login" && (password.length < 12 || !/[a-zà-ÿ]/i.test(password) || !/\d/.test(password))) {
      if (mode === "register") trackSignupEvent("signup_client_error", "weak_password");
      setError("Use pelo menos 12 caracteres, incluindo letra e número.");
      return;
    }
    setLoading(true);
    let apiResponded = false;
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : mode === "register" ? "/api/auth/register" : "/api/auth/reset-password";
      const trialEvidence = mode === "register" && !inviteToken ? await trialDeviceEvidence() : {};
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, username, login: email, password, recoveryKey, inviteToken, ...trialEvidence }) });
      apiResponded = true;
      const data = (await response.json()) as { error?: string; code?: string; recoveryKey?: string; trial?: TrialResult; user?: { username: string; accountCode: string } };
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir.");
      if (mode === "register" && data.recoveryKey) {
        setIssuedRecoveryKey(data.recoveryKey);
        setIssuedTrial(data.trial ?? null);
        setIssuedIdentity(data.user ?? null);
        return;
      }
      if (mode === "recover") {
        window.location.assign("/entrar?senha=alterada");
        return;
      }
      window.location.assign(returnTo);
    } catch (caught) {
      if (mode === "register" && !apiResponded) trackSignupEvent("signup_client_error", "before_api_response");
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir.");
    } finally {
      setLoading(false);
    }
  }

  async function copyRecoveryKey() {
    await navigator.clipboard.writeText(issuedRecoveryKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  if (issuedRecoveryKey) {
    return (
      <main className="auth-shell">
        <Link className="auth-brand" href="/"><BrandMark /><span className="cbs-wordmark"><strong>CBS</strong>Hub</span></Link>
        <section className="auth-success-card">
          <span className="auth-success-icon">✓</span>
          <p className="auth-eyebrow">CONTA CRIADA COM SUCESSO</p>
          <h1>Seu acesso está liberado</h1>
          <p>Guarde sua chave de recuperação. Como não pedimos e-mail no cadastro, ela permite redefinir sua senha com segurança.</p>
          {issuedIdentity && <div className="auth-issued-identity"><span>SEU ACESSO</span><b>@{issuedIdentity.username}</b><small>Identificador da conta: {issuedIdentity.accountCode}</small></div>}
          <div className="recovery-key-box"><span>{issuedRecoveryKey}</span><button type="button" onClick={copyRecoveryKey}>{copied ? "Copiada ✓" : "Copiar chave"}</button></div>
          <div className="recovery-warning"><b>Importante</b><span>Salve em um gerenciador de senhas ou local seguro. Não compartilhe esta chave.</span></div>
          <div className="auth-plan-suggestion">
            <span>{issuedTrial?.granted ? "TESTE PROFISSIONAL ATIVADO" : "ACESSO BÁSICO ATIVADO"}</span>
            <b>{issuedTrial?.granted ? `${issuedTrial.days} dias · até ${issuedTrial.companyLimit} empresas` : "CBSHub"}</b>
            <small>{issuedTrial?.granted && issuedTrial.endsAt
              ? `Todos os recursos estão liberados até ${new Date(issuedTrial.endsAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Nenhuma cobrança é iniciada automaticamente.`
              : issuedTrial?.reason === "workspace_inherited"
                ? "Seu acesso acompanha as regras e o período do escritório para o qual você foi convidado."
                : "Este aparelho já utilizou o período de teste ou não pôde ser validado. Nenhuma cobrança foi iniciada."}</small>
          </div>
          <a className="auth-primary-link" href={returnTo}>Entrar e analisar meu primeiro caso <span>→</span></a>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <Link className="auth-brand" href="/"><BrandMark /><span className="cbs-wordmark"><strong>CBS</strong>Hub</span></Link>
      <section className="auth-layout">
        <div className={`auth-story ${mode === "register" ? "auth-story-showcase-mode" : ""}`}>
          <span className="auth-story-label">COMECE SEM PREPARAR A CONTA</span>
          <h2>Troque o retrabalho pelo primeiro fluxo rastreável.</h2>
          <p>Entre direto, use um caso real e veja pesquisa, cálculo, fontes, memória e relatório trabalhando juntos.</p>
          {mode === "register" && <div className="auth-showcase" aria-label="Prévia real da plataforma CBSHub">
            <div className="auth-showcase-heading">
              <span><i /> VISÃO REAL DA PLATAFORMA</span>
              <small>Fluxo completo</small>
            </div>
            <div className="auth-showcase-media">
              <video muted loop playsInline controls preload="none" poster="/media/cbshub-overview-completo-v2-poster.jpg">
                <source src="/media/cbshub-overview-completo-v2.webm" type="video/webm" />
              </video>
              <span>Da operação ao dossiê revisável</span>
            </div>
          </div>}
          <div className="auth-story-points"><span><i>✓</i> 5 dias com todos os recursos</span><span><i>✓</i> Até 10 empresas para testar o fluxo</span><span><i>✓</i> Sem cartão e sem cobrança automática</span></div>
          {mode !== "register" && <div className="auth-mini-panel"><span>EXPOSIÇÃO ESTIMADA</span><strong>+ R$ 13.665</strong><small>Reajuste recomendado <b>5,6%</b></small><i><em style={{height:"34%"}} /><em style={{height:"48%"}} /><em style={{height:"42%"}} /><em style={{height:"68%"}} /><em style={{height:"88%"}} /></i></div>}
        </div>

        <div className="auth-card">
          <p className="auth-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="auth-subtitle">{copy.subtitle}</p>
          {resetComplete && <div className="auth-success-message">Senha alterada. Entre com a nova senha.</div>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <form onSubmit={submit} onChange={() => {
            if (mode !== "register" || signupStarted.current) return;
            signupStarted.current = true;
            trackSignupEvent("signup_start", "first_field_change");
          }} onInvalid={(event) => {
            if (mode !== "register") return;
            const field = event.target as HTMLInputElement;
            trackSignupEvent("signup_client_error", `invalid_${field.name || "field"}`);
          }}>
            {mode === "register" && (inviteInfo ? <>
              <div className="auth-invite-banner"><span>CONVITE PARA EQUIPE</span><b>{inviteInfo.workspaceName}</b><small>Você entrará como {inviteInfo.role === "reviewer" ? "revisor" : inviteInfo.role === "preparer" ? "preparador" : "administrador"}.</small></div>
              <label>Seu nome<input name="name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do profissional" /></label>
            </> : <>
              <div className="auth-username-note"><i>✓</i><span><b>Já reservamos uma sugestão para você.</b><small>Pode mudar o usuário agora ou depois em Minha conta.</small></span></div>
              <label>Nome de usuário<input name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9._-]{3,24}" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} /></label>
            </>)}
            {(mode !== "register" || inviteInfo) && <label>{mode === "register" ? "E-mail convidado" : "Usuário ou e-mail"}<input name="email" type={mode === "register" ? "email" : "text"} autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} readOnly={Boolean(inviteInfo)} placeholder={mode === "register" ? "voce@empresa.com.br" : "seu.usuario"} /></label>}
            {mode === "recover" && <label>Chave de recuperação<input className="recovery-input" autoComplete="off" required value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" /></label>}
            <label>{mode === "recover" ? "Nova senha" : "Senha"}<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 8 : 12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "login" ? "Sua senha" : "Mínimo de 12 caracteres"} /><button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Ocultar" : "Mostrar"}</button></span></label>
            {mode !== "login" && <div className="password-strength" aria-label={`Força da senha: ${passwordScore} de 4`}>{[1,2,3,4].map((item) => <i className={passwordScore >= item ? `active score-${passwordScore}` : ""} key={item} />)}<span>{passwordScore < 2 ? "Use 12 caracteres com letra e número" : passwordScore < 4 ? "Senha adequada" : "Senha forte"}</span></div>}
            {mode === "recover" && <label>Confirmar senha<input name="confirm_password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Digite novamente" /></label>}
            {mode === "login" && <div className="auth-form-options"><label><input type="checkbox" defaultChecked /> Manter conectado</label><a href="/recuperar-senha">Esqueci minha senha</a></div>}
            <button className="auth-submit" disabled={loading}>{loading ? "Liberando seu acesso…" : mode === "login" ? "Entrar no escritório" : mode === "register" ? inviteInfo ? "Entrar na equipe" : "Começar meus 5 dias" : "Redefinir senha"}<span>→</span></button>
          </form>
          {mode === "register" && !inviteInfo && <div className="auth-fast-proof"><span>Sem cartão</span><span>E-mail só se contratar</span><span>Acesso imediato</span></div>}
          {mode === "register" && !inviteInfo && <p className="auth-trial-disclosure">O teste é concedido uma vez por aparelho. Para prevenir abuso, o sistema guarda somente identificadores técnicos pseudonimizados; não armazena as características brutas do dispositivo.</p>}
          <p className="auth-switch">{mode === "login" ? <>Ainda não tem acesso? <a href="/cadastro">Criar conta gratuita</a></> : mode === "register" ? <>Já tem uma conta? <a href="/entrar">Entrar</a></> : <>Lembrou sua senha? <a href="/entrar">Voltar ao login</a></>}</p>
          <p className="auth-legal">Ao continuar, você concorda com o uso seguro dos dados exclusivamente para operar sua conta.</p>
        </div>
      </section>
    </main>
  );
}
