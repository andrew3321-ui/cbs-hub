"use client";

import Link from "next/link";

export default function SeoTrackedCta({ href, campaign, className, children }: { href: string; campaign: string; className?: string; children: React.ReactNode }) {
  function track() {
    const payload = JSON.stringify({ eventType: "seo_cta", pathname: window.location.pathname, source: "google", medium: "organic", campaign, reason: campaign });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics/collect", new Blob([payload], { type: "application/json" }));
    else void fetch("/api/analytics/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
  }
  return <Link href={href} className={className} onClick={track}>{children}</Link>;
}
