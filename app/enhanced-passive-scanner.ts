import {
  calculateCyberPosture,
  isPrivateOrReservedAddress,
  normalizePublicDomain,
  type CyberCheck,
  type CyberCheckStatus,
} from "../domain/cybersecurity-preview.ts";
import {
  ENHANCED_PASSIVE_VERSION,
  ENHANCED_PASSIVE_LIMITATION,
  ENHANCED_FETCH_TIMEOUT_MS,
  MAX_SUBDOMAIN_DNS_QUERIES,
  MAX_PATH_PROBES,
  SUBDOMAIN_PREFIXES,
  SENSITIVE_PATHS,
  TECH_HEADER_SIGNATURES,
  TECH_BODY_SIGNATURES,
  CSP_DANGEROUS_DIRECTIVES,
  type EnhancedCheckCategory,
} from "../domain/enhanced-passive-policy.ts";
import { dnsTxtRecords, websiteChecksFromResponse } from "./cybersecurity-scan-service.ts";
import type { SecurityEvidence } from "../domain/security-operations.ts";

const DNS_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const USER_AGENT = "CBSHub-Security-Agent/1.0";

type DnsAnswer = { name?: string; type?: number; data?: string };
type DnsResponse = { Status?: number; Answer?: DnsAnswer[] };

type DiscoveredSubdomain = {
  name: string;
  source: "ct" | "dns_brute";
  addresses: string[];
};

type DetectedTechnology = {
  technology: string;
  category: string;
  source: string;
  evidence: string;
};

type PathProbeResult = {
  path: string;
  status: number;
  accessible: boolean;
  contentType: string | null;
  contentLength: number | null;
};

// -- DNS helpers --

async function dnsQuery(name: string, type: "A" | "AAAA" | "CNAME"): Promise<DnsAnswer[]> {
  const url = new URL(DNS_ENDPOINT);
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);
  const response = await fetch(url, {
    headers: { Accept: "application/dns-json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(ENHANCED_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) return [];
  const payload = await response.json() as DnsResponse;
  return (payload.Answer ?? []).filter((a) => typeof a.data === "string");
}

async function resolveSubdomain(fqdn: string): Promise<string[]> {
  const [ipv4, ipv6] = await Promise.allSettled([dnsQuery(fqdn, "A"), dnsQuery(fqdn, "AAAA")]);
  return [ipv4, ipv6]
    .flatMap((r) => r.status === "fulfilled" ? r.value : [])
    .filter((a) => a.type === 1 || a.type === 28)
    .map((a) => String(a.data))
    .filter((ip) => !isPrivateOrReservedAddress(ip));
}

// -- Certificate Transparency --

async function queryCtLogs(domain: string): Promise<string[]> {
  const url = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const entries = await response.json() as Array<{ name_value?: string }>;
    const names = new Set<string>();
    for (const entry of entries) {
      if (!entry.name_value) continue;
      for (const raw of entry.name_value.split("\n")) {
        const name = raw.trim().toLowerCase().replace(/^\*\./, "");
        if (name.endsWith(`.${domain}`) && !name.includes("*")) names.add(name);
      }
    }
    return [...names];
  } catch {
    return [];
  }
}

// -- Subdomain enumeration --

async function enumerateSubdomains(domain: string): Promise<DiscoveredSubdomain[]> {
  const discovered = new Map<string, DiscoveredSubdomain>();

  const ctNames = await queryCtLogs(domain);
  const ctBatch = ctNames.slice(0, MAX_SUBDOMAIN_DNS_QUERIES);
  const ctResults = await Promise.allSettled(ctBatch.map(async (name) => {
    const addrs = await resolveSubdomain(name);
    if (addrs.length) discovered.set(name, { name, source: "ct", addresses: addrs });
  }));
  void ctResults;

  const remaining = MAX_SUBDOMAIN_DNS_QUERIES - discovered.size;
  const prefixesToProbe = SUBDOMAIN_PREFIXES
    .map((p) => `${p}.${domain}`)
    .filter((fqdn) => !discovered.has(fqdn))
    .slice(0, remaining);

  const bruteResults = await Promise.allSettled(prefixesToProbe.map(async (fqdn) => {
    const addrs = await resolveSubdomain(fqdn);
    if (addrs.length) discovered.set(fqdn, { name: fqdn, source: "dns_brute", addresses: addrs });
  }));
  void bruteResults;

  return [...discovered.values()];
}

// -- Technology fingerprinting --

function fingerprintFromHeaders(headers: Headers): DetectedTechnology[] {
  const results: DetectedTechnology[] = [];
  const server = headers.get("server") ?? "";
  const poweredBy = headers.get("x-powered-by") ?? "";
  const via = headers.get("via") ?? "";

  for (const sig of TECH_HEADER_SIGNATURES) {
    const target = sig.source === "header" ? server : "";
    if (sig.pattern.test(target)) {
      results.push({ technology: sig.technology, category: sig.category, source: "server-header", evidence: server });
    }
  }

  if (poweredBy) {
    for (const sig of TECH_HEADER_SIGNATURES) {
      if (sig.pattern.test(poweredBy) && !results.some((r) => r.technology === sig.technology)) {
        results.push({ technology: sig.technology, category: sig.category, source: "x-powered-by", evidence: poweredBy });
      }
    }
  }

  if (via) {
    results.push({ technology: via.split(",")[0].trim(), category: "proxy", source: "via-header", evidence: via });
  }

  const cfRay = headers.get("cf-ray");
  if (cfRay && !results.some((r) => r.technology === "Cloudflare")) {
    results.push({ technology: "Cloudflare", category: "cdn", source: "cf-ray", evidence: "present" });
  }

  const setCookies = headers.getAll?.("set-cookie") ?? [headers.get("set-cookie") ?? ""].filter(Boolean);
  for (const cookie of setCookies) {
    if (/PHPSESSID/i.test(cookie) && !results.some((r) => r.technology === "PHP")) {
      results.push({ technology: "PHP", category: "runtime", source: "cookie", evidence: "PHPSESSID" });
    }
    if (/JSESSIONID/i.test(cookie)) {
      results.push({ technology: "Java Servlet", category: "runtime", source: "cookie", evidence: "JSESSIONID" });
    }
    if (/ASP\.NET_SessionId/i.test(cookie) && !results.some((r) => r.technology === "ASP.NET")) {
      results.push({ technology: "ASP.NET", category: "framework", source: "cookie", evidence: "ASP.NET_SessionId" });
    }
    if (/laravel_session/i.test(cookie)) {
      results.push({ technology: "Laravel", category: "framework", source: "cookie", evidence: "laravel_session" });
    }
    if (/connect\.sid/i.test(cookie) && !results.some((r) => r.technology === "Express.js")) {
      results.push({ technology: "Express.js", category: "framework", source: "cookie", evidence: "connect.sid" });
    }
  }

  return results;
}

function fingerprintFromBody(body: string): DetectedTechnology[] {
  const results: DetectedTechnology[] = [];
  const seen = new Set<string>();
  for (const sig of TECH_BODY_SIGNATURES) {
    if (seen.has(sig.technology)) continue;
    const match = sig.pattern.exec(body);
    if (match) {
      seen.add(sig.technology);
      results.push({ technology: sig.technology, category: sig.category, source: "html-body", evidence: match[0].slice(0, 80) });
    }
  }
  return results;
}

// -- Path probing --

async function probePaths(baseUrl: string): Promise<PathProbeResult[]> {
  const results: PathProbeResult[] = [];
  const paths = SENSITIVE_PATHS.slice(0, MAX_PATH_PROBES);
  const batches: typeof paths[] = [];
  const batchSize = 10;
  for (let i = 0; i < paths.length; i += batchSize) {
    batches.push(paths.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map(async (entry) => {
        try {
          const response = await fetch(`${baseUrl}${entry.path}`, {
            method: "HEAD",
            redirect: "manual",
            headers: { "User-Agent": USER_AGENT },
            signal: AbortSignal.timeout(ENHANCED_FETCH_TIMEOUT_MS),
          });
          await response.body?.cancel();
          const accessible = response.status >= 200 && response.status < 300;
          results.push({
            path: entry.path,
            status: response.status,
            accessible,
            contentType: response.headers.get("content-type"),
            contentLength: Number(response.headers.get("content-length")) || null,
          });
        } catch {
          // timeout or network error — path treated as inaccessible
        }
      }),
    );
    void batchResults;
  }

  return results;
}

// -- CSP deep analysis --

function analyzeCSP(cspValue: string): CyberCheck[] {
  const checks: CyberCheck[] = [];
  const directives = new Map<string, string>();
  for (const part of cspValue.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...values] = trimmed.split(/\s+/);
    directives.set(name.toLowerCase(), values.join(" "));
  }

  for (const rule of CSP_DANGEROUS_DIRECTIVES) {
    const value = directives.get(rule.directive) ?? directives.get("default-src") ?? "";
    if (value.includes(rule.pattern)) {
      checks.push({
        code: `csp-${rule.directive}-${rule.pattern.replace(/[^a-z]/gi, "")}`,
        category: "website",
        title: `CSP: ${rule.pattern} em ${rule.directive}`,
        status: rule.severity === "high" ? "risk" : "warning",
        detail: rule.detail,
        action: `Remova ou restrinja "${rule.pattern}" da diretiva ${rule.directive} da sua Content-Security-Policy.`,
        weight: rule.severity === "high" ? 6 : 4,
      });
    }
  }

  if (!directives.has("default-src") && !directives.has("script-src")) {
    checks.push({
      code: "csp-missing-script-src",
      category: "website",
      title: "CSP sem restrição de scripts",
      status: "warning",
      detail: "A CSP não possui script-src nem default-src, permitindo scripts de qualquer origem.",
      action: "Adicione uma diretiva script-src explícita à sua CSP.",
      weight: 5,
    });
  }

  return checks;
}

// -- Server version disclosure --

function checkServerDisclosure(headers: Headers): CyberCheck | null {
  const server = headers.get("server");
  if (!server) return null;
  const hasVersion = /\/[\d.]+/.test(server);
  if (!hasVersion) return null;
  return {
    code: "server-version-disclosure",
    category: "infrastructure" as EnhancedCheckCategory,
    title: "Versão do servidor divulgada",
    status: "warning",
    detail: `O cabeçalho Server revela versão: "${server}". Atacantes usam essa informação para buscar exploits conhecidos.`,
    action: "Configure o servidor para omitir ou mascarar a versão no cabeçalho Server.",
    weight: 5,
  };
}

function checkPoweredByDisclosure(headers: Headers): CyberCheck | null {
  const poweredBy = headers.get("x-powered-by");
  if (!poweredBy) return null;
  return {
    code: "x-powered-by-disclosure",
    category: "infrastructure" as EnhancedCheckCategory,
    title: "X-Powered-By divulgado",
    status: "warning",
    detail: `O cabeçalho X-Powered-By revela: "${poweredBy}". Facilita identificação da stack para ataques direcionados.`,
    action: "Remova o cabeçalho X-Powered-By da configuração do servidor ou framework.",
    weight: 4,
  };
}

// -- Cookie security --

function checkCookieSecurity(headers: Headers): CyberCheck[] {
  const checks: CyberCheck[] = [];
  const raw = headers.get("set-cookie");
  if (!raw) return checks;

  const cookies = raw.split(/,(?=\s*\w+=)/);
  let insecureCount = 0;
  let noHttpOnlyCount = 0;
  let noSameSiteCount = 0;

  for (const cookie of cookies) {
    const lower = cookie.toLowerCase();
    const isSession = /sess|token|auth|sid/i.test(cookie.split("=")[0]);
    if (!isSession) continue;
    if (!lower.includes("secure")) insecureCount++;
    if (!lower.includes("httponly")) noHttpOnlyCount++;
    if (!lower.includes("samesite")) noSameSiteCount++;
  }

  if (insecureCount > 0) {
    checks.push({
      code: "cookie-missing-secure",
      category: "website",
      title: "Cookie de sessão sem flag Secure",
      status: "risk",
      detail: `${insecureCount} cookie(s) de sessão sem a flag Secure, permitindo transmissão por HTTP.`,
      action: "Adicione a flag Secure a todos os cookies de sessão.",
      weight: 6,
    });
  }

  if (noHttpOnlyCount > 0) {
    checks.push({
      code: "cookie-missing-httponly",
      category: "website",
      title: "Cookie de sessão sem HttpOnly",
      status: "warning",
      detail: `${noHttpOnlyCount} cookie(s) de sessão acessível(is) via JavaScript, ampliando risco de XSS.`,
      action: "Adicione a flag HttpOnly a cookies de sessão.",
      weight: 5,
    });
  }

  if (noSameSiteCount > 0) {
    checks.push({
      code: "cookie-missing-samesite",
      category: "website",
      title: "Cookie de sessão sem SameSite",
      status: "warning",
      detail: `${noSameSiteCount} cookie(s) de sessão sem atributo SameSite, suscetível(is) a CSRF.`,
      action: "Defina SameSite=Lax ou Strict para cookies de sessão.",
      weight: 4,
    });
  }

  return checks;
}

// -- Build checks from probe results --

function checksFromPathProbes(probes: PathProbeResult[]): CyberCheck[] {
  const checks: CyberCheck[] = [];
  for (const probe of probes) {
    if (!probe.accessible) continue;
    const entry = SENSITIVE_PATHS.find((sp) => sp.path === probe.path);
    if (!entry) continue;

    const status: CyberCheckStatus = entry.severity === "critical" || entry.severity === "high" ? "risk" : "warning";
    checks.push({
      code: entry.code,
      category: entry.category as CyberCheck["category"],
      title: entry.title,
      status,
      detail: `O caminho ${entry.path} retornou HTTP ${probe.status}${probe.contentType ? ` (${probe.contentType})` : ""}. Pode expor informações sensíveis.`,
      action: `Bloqueie ou remova o acesso público a ${entry.path}. Se necessário, restrinja por IP ou autenticação.`,
      weight: entry.severity === "critical" ? 10 : entry.severity === "high" ? 7 : 4,
    });
  }
  return checks;
}

function checksFromSubdomains(subdomains: DiscoveredSubdomain[], domain: string): CyberCheck[] {
  const checks: CyberCheck[] = [];

  const devPatterns = /^(dev|staging|test|uat|qa|sandbox|beta|demo|internal|old|legacy|debug|preprod)\./i;
  const infraPatterns = /^(grafana|kibana|elastic|redis|db|backup|monitor|prometheus|jenkins|ci|git|jira|confluence|wiki|admin|panel|dashboard|phpmyadmin|adminer)\./i;

  const devExposed: string[] = [];
  const infraExposed: string[] = [];

  for (const sub of subdomains) {
    if (devPatterns.test(sub.name.replace(`.${domain}`, ".dummy.").split(".")[0] + ".")) {
      devExposed.push(sub.name);
    }
    if (infraPatterns.test(sub.name.replace(`.${domain}`, ".dummy.").split(".")[0] + ".")) {
      infraExposed.push(sub.name);
    }
  }

  checks.push({
    code: "subdomain-enumeration",
    category: "reconnaissance" as CyberCheck["category"],
    title: "Subdomínios descobertos",
    status: subdomains.length > 15 ? "warning" : "pass",
    detail: `${subdomains.length} subdomínio(s) encontrado(s) via Certificate Transparency e DNS (${subdomains.filter((s) => s.source === "ct").length} CT, ${subdomains.filter((s) => s.source === "dns_brute").length} DNS).`,
    action: subdomains.length > 15
      ? "Revise se todos os subdomínios são necessários e remova os que não estão em uso."
      : "Mantenha inventário atualizado de subdomínios ativos.",
    weight: 6,
  });

  if (devExposed.length > 0) {
    checks.push({
      code: "dev-subdomain-exposure",
      category: "exposure" as CyberCheck["category"],
      title: "Ambientes de desenvolvimento expostos",
      status: "risk",
      detail: `${devExposed.length} subdomínio(s) de desenvolvimento/teste resolve(m) publicamente: ${devExposed.slice(0, 5).join(", ")}${devExposed.length > 5 ? "..." : ""}.`,
      action: "Restrinja subdomínios de desenvolvimento com VPN, IP allowlist ou remoção dos registros DNS públicos.",
      weight: 8,
    });
  }

  if (infraExposed.length > 0) {
    checks.push({
      code: "infra-subdomain-exposure",
      category: "infrastructure" as CyberCheck["category"],
      title: "Infraestrutura interna exposta",
      status: "risk",
      detail: `${infraExposed.length} subdomínio(s) de infraestrutura resolve(m) publicamente: ${infraExposed.slice(0, 5).join(", ")}${infraExposed.length > 5 ? "..." : ""}.`,
      action: "Mova serviços internos para rede privada ou proteja com autenticação e restrição de IP.",
      weight: 9,
    });
  }

  return checks;
}

function checksFromTechStack(technologies: DetectedTechnology[]): CyberCheck[] {
  if (!technologies.length) return [];

  const deduplicated = [...new Map(technologies.map((t) => [t.technology, t])).values()];
  const summary = deduplicated.map((t) => `${t.technology} (${t.source})`).join(", ");

  return [{
    code: "technology-fingerprint",
    category: "reconnaissance" as CyberCheck["category"],
    title: "Stack tecnológica identificada",
    status: deduplicated.length > 5 ? "warning" : "pass",
    detail: `Tecnologias detectadas: ${summary}.`,
    action: deduplicated.length > 5
      ? "Reduza a exposição de informações tecnológicas removendo cabeçalhos desnecessários e comentários HTML."
      : "Monitore CVEs para as tecnologias identificadas.",
    weight: 5,
  }];
}

function checkSecurityTxt(probes: PathProbeResult[]): CyberCheck | null {
  const secTxt = probes.find((p) => p.path === "/.well-known/security.txt");
  if (!secTxt) return null;
  return secTxt.accessible
    ? { code: "security-txt", category: "website", title: "security.txt presente", status: "pass", detail: "O site publica um arquivo security.txt conforme RFC 9116.", action: "Mantenha o security.txt atualizado com contatos válidos.", weight: 3 }
    : { code: "security-txt-missing", category: "website", title: "security.txt ausente", status: "warning", detail: "Não foi encontrado um security.txt (RFC 9116). Pesquisadores de segurança podem não saber como reportar vulnerabilidades.", action: "Publique um security.txt em /.well-known/security.txt com contato e política de divulgação.", weight: 3 };
}

// -- Main scanner --

export async function runEnhancedPassiveScan(rawDomain: string): Promise<SecurityEvidence> {
  const domain = normalizePublicDomain(rawDomain);

  const [subdomains, baseResponse] = await Promise.allSettled([
    enumerateSubdomains(domain),
    fetchBase(domain),
  ]);

  const subs = subdomains.status === "fulfilled" ? subdomains.value : [];
  const base = baseResponse.status === "fulfilled" ? baseResponse.value : null;

  const checks: CyberCheck[] = [];

  // -- DNS + email checks (reuse passive scanner pattern) --
  checks.push(...(await dnsAndEmailChecks(domain)));

  // -- Subdomain checks --
  checks.push(...checksFromSubdomains(subs, domain));

  if (!base) {
    checks.push({
      code: "https",
      category: "website",
      title: "HTTPS não confirmado",
      status: "risk",
      detail: "Não foi possível obter resposta HTTPS do domínio principal.",
      action: "Revise o certificado, redirecionamentos e disponibilidade do site.",
      weight: 18,
    });
  } else {
    // -- Standard website checks from response --
    checks.push(...websiteChecksFromResponse(base.response, base.finalUrl));

    // -- Technology fingerprinting --
    const headerTech = fingerprintFromHeaders(base.response.headers);
    const bodyTech = base.body ? fingerprintFromBody(base.body) : [];
    const allTech = [...headerTech, ...bodyTech];
    checks.push(...checksFromTechStack(allTech));

    // -- Server/header disclosure --
    const serverCheck = checkServerDisclosure(base.response.headers);
    if (serverCheck) checks.push(serverCheck);
    const poweredCheck = checkPoweredByDisclosure(base.response.headers);
    if (poweredCheck) checks.push(poweredCheck);

    // -- Cookie security --
    checks.push(...checkCookieSecurity(base.response.headers));

    // -- CSP deep analysis --
    const csp = base.response.headers.get("content-security-policy");
    if (csp) checks.push(...analyzeCSP(csp));

    // -- Sensitive path probing --
    const probes = await probePaths(`https://${base.finalUrl.hostname}`);
    checks.push(...checksFromPathProbes(probes));

    // -- security.txt check --
    const secTxt = checkSecurityTxt(probes);
    if (secTxt) checks.push(secTxt);
  }

  const posture = calculateCyberPosture(checks);
  const fingerprintBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ENHANCED_PASSIVE_VERSION}:${domain}:${JSON.stringify(checks.map(({ code, status }) => [code, status]))}`),
  );
  const fingerprint = Array.from(new Uint8Array(fingerprintBytes), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);

  return {
    version: ENHANCED_PASSIVE_VERSION,
    domain,
    checkedAt: new Date().toISOString(),
    fingerprint,
    posture,
    checks,
    limitation: ENHANCED_PASSIVE_LIMITATION,
  };
}

// -- Internal helpers --

async function fetchBase(domain: string): Promise<{ response: Response; finalUrl: URL; body: string | null }> {
  let url = new URL(`https://${domain}/`);
  for (let redirect = 0; redirect <= 2; redirect += 1) {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(ENHANCED_FETCH_TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) return { response, finalUrl: url, body: null };
      const next = new URL(location, url);
      if (next.protocol !== "https:" || !relatedHostname(next.hostname, domain)) throw new Error("UNSAFE_REDIRECT");
      await resolvePublicAddresses(next.hostname);
      url = next;
      continue;
    }
    const body = response.headers.get("content-type")?.includes("text/html")
      ? await response.text().catch(() => null)
      : (await response.body?.cancel(), null);
    return { response, finalUrl: url, body };
  }
  throw new Error("TOO_MANY_REDIRECTS");
}

function relatedHostname(candidate: string, original: string) {
  const strip = (v: string) => v.replace(/^www\./, "");
  return strip(candidate) === strip(original);
}

async function resolvePublicAddresses(hostname: string) {
  const addrs = await resolveSubdomain(hostname);
  if (!addrs.length) throw new Error("DOMAIN_NOT_RESOLVED");
}

async function dnsAndEmailChecks(domain: string): Promise<CyberCheck[]> {
  const checks: CyberCheck[] = [];

  let hasPublicDns = false;
  try {
    const addrs = await resolveSubdomain(domain);
    hasPublicDns = addrs.length > 0;
    checks.push(hasPublicDns
      ? { code: "public-dns", category: "domain", title: "Domínio público resolvido", status: "pass", detail: `${addrs.length} endereço(s) público(s) localizado(s).`, action: "Mantenha o inventário DNS atualizado.", weight: 10 }
      : { code: "public-dns", category: "domain", title: "Resolução pública do domínio", status: "risk", detail: "O domínio não apresentou endereço público verificável.", action: "Revise os registros A, AAAA e CNAME.", weight: 10 },
    );
  } catch {
    checks.push({ code: "public-dns", category: "domain", title: "Resolução pública do domínio", status: "risk", detail: "Falha ao consultar DNS.", action: "Revise os registros DNS.", weight: 10 });
  }

  try {
    const [mxAnswers, txtRecords, dmarcRecords] = await Promise.allSettled([
      dnsQuery(domain, "A").then(() => dnsQueryMx(domain)),
      dnsTxtRecords(domain),
      dnsTxtRecords(`_dmarc.${domain}`),
    ]);

    const mx = mxAnswers.status === "fulfilled" ? mxAnswers.value : [];
    const txt = txtRecords.status === "fulfilled" ? txtRecords.value : [];
    const dmarc = dmarcRecords.status === "fulfilled" ? dmarcRecords.value : [];

    checks.push(mx.length
      ? { code: "mx", category: "email", title: "Serviço de e-mail publicado", status: "pass", detail: "Registros MX presentes.", action: "Confirme que os provedores listados são autorizados.", weight: 6 }
      : { code: "mx", category: "email", title: "Serviço de e-mail não identificado", status: "warning", detail: "Nenhum registro MX localizado.", action: "Se houver e-mail corporativo, revise a configuração MX.", weight: 6 });

    const hasSpf = txt.some((r) => /^v=spf1\s/i.test(r));
    checks.push(hasSpf
      ? { code: "spf", category: "email", title: "SPF publicado", status: "pass", detail: "Política SPF declarada.", action: "Revise periodicamente os remetentes incluídos.", weight: 12 }
      : { code: "spf", category: "email", title: "SPF não localizado", status: mx.length ? "risk" : "warning", detail: "Política SPF não encontrada.", action: "Publique uma política SPF.", weight: 12 });

    const hasDmarc = dmarc.some((r) => /^v=DMARC1/i.test(r));
    checks.push(hasDmarc
      ? { code: "dmarc", category: "email", title: "DMARC publicado", status: "pass", detail: "Política DMARC presente.", action: "Confirme o nível da política e monitore relatórios.", weight: 16 }
      : { code: "dmarc", category: "email", title: "DMARC não localizado", status: mx.length ? "risk" : "warning", detail: "Política DMARC não encontrada.", action: "Implemente DMARC gradualmente.", weight: 16 });
  } catch {
    // DNS email checks failed — skip
  }

  return checks;
}

async function dnsQueryMx(domain: string): Promise<DnsAnswer[]> {
  const url = new URL(DNS_ENDPOINT);
  url.searchParams.set("name", domain);
  url.searchParams.set("type", "MX");
  const response = await fetch(url, {
    headers: { Accept: "application/dns-json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(ENHANCED_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) return [];
  const payload = await response.json() as DnsResponse;
  return (payload.Answer ?? []).filter((a) => typeof a.data === "string");
}
