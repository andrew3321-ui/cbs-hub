"use client";

import Link from "next/link";

export default function LandingTrackedCta({
  href,
  campaign,
  className,
  children,
}: {
  href: string;
  campaign: string;
  className?: string;
  children: React.ReactNode;
}) {
  function track() {
    const url = new URL(window.location.href);
    let referrerHost = "";
    try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch { referrerHost = ""; }
    const payload = JSON.stringify({
      eventType: "seo_cta",
      pathname: url.pathname,
      source: url.searchParams.get("utm_source") ?? "",
      medium: url.searchParams.get("utm_medium") ?? "",
      campaign,
      referrerHost,
      reason: campaign,
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics/collect", new Blob([payload], { type: "application/json" }));
    else void fetch("/api/analytics/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
  }

  return <Link href={href} className={className} onClick={track}>{children}</Link>;
}
