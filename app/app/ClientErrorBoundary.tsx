"use client";

import { Component, type ErrorInfo, type ReactNode, useEffect } from "react";

type ClientErrorPayload = {
  kind: "render" | "window_error" | "unhandled_rejection";
  message: string;
  component?: string;
  route: string;
};

function reportClientError(payload: ClientErrorPayload) {
  const body = JSON.stringify(payload);
  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/client-errors", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

function BrowserErrorMonitor() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportClientError({
      kind: "window_error",
      message: event.message || "Erro não identificado no navegador.",
      route: window.location.pathname,
    });
    const onRejection = (event: PromiseRejectionEvent) => reportClientError({
      kind: "unhandled_rejection",
      message: event.reason instanceof Error ? event.reason.message : "Promise rejeitada sem tratamento.",
      route: window.location.pathname,
    });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}

export default class ClientErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError({
      kind: "render",
      message: error.message,
      component: info.componentStack?.slice(0, 1000),
      route: window.location.pathname,
    });
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-recovery-screen" role="alert">
          <div>
            <span>RECUPERAÇÃO SEGURA</span>
            <h1>Esta tela não pôde ser concluída.</h1>
            <p>O erro foi registrado com a versão em execução. Recarregue a área de trabalho; seus dados salvos não serão alterados.</p>
            <button type="button" onClick={() => window.location.reload()}>Recarregar plataforma</button>
            <a href="/app">Voltar ao início</a>
          </div>
        </main>
      );
    }
    return <><BrowserErrorMonitor />{this.props.children}</>;
  }
}
