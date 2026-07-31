"use client";

import { useEffect } from "react";

export default function AnalyticsBeacon() {
  useEffect(() => {
    const url = new URL(window.location.href);
    let referrerHost = "";
    try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch { referrerHost = ""; }
    const payload = {
      eventType: url.pathname.startsWith("/app") ? "app_active" : "page_view",
      pathname: url.pathname,
      source: url.searchParams.get("utm_source") ?? "",
      medium: url.searchParams.get("utm_medium") ?? "",
      campaign: url.searchParams.get("utm_campaign") ?? "",
      referrerHost,
    };
    void fetch("/api/analytics/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => undefined);
  }, []);
  return null;
}
