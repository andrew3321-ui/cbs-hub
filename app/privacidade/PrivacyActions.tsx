"use client";

import { useState } from "react";

export default function PrivacyActions({ signedIn }: { signedIn: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function deleteAccount() {
    if (!confirmed || !password || !window.confirm("Esta ação exclui permanentemente sua conta e os dados vinculados permitidos. Deseja continuar?")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível excluir a conta.");
      window.location.assign("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir a conta.");
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) return <div className="privacy-login-note"><b>Direitos dentro da conta</b><p>Entre na plataforma para baixar seus dados ou solicitar a exclusão da conta.</p><a href="/entrar?returnTo=%2Fprivacidade">Entrar com segurança →</a></div>;

  return <div className="privacy-actions">
    <article><span>ACESSO E PORTABILIDADE</span><h3>Baixar meus dados</h3><p>Gera uma cópia JSON com conta, empresas, cenários, aprovações, auditoria e registros financeiros, sem senhas, sessões ou payloads brutos do provedor.</p><a className="primary-button" href="/api/account?download=1">Baixar cópia dos dados</a></article>
    <article className="danger"><span>EXCLUSÃO</span><h3>Excluir minha conta</h3><p>A senha é exigida novamente. Escritórios com outros membros ou revisões pendentes precisam resolver essas responsabilidades antes da exclusão.</p><label>Confirme sua senha<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="privacy-delete-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Entendo que a exclusão é permanente.</span></label><button type="button" disabled={busy || !confirmed || !password} onClick={() => void deleteAccount()}>{busy ? "Excluindo…" : "Excluir permanentemente"}</button>{message && <small role="alert">{message}</small>}</article>
  </div>;
}
