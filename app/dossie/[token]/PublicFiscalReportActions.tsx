"use client";

import Link from "next/link";

export default function PublicFiscalReportActions() {
  return <div className="public-report-actions">
    <Link href="/">Conhecer o Margem Clara</Link>
    <button type="button" onClick={() => window.print()}>Imprimir / salvar PDF</button>
  </div>;
}
