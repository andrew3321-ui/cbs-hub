export const fiscalIssuanceStatuses = [
  "awaiting_payment",
  "pending_data",
  "pending_issue",
  "issued",
  "canceled",
  "failed",
  "not_required",
] as const;

export type FiscalIssuanceStatus = (typeof fiscalIssuanceStatuses)[number];

export type FiscalIssuanceFacts = {
  status: string;
  customerType: string;
  customerTaxId?: string | null;
  noteRequested: boolean;
  serviceCode?: string | null;
  serviceDescription: string;
  nfseNumber?: string | null;
  verificationUrl?: string | null;
  pdfReference?: string | null;
  xmlReference?: string | null;
  failureReason?: string | null;
  cancelReason?: string | null;
};

export function fiscalDataComplete(input: Pick<FiscalIssuanceFacts, "customerType" | "customerTaxId" | "serviceCode" | "serviceDescription">) {
  const taxId = String(input.customerTaxId ?? "").replace(/\D/g, "");
  const taxIdValid = input.customerType === "individual" ? taxId.length === 11 : input.customerType === "legal_entity" ? taxId.length === 14 : false;
  return taxIdValid && Boolean(input.serviceCode?.trim()) && input.serviceDescription.trim().length >= 8;
}

export function maskFiscalTaxId(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length === 14) return `**.***.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  return "";
}

export function fiscalPendingReason(input: FiscalIssuanceFacts) {
  if (input.status === "awaiting_payment") return "Pagamento ainda não confirmado pelo provedor.";
  if (input.status === "failed") return input.failureReason?.trim() || "A última tentativa de emissão falhou e precisa ser revisada.";
  if (input.status === "canceled") return input.cancelReason?.trim() || "Documento fiscal cancelado; avalie substituição ou nova emissão.";
  if (input.status === "not_required") return "Dispensa registrada para pessoa física que não solicitou NFS-e.";
  if (input.status === "issued") {
    if (!input.verificationUrl) return "NFS-e registrada sem link oficial de verificação.";
    if (!input.pdfReference || !input.xmlReference) return "NFS-e emitida; PDF/XML ainda não possuem referência de arquivo no cofre documental.";
    return "Documento fiscal emitido e referenciado.";
  }
  if (input.status === "pending_issue") return "Dados completos; falta emitir no adaptador configurado e registrar o documento.";

  const missing: string[] = [];
  if (!["individual", "legal_entity"].includes(input.customerType)) missing.push("tipo do tomador");
  const taxId = String(input.customerTaxId ?? "").replace(/\D/g, "");
  if ((input.customerType === "individual" && taxId.length !== 11) || (input.customerType === "legal_entity" && taxId.length !== 14) || !taxId) missing.push("CPF/CNPJ válido");
  if (!input.serviceCode?.trim()) missing.push("código do serviço");
  if (input.serviceDescription.trim().length < 8) missing.push("descrição do serviço");
  return missing.length ? `Faltam ${missing.join(", ")}.` : "Dados fiscais aguardam classificação.";
}

export function normalizeDocumentReference(value: unknown, maximum = 500) {
  const normalized = typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maximum) : "";
  if (!normalized) return null;
  if (/^https:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      url.username = "";
      url.password = "";
      url.hash = "";
      return url.toString();
    } catch {
      return null;
    }
  }
  return /^[a-zA-Z0-9][a-zA-Z0-9/_\-.]{0,499}$/.test(normalized) ? normalized : null;
}

export function normalizeSha256(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

export type FiscalAdapterRequest = {
  issuanceId: number;
  requestKey: string;
  amountCents: number;
  competenceMonth: string;
};

export type FiscalAdapterResult =
  | { kind: "manual_required"; reason: string }
  | { kind: "submitted"; providerDocumentId: string }
  | { kind: "issued"; providerDocumentId: string; nfseNumber: string; verificationUrl: string }
  | { kind: "failed"; code: string; reason: string; retryable: boolean };

export type FiscalIssuanceAdapter = {
  code: string;
  automatic: boolean;
  submit(request: FiscalAdapterRequest): Promise<FiscalAdapterResult>;
};

export const manualFiscalIssuanceAdapter: FiscalIssuanceAdapter = {
  code: "manual",
  automatic: false,
  async submit() {
    return { kind: "manual_required", reason: "Emissão manual: use o emissor oficial e registre o resultado no CBSHub." };
  },
};

export function fiscalIssuanceAdapter(code: string): FiscalIssuanceAdapter | null {
  return code === "manual" ? manualFiscalIssuanceAdapter : null;
}
