export const ORGANIC_AUTHORITY_VERSION = "organic-authority-v1.0.0";

export const citableAssets = [
  { title: "Central técnica tributária", description: "Guias versionados com fonte oficial, vigência, limites e trilha operacional.", href: "/conteudos", category: "guias" },
  { title: "Indicador público de cobertura", description: "Matriz transparente do que está suportado, parcial ou ainda não suportado.", href: "/cobertura", category: "indicador" },
  { title: "Metodologia determinística", description: "Como fatos, regras, fontes e memória de cálculo são separados e auditados.", href: "/metodologia", category: "metodologia" },
  { title: "Calculadora da Reforma Tributária", description: "Referência pública para estruturar premissas de CBS e IBS sem ocultar limites.", href: "/calculadora-reforma-tributaria", category: "ferramenta" },
  { title: "Relatórios fiscais rastreáveis", description: "Modelo de dossiê com autoria, fontes, versão e pendências explícitas.", href: "/relatorios-fiscais-rastreaveis", category: "relatorio" },
] as const;

export const outreachTargets = [
  { name: "Conselho Federal de Contabilidade", domain: "cfc.org.br", category: "entidade profissional", rationale: "Conteúdo institucional e técnico de interesse da profissão contábil." },
  { name: "FENACON", domain: "fenacon.org.br", category: "entidade empresarial", rationale: "Público de empresas contábeis e serviços profissionais." },
  { name: "SESCON-SP", domain: "sescon.org.br", category: "entidade regional", rationale: "Comunidade de escritórios e empresas de serviços contábeis." },
  { name: "CRCSP", domain: "crcsp.org.br", category: "conselho regional", rationale: "Formação e atualização de profissionais da contabilidade." },
  { name: "IBPT", domain: "ibpt.org.br", category: "instituto tributário", rationale: "Pesquisa e educação tributária alinhadas ao recorte do produto." },
  { name: "Portal Contábeis", domain: "contabeis.com.br", category: "imprensa especializada", rationale: "Distribuição editorial para público contábil e tributário." },
] as const;

export const allowedAcquisitionMethods = ["editorial", "citation", "press", "partnership", "relevant_directory", "professional_community"] as const;
export type OrganicAcquisitionMethod = typeof allowedAcquisitionMethods[number];

export const organicAuthorityPolicy = {
  prohibited: ["compra de links", "troca massiva de links", "diretórios sem relevância", "comentários automatizados", "texto-âncora enganoso", "redes privadas de links"],
  requiredEvidence: ["URL pública verificável", "contexto editorial", "página de destino", "data de conferência", "método legítimo de aquisição"],
  monthlyRoutine: ["revisar ativos citáveis", "selecionar contatos relevantes", "registrar abordagem útil e individual", "conferir menções conquistadas", "validar links e tráfego de referência", "remover registros perdidos ou inadequados"],
} as const;

export function buildTrackedShareUrl(path: string, campaign: string, content: string) {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const params = new URLSearchParams({ utm_source: "organic_outreach", utm_medium: "referral", utm_campaign: campaign, utm_content: content });
  return `https://cbshub.com.br${safePath}?${params.toString()}`;
}

export function normalizeExternalUrl(value: unknown) {
  try {
    const url = new URL(String(value ?? "").trim());
    if (url.protocol !== "https:" || ["cbshub.com.br", "www.cbshub.com.br"].includes(url.hostname.toLowerCase())) return null;
    return url.toString().slice(0, 500);
  } catch { return null; }
}

export function normalizeTargetPath(value: unknown) {
  const path = String(value ?? "").trim().split(/[?#]/)[0];
  return /^\/[a-z0-9/_-]{0,180}$/i.test(path) ? path : null;
}
