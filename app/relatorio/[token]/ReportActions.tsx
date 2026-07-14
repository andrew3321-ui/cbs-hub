"use client";

import { useState } from "react";

export default function ReportActions() {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <div className="public-report-actions"><button type="button" onClick={copyLink}>{copied ? "Link copiado ✓" : "Copiar link"}</button><button type="button" onClick={() => window.print()}>Imprimir / PDF</button></div>;
}
