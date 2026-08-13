import type { Metadata } from "next";
import ClientClosingDecision from "./ClientClosingDecision";

export const metadata: Metadata = { title: "Entrega mensal | CBSHub", robots: { index: false, follow: false } };

export default async function ClosingDeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ClientClosingDecision token={token} />;
}
