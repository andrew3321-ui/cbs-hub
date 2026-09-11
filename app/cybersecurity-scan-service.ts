import {
  calculateCyberPosture,
  containsDnsPolicy,
  CYBERSECURITY_PREVIEW_VERSION,
  isPrivateOrReservedAddress,
  normalizePublicDomain,
  publicScanLimitation,
  type CyberCheck,
} from "../domain/cybersecurity-preview.ts";

type DnsAnswer = { name?: string; type?: number; data?: string };
type DnsResponse = { Status?: number; Answer?: DnsAnswer[] };

const DNS_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const FETCH_TIMEOUT_MS = 7_000;

async function dnsQuery(name: string, type: "A" | "AAAA" | "MX" | "TXT") {
  const url = new URL(DNS_ENDPOINT);
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);
  const response = await fetch(url, {
    headers: { Accept: "application/dns-json", "User-Agent": "CBSHub-Security-Agent/1.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`DNS_${response.status}`);
  const payload = await response.json() as DnsResponse;
  return (payload.Answer ?? []).filter((answer) => typeof answer.data === "string");
}

function textRecords(answers: DnsAnswer[]) {
  return answers.map((answer) => String(answer.data ?? "").replace(/"\s+"/g, "").replace(/^"|"$/g, ""));
}

export async function dnsTxtRecords(name: string) {
  return textRecords(await dnsQuery(name, "TXT"));
}

function relatedHostname(candidate: string, original: string) {
  const withoutWww = (value: string) => value.replace(/^www\./, "");
  return withoutWww(candidate) === withoutWww(original);
}

async function publicAddresses(domain: string) {
  const [ipv4, ipv6] = await Promise.allSettled([dnsQuery(domain, "A"), dnsQuery(domain, "AAAA")]);
  const addresses = [ipv4, ipv6]
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .filter((answer) => answer.type === 1 || answer.type === 28)
    .map((answer) => String(answer.data));
  if (!addresses.length) throw new Error("DOMAIN_NOT_RESOLVED");
  if (addresses.some(isPrivateOrReservedAddress)) throw new Error("NON_PUBLIC_ADDRESS");
  return addresses;
}

async function fetchWebsite(domain: string) {
  let url = new URL(`https://${domain}/`);
  for (let redirect = 0; redirect <= 2; redirect += 1) {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "CBSHub-Security-Agent/1.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) return { response, finalUrl: url };
      const next = new URL(location, url);
      if (next.protocol !== "https:" || !relatedHostname(next.hostname, domain)) throw new Error("UNSAFE_REDIRECT");
      await publicAddresses(next.hostname);
      url = next;
      continue;
    }
    await response.body?.cancel();
    return { response, finalUrl: url };
  }
  throw new Error("TOO_MANY_REDIRECTS");
}

export function websiteChecksFromResponse(response: Response, finalUrl: URL): CyberCheck[] {
  if (response.status >= 500) {
    const detail = `O endpoint HTTPS respondeu com código HTTP ${response.status}. A inspeção dos controles foi considerada inconclusiva para evitar falsos positivos durante uma indisponibilidade.`;
    return [
      { code: "https", category: "website", title: "Disponibilidade HTTPS inconclusiva", status: "unavailable", detail, action: "Repita a verificação após estabilizar a hospedagem ou a conexão com o servidor de origem.", weight: 18 },
      ...([[
        "hsts", "Proteção HSTS", 10,
      ], [
        "csp", "Política de conteúdo", 12,
      ], [
        "browser-headers", "Cabeçalhos do navegador", 8,
      ]] as const).map(([code, title, weight]) => ({
        code,
        category: "website" as const,
        title,
        status: "unavailable" as const,
        detail: `Controle não avaliado porque a resposta principal retornou HTTP ${response.status}.`,
        action: "Repita a inspeção quando o site responder sem erro de servidor.",
        weight,
      })),
    ];
  }

  const checks: CyberCheck[] = [];
  checks.push({ code: "https", category: "website", title: "Site acessível por HTTPS", status: "pass", detail: `O site respondeu por HTTPS em ${finalUrl.hostname}, com código HTTP ${response.status}.`, action: "Mantenha a renovação do certificado e monitore regressões.", weight: 18 });
  const hsts = response.headers.get("strict-transport-security");
  checks.push(hsts
    ? { code: "hsts", category: "website", title: "HSTS habilitado", status: "pass", detail: "O navegador recebe instrução para priorizar conexões HTTPS.", action: "Revise max-age e inclusão de subdomínios antes de ampliar a política.", weight: 10 }
    : { code: "hsts", category: "website", title: "HSTS ausente", status: "warning", detail: "A resposta HTTPS não apresentou Strict-Transport-Security.", action: "Avalie habilitar HSTS após garantir HTTPS consistente em todos os subdomínios necessários.", weight: 10 });
  const csp = response.headers.get("content-security-policy");
  checks.push(csp
    ? { code: "csp", category: "website", title: "CSP publicada", status: "pass", detail: "O site publica uma Content-Security-Policy para limitar origens de conteúdo.", action: "Mantenha a política sem liberações excessivas e acompanhe violações.", weight: 12 }
    : { code: "csp", category: "website", title: "CSP não localizada", status: "risk", detail: "A resposta principal não apresentou Content-Security-Policy.", action: "Modele e publique uma CSP compatível com os scripts e serviços legítimos do site.", weight: 12 });
  const browserHeaders = [
    response.headers.has("x-content-type-options"),
    response.headers.has("referrer-policy"),
    response.headers.has("permissions-policy"),
    response.headers.has("x-frame-options") || /frame-ancestors/i.test(csp ?? ""),
  ].filter(Boolean).length;
  checks.push({ code: "browser-headers", category: "website", title: "Defesas do navegador", status: browserHeaders >= 4 ? "pass" : browserHeaders >= 2 ? "warning" : "risk", detail: `${browserHeaders} de 4 controles básicos foram observados na resposta principal.`, action: "Revise proteção contra MIME sniffing, enquadramento, vazamento de referência e permissões do navegador.", weight: 8 });
  return checks;
}

async function checksForDomain(domain: string) {
  const checks: CyberCheck[] = [];
  let addresses: string[] = [];
  try {
    addresses = await publicAddresses(domain);
    checks.push({ code: "public-dns", category: "domain", title: "Domínio público resolvido", status: "pass", detail: `${addresses.length} endereço(s) público(s) localizado(s), sem expor os IPs no relatório.`, action: "Mantenha o inventário DNS atualizado e remova registros que deixarem de ser necessários.", weight: 10 });
  } catch (error) {
    const blocked = error instanceof Error && error.message === "NON_PUBLIC_ADDRESS";
    checks.push({ code: "public-dns", category: "domain", title: "Resolução pública do domínio", status: "risk", detail: blocked ? "O domínio aponta para endereço reservado ou não público; a análise web foi bloqueada por segurança." : "O domínio não apresentou endereço público verificável.", action: "Revise os registros A, AAAA e CNAME com o responsável pelo DNS.", weight: 10 });
  }

  const [mxResult, txtResult, dmarcResult] = await Promise.allSettled([
    dnsQuery(domain, "MX"), dnsQuery(domain, "TXT"), dnsQuery(`_dmarc.${domain}`, "TXT"),
  ]);
  const mx = mxResult.status === "fulfilled" ? mxResult.value : [];
  const txt = txtResult.status === "fulfilled" ? textRecords(txtResult.value) : [];
  const dmarc = dmarcResult.status === "fulfilled" ? textRecords(dmarcResult.value) : [];
  checks.push(mx.length
    ? { code: "mx", category: "email", title: "Serviço de e-mail publicado", status: "pass", detail: "O domínio possui registros MX para recebimento de e-mail.", action: "Confirme se todos os provedores listados ainda são autorizados.", weight: 6 }
    : { code: "mx", category: "email", title: "Serviço de e-mail não identificado", status: "warning", detail: "Nenhum registro MX foi localizado. Isso pode ser correto se o domínio não envia nem recebe e-mail.", action: "Se houver e-mail corporativo, revise a configuração MX.", weight: 6 });
  checks.push(containsDnsPolicy(txt, "spf")
    ? { code: "spf", category: "email", title: "SPF publicado", status: "pass", detail: "Existe uma política SPF declarando servidores autorizados a enviar e-mail.", action: "Revise periodicamente os remetentes incluídos e evite autorizações amplas.", weight: 12 }
    : { code: "spf", category: "email", title: "SPF não localizado", status: mx.length ? "risk" : "warning", detail: "Não foi localizada uma política SPF válida no domínio.", action: "Publique uma política SPF compatível com os serviços de envio realmente usados.", weight: 12 });
  checks.push(containsDnsPolicy(dmarc, "dmarc")
    ? { code: "dmarc", category: "email", title: "DMARC publicado", status: "pass", detail: "Existe uma política DMARC para orientar o tratamento de mensagens que falham na autenticação.", action: "Confirme o nível da política e monitore os relatórios agregados.", weight: 16 }
    : { code: "dmarc", category: "email", title: "DMARC não localizado", status: mx.length ? "risk" : "warning", detail: "O domínio não apresentou uma política DMARC verificável.", action: "Implemente DMARC de forma gradual, começando por monitoramento e evoluindo após validar SPF e DKIM.", weight: 16 });

  if (!addresses.length) {
    for (const [code, title, weight] of [["https", "Disponibilidade HTTPS", 18], ["hsts", "Proteção HSTS", 10], ["csp", "Política de conteúdo", 12], ["browser-headers", "Cabeçalhos do navegador", 8]] as const) {
      checks.push({ code, category: "website", title, status: "unavailable", detail: "Verificação não executada porque o domínio não apresentou destino público seguro.", action: "Corrija primeiro a resolução pública do domínio.", weight });
    }
    return checks;
  }

  try {
    const { response, finalUrl } = await fetchWebsite(domain);
    checks.push(...websiteChecksFromResponse(response, finalUrl));
  } catch (error) {
    const reason = error instanceof Error && error.message === "UNSAFE_REDIRECT" ? "O site redirecionou para um domínio diferente e a análise foi interrompida por segurança." : "Não foi possível confirmar uma resposta HTTPS válida dentro do limite do diagnóstico.";
    checks.push({ code: "https", category: "website", title: "HTTPS não confirmado", status: "risk", detail: reason, action: "Revise o certificado, os redirecionamentos e a disponibilidade pública do site.", weight: 18 });
    for (const [code, title, weight] of [["hsts", "Proteção HSTS", 10], ["csp", "Política de conteúdo", 12], ["browser-headers", "Cabeçalhos do navegador", 8]] as const) {
      checks.push({ code, category: "website", title, status: "unavailable", detail: "Sem resposta HTTPS confiável para avaliar este controle.", action: "Corrija primeiro o acesso HTTPS do domínio.", weight });
    }
  }
  return checks;
}

export async function runPassiveSecurityScan(rawDomain: string) {
  const domain = normalizePublicDomain(rawDomain);
  const checks = await checksForDomain(domain);
  const posture = calculateCyberPosture(checks);
  const fingerprintBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${CYBERSECURITY_PREVIEW_VERSION}:${domain}:${JSON.stringify(checks.map(({ code, status }) => [code, status]))}`));
  const fingerprint = Array.from(new Uint8Array(fingerprintBytes), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 12);
  return { version: CYBERSECURITY_PREVIEW_VERSION, domain, checkedAt: new Date().toISOString(), fingerprint, posture, checks, limitation: publicScanLimitation() };
}
