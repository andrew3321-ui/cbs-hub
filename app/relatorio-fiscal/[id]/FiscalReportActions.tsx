"use client";

import Link from "next/link";

export default function FiscalReportActions() {
  return <div className="public-report-actions">
    <Link href="/app">Voltar ao sistema</Link>
    <button type="button" onClick={() => window.print()}>Imprimir / salvar PDF</button>
  </div>;
}
