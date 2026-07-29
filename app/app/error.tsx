"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "render",
        message: error.message,
        component: error.digest ? `server-digest:${error.digest}` : "app-route",
        route: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <main className="app-recovery-screen" role="alert">
      <div>
        <span>FALHA ISOLADA</span>
        <h1>Não foi possível abrir esta área.</h1>
        <p>A ocorrência foi registrada. Tente novamente sem perder o restante da sessão.</p>
        <button type="button" onClick={reset}>Tentar novamente</button>
        <a href="/app">Voltar à visão geral</a>
      </div>
    </main>
  );
}
