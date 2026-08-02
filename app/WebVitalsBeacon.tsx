"use client";

import { useEffect } from "react";
import type { Metric } from "web-vitals";

const publicRoute = /^(?:\/$|\/planos$|\/metodologia$|\/cobertura$|\/privacidade$|\/termos$|\/responsavel$|\/calculadora-reforma-tributaria$|\/cbs-ibs-contadores$|\/icms-st-contadores$|\/inteligencia-tributaria-escritorios$|\/relatorios-fiscais-rastreaveis$|\/conteudos(?:\/[^/]+)?$)/;

export default function WebVitalsBeacon() {
  useEffect(() => {
    if (!publicRoute.test(window.location.pathname)) return;
    const report = (metric: Metric) => {
      const payload = JSON.stringify({
        eventType: "web_vital",
        pathname: window.location.pathname,
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
        deviceClass: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
      });
      if (!navigator.sendBeacon?.("/api/analytics/collect", new Blob([payload], { type: "application/json" }))) {
        void fetch("/api/analytics/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
      }
    };
    const start = () => void import("web-vitals").then(({ onCLS, onINP, onLCP }) => {
      onCLS(report);
      onINP(report);
      onLCP(report);
    });
    const idle = window.requestIdleCallback?.(start, { timeout: 2_000 });
    if (idle) return () => window.cancelIdleCallback?.(idle);
    const timer = window.setTimeout(start, 1_000);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
