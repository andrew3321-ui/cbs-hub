"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AuthMode = "login" | "register" | "recover";

const content = {
  login: { eyebrow: "BEM-VINDO DE VOLTA", title: "Entre no seu painel", subtitle: "Continue suas análises e acompanhe a margem de cada empresa." },
  register: { eyebrow: "COMECE GRATUITAMENTE", title: "Crie seu acesso", subtitle: "Uma conta independente para manter sua carteira segura e organizada." },
  recover: { eyebrow: "RECUPERAÇÃO SEGURA", title: "Defina uma nova senha", subtitle: "Use a chave de segurança entregue quando sua conta foi criada." },
};

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [issuedRecoveryKey, setIssuedRecoveryKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const copy = content[mode];

  useEffect(() => {
    setResetComplete(mode === "login" && new URLSearchParams(window.location.search).get("senha") === "alterada");
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
    if (mode !== "login" && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : mode === "register" ? "/api/auth/register" : "/api/auth/reset-password";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, recoveryKey }) });
      const data = (await response.json()) as { error?: string; recoveryKey?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir.");
      if (mode === "register" && data.recoveryKey) {
        setIssuedRecoveryKey(data.recoveryKey);
        return;
      }
      if (mode === "recover") {
        window.location.assign("/entrar?senha=alterada");
        return;
      }
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      window.location.assign(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/app");
    } catch (caught) {
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
        <a className="auth-brand" href="/"><span>mc</span>margem<b>clara</b></a>
        <section className="auth-success-card">
          <span className="auth-success-icon">✓</span>
          <p className="auth-eyebrow">CONTA CRIADA COM SUCESSO</p>
          <h1>Guarde sua chave de recuperação</h1>
          <p>Esta chave substitui o envio por e-mail nesta fase gratuita. Ela será exibida apenas agora e permite redefinir sua senha.</p>
          <div className="recovery-key-box"><span>{issuedRecoveryKey}</span><button type="button" onClick={copyRecoveryKey}>{copied ? "Copiada ✓" : "Copiar chave"}</button></div>
          <div className="recovery-warning"><b>Importante</b><span>Salve em um gerenciador de senhas ou local seguro. Não compartilhe esta chave.</span></div>
          <a className="auth-primary-link" href="/app">Guardei a chave · entrar no painel <span>→</span></a>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <a className="auth-brand" href="/"><span>mc</span>margem<b>clara</b></a>
      <section className="auth-layout">
        <div className="auth-story">
          <span className="auth-story-label">DECISÕES FISCAIS. MARGENS PROTEGIDAS.</span>
          <h2>Seu espaço para transformar imposto em decisão.</h2>
          <p>Uma conta segura, uma carteira organizada e cenários que pertencem somente a você.</p>
          <div className="auth-story-points"><span><i>✓</i> Dados separados por usuário</span><span><i>✓</i> Senha protegida por criptografia forte</span><span><i>✓</i> Sessão privada por 30 dias</span></div>
          <div className="auth-mini-panel"><span>EXPOSIÇÃO ESTIMADA</span><strong>+ R$ 13.665</strong><small>Reajuste recomendado <b>5,6%</b></small><i><em style={{height:"34%"}} /><em style={{height:"48%"}} /><em style={{height:"42%"}} /><em style={{height:"68%"}} /><em style={{height:"88%"}} /></i></div>
        </div>

        <div className="auth-card">
          <p className="auth-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="auth-subtitle">{copy.subtitle}</p>
          {resetComplete && <div className="auth-success-message">Senha alterada. Entre com a nova senha.</div>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <form onSubmit={submit}>
            {mode === "register" && <label>Nome completo<input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos chamar você?" /></label>}
            <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com.br" /></label>
            {mode === "recover" && <label>Chave de recuperação<input className="recovery-input" autoComplete="off" required value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" /></label>}
            <label>{mode === "recover" ? "Nova senha" : "Senha"}<span className="password-field"><input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" /><button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Ocultar" : "Mostrar"}</button></span></label>
            {mode !== "login" && <><div className="password-strength" aria-label={`Força da senha: ${passwordScore} de 4`}>{[1,2,3,4].map((item) => <i className={passwordScore >= item ? `active score-${passwordScore}` : ""} key={item} />)}<span>{passwordScore < 2 ? "Senha fraca" : passwordScore < 4 ? "Senha adequada" : "Senha forte"}</span></div><label>Confirmar senha<input type={showPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Digite novamente" /></label></>}
            {mode === "login" && <div className="auth-form-options"><label><input type="checkbox" defaultChecked /> Manter conectado</label><a href="/recuperar-senha">Esqueci minha senha</a></div>}
            <button className="auth-submit" disabled={loading || (mode !== "login" && passwordScore < 2)}>{loading ? "Protegendo seu acesso…" : mode === "login" ? "Entrar no painel" : mode === "register" ? "Criar minha conta" : "Redefinir senha"}<span>→</span></button>
          </form>
          <p className="auth-switch">{mode === "login" ? <>Ainda não tem acesso? <a href="/cadastro">Criar conta gratuita</a></> : mode === "register" ? <>Já tem uma conta? <a href="/entrar">Entrar</a></> : <>Lembrou sua senha? <a href="/entrar">Voltar ao login</a></>}</p>
          <p className="auth-legal">Ao continuar, você concorda com o uso seguro dos dados exclusivamente para operar sua conta.</p>
        </div>
      </section>
    </main>
  );
}
