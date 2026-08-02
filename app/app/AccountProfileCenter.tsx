"use client";

import { FormEvent, useState } from "react";

type ProfileUser = {
  displayName: string;
  firstName: string | null;
  username: string;
  accountCode: string;
  contactEmail: string;
};

export default function AccountProfileCenter({ user }: { user: ProfileUser }) {
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.contactEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, username, email, password }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar seus dados.");
      setPassword("");
      setMessage("Dados salvos. Seu acesso foi atualizado com segurança.");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar seus dados.");
    } finally {
      setBusy(false);
    }
  }

  const billingReady = firstName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return <div className="page-content account-profile-page">
    <div className="page-heading"><div><p className="kicker">MINHA CONTA</p><h1>Seu acesso, do seu jeito</h1><p>Durante o teste, apenas usuário e senha são necessários. Complete nome e e-mail quando quiser contratar ou receber comunicações da conta.</p></div><span className={`account-profile-status ${billingReady ? "ready" : "pending"}`}><small>DADOS PARA CONTRATAÇÃO</small><b>{billingReady ? "Completos" : "Pendentes"}</b><em>{billingReady ? "pronto para contratar" : "o teste continua normalmente"}</em></span></div>

    <section className="account-identity-card panel">
      <div><span>IDENTIFICADOR CBSHUB</span><strong>{user.accountCode}</strong><small>Este código identifica sua conta sem expor dados pessoais.</small></div>
      <div><span>ACESSO ATUAL</span><strong>@{user.username}</strong><small>Use este usuário para entrar mesmo sem cadastrar e-mail.</small></div>
    </section>

    <div className="account-profile-layout">
      <form className="panel account-profile-form" onSubmit={save}>
        <div className="panel-heading"><div><span className="eyebrow">PERFIL E CONTATO</span><h3>Atualizar meus dados</h3></div></div>
        <label>Nome de usuário<input required minLength={3} maxLength={24} pattern="[a-zA-Z0-9._-]{3,24}" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} /></label>
        <div className="account-profile-optional"><span>OPCIONAL DURANTE O TESTE</span><p>Primeiro nome e e-mail serão exigidos somente antes do primeiro pagamento.</p></div>
        <label>Primeiro nome<input minLength={2} maxLength={60} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Como devemos chamar você?" /></label>
        <label>E-mail de contato<input type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com.br" /></label>
        <label>Senha atual<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Confirme sua identidade" /></label>
        {error && <div className="account-profile-message error" role="alert">{error}</div>}
        {message && <div className="account-profile-message success" role="status">{message}</div>}
        <button className="primary-button" disabled={busy || !password || username.length < 3}>{busy ? "Salvando…" : "Salvar alterações"}</button>
      </form>

      <aside className="panel account-profile-help">
        <span>COMO FUNCIONA</span><h3>Menos dados para começar. Contexto completo para contratar.</h3>
        <ol><li><i>01</i><p><b>Teste sem e-mail</b><small>Entre com usuário e senha e use todos os recursos liberados.</small></p></li><li><i>02</i><p><b>Complete quando fizer sentido</b><small>Cadastre primeiro nome e e-mail nesta área a qualquer momento.</small></p></li><li><i>03</i><p><b>Contrate com identificação</b><small>Antes do pagamento, confirmamos os dados necessários para cobrança e emissão fiscal.</small></p></li></ol>
        <a href="/privacidade">Privacidade e controle dos dados →</a>
      </aside>
    </div>
  </div>;
}
