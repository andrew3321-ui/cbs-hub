import { isPrivateOrReservedAddress } from "../domain/cybersecurity-preview.ts";
import { SECURITY_ACTIVE_RUNNER_BASELINE_REQUESTS } from "../domain/security-campaign-policy.ts";
import { SECURITY_RUNNER_VERSION, type RunnerManifest } from "../domain/security-runner-policy.ts";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type RequestObservation = { status: number; headers: Headers; body: string; redirect: URL | null };
type WebProbeSignal = { code: string; severity: "high" | "medium" | "low"; title: string; detail: string };
export type RunnerRequestEvent = { method: "GET" | "HEAD" | "OPTIONS"; action: "Raiz autorizada" | "robots.txt" | "Página pública autorizada"; status?: number; errorCategory?: "timeout" | "network_or_tls" | "response_read" | "dns_unavailable" | "domain_not_resolved" };
type ExecutionState = {
  deadline: number;
  attempted: number;
  successful: number;
  errors: number;
  serverErrors: number;
  consecutiveServerErrors: number;
  statusCodes: Record<string, number>;
  lastRequestAt: number;
  stopReason: string | null;
};

export type RunnerExecutionResult = {
  version: string;
  domain: string;
  techniques: string[];
  startedAt: string;
  completedAt: string;
  outcome: "completed" | "stopped";
  stopReason: string | null;
  budget: { requestsPerMinute: number; totalRequests: number; consumed: number };
  requests: { successful: number; errors: number; serverErrors: number; statusCodes: Record<string, number> };
  transport: null | { httpsReachable: boolean; status: number | null; hstsObserved: boolean; cspObserved: boolean; limitation: string };
  crawl: null | { pagesVisited: number; discoveredPages: number; remainingPages: number; htmlPages: number; redirectsObserved: number; blockedRedirects: number; skippedSensitiveLinks: number; hstsCoveragePercent: number; cspCoveragePercent: number };
  webProbe: null | {
    requestsCompleted: number;
    cors: { verdict: "inconclusive" | "not_advertised" | "restricted" | "wildcard" | "reflected_origin" | "credentialed_origin_reflection"; allowCredentials: boolean; varyOrigin: boolean };
    methods: { responseObserved: boolean; advertised: string[]; riskyAdvertised: string[] };
    cookies: { observed: boolean; secureObserved: boolean; httpOnlyObserved: boolean; sameSiteObserved: boolean };
    signals: WebProbeSignal[];
  };
  limitation: string;
};

const DNS_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const FETCH_TIMEOUT_MS = 6_000;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_EXECUTION_MS = 120_000;
const PROBE_ORIGIN = "https://security-probe.invalid";
const KNOWN_HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE", "CONNECT"] as const;
const RISKY_HTTP_METHODS = new Set(["PUT", "PATCH", "DELETE", "TRACE", "CONNECT"]);
const blockedPathPattern = /(?:^|\/)(?:api|admin|logout|signout|delete|remove|destroy|cancel|checkout|billing|webhook|reset-password)(?:\/|$)/i;
const binaryExtensionPattern = /\.(?:7z|avi|bin|css|csv|docx?|gif|gz|ico|jpe?g|json|mov|mp3|mp4|pdf|png|rar|svg|tar|webm|webp|xlsx?|xml|zip)$/i;

export async function verifyRunnerOwnership(domain: string, token: string, fetcher: FetchLike = fetch) {
  if (!token) throw new Error("RUNNER_SCOPE_VERIFICATION_LOST");
  const url = new URL(DNS_ENDPOINT);
  url.searchParams.set("name", `_cbshub-verification.${domain}`);
  url.searchParams.set("type", "TXT");
  try {
    const response = await fetcher(url, { headers: { Accept: "application/dns-json", "User-Agent": "CBSHub-Security-Runner/1.0" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) throw new Error("RUNNER_SCOPE_VERIFICATION_UNAVAILABLE");
    const payload = await response.json() as { Status?: number; Answer?: Array<{ type?: number; data?: string }> };
    const expected = `cbshub-verification=${token}`;
    const verified = payload.Status === 0 || payload.Status === undefined
      ? (payload.Answer ?? []).some((answer) => answer.type === 16 && typeof answer.data === "string" && answer.data.replace(/"\s+"/g, "").replace(/^"|"$/g, "").trim() === expected)
      : false;
    if (!verified) throw new Error("RUNNER_SCOPE_VERIFICATION_LOST");
  } catch (error) {
    if (error instanceof Error && /^RUNNER_SCOPE_VERIFICATION_/.test(error.message)) throw error;
    throw new Error("RUNNER_SCOPE_VERIFICATION_UNAVAILABLE");
  }
}

function relatedHostname(candidate: string, expected: string) {
  const bare = (value: string) => value.toLowerCase().replace(/^www\./, "");
  return bare(candidate) === bare(expected);
}

function safeUrl(candidate: URL, domain: string) {
  if (candidate.protocol !== "https:" || (candidate.port && candidate.port !== "443") || candidate.username || candidate.password || !relatedHostname(candidate.hostname, domain)) return null;
  let decodedPath = candidate.pathname;
  try { decodedPath = decodeURIComponent(candidate.pathname); } catch { return null; }
  if (blockedPathPattern.test(decodedPath) || binaryExtensionPattern.test(decodedPath)) return null;
  candidate.hash = "";
  candidate.search = "";
  return candidate;
}

async function dnsQuery(domain: string, type: "A" | "AAAA", fetcher: FetchLike) {
  const url = new URL(DNS_ENDPOINT);
  url.searchParams.set("name", domain);
  url.searchParams.set("type", type);
  const response = await fetcher(url, { headers: { Accept: "application/dns-json", "User-Agent": "CBSHub-Security-Runner/1.0" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error("RUNNER_DNS_UNAVAILABLE");
  const payload = await response.json() as { Status?: number; Answer?: Array<{ type?: number; data?: string }> };
  if (payload.Status !== undefined && payload.Status !== 0 && payload.Status !== 3) throw new Error("RUNNER_DNS_UNAVAILABLE");
  if (payload.Status === 3) return [];
  return (payload.Answer ?? []).filter((item) => item.type === 1 || item.type === 28).map((item) => String(item.data ?? ""));
}

async function assertPublicResolution(domain: string, fetcher: FetchLike) {
  const results = await Promise.allSettled([dnsQuery(domain, "A", fetcher), dnsQuery(domain, "AAAA", fetcher)]);
  const addresses = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!addresses.length) throw new Error(results.some((result) => result.status === "rejected") ? "RUNNER_DNS_UNAVAILABLE" : "RUNNER_DOMAIN_NOT_RESOLVED");
  if (addresses.some(isPrivateOrReservedAddress)) throw new Error("RUNNER_NON_PUBLIC_TARGET");
}

async function boundedText(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (size < MAX_RESPONSE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const remaining = MAX_RESPONSE_BYTES - size;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      size += chunk.byteLength;
      text += decoder.decode(chunk, { stream: size < MAX_RESPONSE_BYTES });
      if (value.byteLength > remaining) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return text;
}

function shouldStop(manifest: RunnerManifest, state: ExecutionState, status: number, enforceUnexpectedAuthentication = true) {
  if (status === 429) return "target_rate_limited";
  if (enforceUnexpectedAuthentication && (status === 401 || status === 403) && manifest.stopConditions.unexpectedAuthentication) return "unexpected_authentication";
  if (state.consecutiveServerErrors >= manifest.stopConditions.consecutiveServerErrors) return "consecutive_server_errors";
  if (state.attempted >= 5 && ((state.serverErrors + state.errors) / state.attempted) * 100 >= manifest.stopConditions.errorRatePercent) return "error_rate_threshold";
  return null;
}

async function targetRequest(args: {
  url: URL;
  method: "GET" | "HEAD" | "OPTIONS";
  manifest: RunnerManifest;
  state: ExecutionState;
  fetcher: FetchLike;
  sleep: (milliseconds: number) => Promise<void>;
  now: () => number;
  enforceUnexpectedAuthentication?: boolean;
  extraHeaders?: Readonly<Record<string, string>>;
  action: RunnerRequestEvent["action"];
  onRequest?: (event: RunnerRequestEvent) => Promise<void>;
}): Promise<RequestObservation | null> {
  const { manifest, state, fetcher } = args;
  if (state.stopReason || state.attempted >= manifest.budgets.totalRequests) {
    state.stopReason ??= "request_budget_reached";
    return null;
  }
  // One TXT lookup plus three external fetches per target request must fit the 50-subrequest Worker tier.
  if (state.attempted >= SECURITY_ACTIVE_RUNNER_BASELINE_REQUESTS) {
    state.stopReason = "infrastructure_subrequest_budget";
    return null;
  }
  if (args.now() > Date.parse(manifest.window.end)) {
    state.stopReason = "execution_window_expired";
    return null;
  }
  const minimumInterval = Math.ceil(60_000 / manifest.budgets.requestsPerMinute);
  const delay = state.lastRequestAt ? Math.max(0, minimumInterval - (args.now() - state.lastRequestAt)) : 0;
  if (args.now() + delay >= state.deadline) {
    state.stopReason = "execution_time_limit";
    return null;
  }
  if (delay) await args.sleep(delay);
  try {
    await assertPublicResolution(args.url.hostname, fetcher);
  } catch (error) {
    const category = error instanceof Error && error.message === "RUNNER_DNS_UNAVAILABLE" ? "dns_unavailable"
      : error instanceof Error && error.message === "RUNNER_DOMAIN_NOT_RESOLVED" ? "domain_not_resolved" : null;
    if (!category) throw error;
    state.stopReason = category;
    await args.onRequest?.({ method: args.method, action: args.action, errorCategory: category }).catch(() => undefined);
    return null;
  }
  if (args.now() >= state.deadline || args.now() >= Date.parse(manifest.window.end)) {
    state.stopReason = "execution_window_expired";
    return null;
  }
  state.attempted += 1;
  state.lastRequestAt = args.now();
  let responseReceived = false;
  try {
    const response = await fetcher(args.url, {
      method: args.method,
      redirect: "manual",
      headers: {
        Accept: args.method === "GET" ? "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.4" : "*/*",
        "Cache-Control": "no-cache",
        "User-Agent": "CBSHub-Security-Runner/1.0 (+authorized-safe-validation)",
        ...args.extraHeaders,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    responseReceived = true;
    const statusKey = String(response.status);
    state.statusCodes[statusKey] = (state.statusCodes[statusKey] ?? 0) + 1;
    state.successful += 1;
    if (response.status >= 500) {
      state.serverErrors += 1;
      state.consecutiveServerErrors += 1;
    } else state.consecutiveServerErrors = 0;
    state.stopReason = shouldStop(manifest, state, response.status, args.enforceUnexpectedAuthentication !== false);
    const redirectLocation = response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
    let redirect: URL | null = null;
    if (redirectLocation) {
      try { redirect = safeUrl(new URL(redirectLocation, args.url), manifest.scope.domain); } catch { redirect = null; }
    }
    const contentType = response.headers.get("content-type") ?? "";
    const body = args.method === "GET" && /(?:text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType) ? await boundedText(response) : (await response.body?.cancel().catch(() => undefined), "");
    await args.onRequest?.({ method: args.method, action: args.action, status: response.status }).catch(() => undefined);
    return { status: response.status, headers: response.headers, body, redirect };
  } catch (error) {
    state.errors += 1;
    state.consecutiveServerErrors = 0;
    if (state.attempted >= 5 && ((state.serverErrors + state.errors) / state.attempted) * 100 >= manifest.stopConditions.errorRatePercent) state.stopReason = "error_rate_threshold";
    const errorCategory = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "timeout" : responseReceived ? "response_read" : "network_or_tls";
    await args.onRequest?.({ method: args.method, action: args.action, errorCategory }).catch(() => undefined);
    if (error instanceof Error && error.message.startsWith("RUNNER_")) throw error;
    return null;
  }
}

function parseAdvertisedMethods(value: string | null) {
  if (!value) return [];
  const advertised = new Set(value.split(",").map((method) => method.trim().toUpperCase()));
  return KNOWN_HTTP_METHODS.filter((method) => advertised.has(method));
}

function analyzeWebProbe(head: RequestObservation | null, options: RequestObservation | null): NonNullable<RunnerExecutionResult["webProbe"]> {
  const usableOptions = options && options.status >= 200 && options.status < 300 ? options : null;
  const allowOrigin = usableOptions?.headers.get("access-control-allow-origin")?.trim() ?? "";
  const allowCredentials = usableOptions?.headers.get("access-control-allow-credentials")?.trim().toLowerCase() === "true";
  const varyOrigin = (usableOptions?.headers.get("vary") ?? "").split(",").some((value) => value.trim().toLowerCase() === "origin");
  const corsVerdict = !usableOptions ? "inconclusive" : allowOrigin === PROBE_ORIGIN
    ? (allowCredentials ? "credentialed_origin_reflection" : "reflected_origin")
    : allowOrigin === "*" ? "wildcard" : allowOrigin ? "restricted" : "not_advertised";
  const advertised = parseAdvertisedMethods(usableOptions?.headers.get("allow") ?? null);
  const riskyAdvertised = advertised.filter((method) => RISKY_HTTP_METHODS.has(method));
  const setCookie = head && head.status >= 200 && head.status < 300 ? head.headers.get("set-cookie") ?? "" : "";
  const cookies = {
    observed: Boolean(setCookie),
    secureObserved: /(?:^|;)\s*secure(?:;|$)/i.test(setCookie),
    httpOnlyObserved: /(?:^|;)\s*httponly(?:;|$)/i.test(setCookie),
    sameSiteObserved: /(?:^|;)\s*samesite\s*=\s*(?:strict|lax|none)(?:;|$)/i.test(setCookie),
  };
  const signals: WebProbeSignal[] = [];
  if (corsVerdict === "credentialed_origin_reflection") signals.push({ code: "cors_credentialed_origin_reflection", severity: "high", title: "CORS refletiu uma origem não confiável com credenciais", detail: "Confirme a lista de origens permitidas; a observação isolada não comprova acesso a dados sensíveis." });
  else if (corsVerdict === "reflected_origin") signals.push({ code: "cors_origin_reflection", severity: "medium", title: "CORS refletiu uma origem não confiável", detail: "Revise se endpoints públicos devem responder dinamicamente a qualquer Origin." });
  else if (corsVerdict === "wildcard") signals.push({ code: "cors_wildcard", severity: "low", title: "CORS anunciou acesso para qualquer origem", detail: "Valide se a resposta é intencionalmente pública e não inclui dados sensíveis." });
  if (riskyAdvertised.length) signals.push({ code: "http_risky_methods_advertised", severity: "medium", title: "Métodos HTTP sensíveis foram anunciados", detail: "O cabeçalho Allow exige revisão; anunciar um método não comprova que uma operação destrutiva esteja disponível." });
  if (cookies.observed && !cookies.secureObserved) signals.push({ code: "cookie_secure_not_observed", severity: "medium", title: "Atributo Secure não observado no cookie da resposta", detail: "Revise os cookies emitidos pelo endpoint HTTPS sem registrar nomes ou valores na plataforma." });
  if (cookies.observed && !cookies.httpOnlyObserved) signals.push({ code: "cookie_httponly_not_observed", severity: "medium", title: "Atributo HttpOnly não observado no cookie da resposta", detail: "Confirme se cookies de sessão precisam ser inacessíveis a JavaScript." });
  if (cookies.observed && !cookies.sameSiteObserved) signals.push({ code: "cookie_samesite_not_observed", severity: "low", title: "Atributo SameSite não observado no cookie da resposta", detail: "Revise a política de envio cross-site apropriada para o aplicativo." });
  return {
    requestsCompleted: Number(Boolean(head)) + Number(Boolean(options)),
    cors: { verdict: corsVerdict, allowCredentials, varyOrigin },
    methods: { responseObserved: Boolean(usableOptions), advertised, riskyAdvertised },
    cookies,
    signals,
  };
}

function robotsDisallow(body: string) {
  const disallowed: string[] = [];
  let applicable = false;
  for (const rawLine of body.split(/\r?\n/).slice(0, 2_000)) {
    const line = rawLine.split("#", 1)[0].trim();
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") applicable = value === "*" || value.toLowerCase() === "cbshub-security-runner";
    if (field === "disallow" && applicable && value.startsWith("/")) disallowed.push(value);
  }
  return disallowed.slice(0, 100);
}

function extractLinks(body: string, base: URL, domain: string, disallowed: string[]) {
  const links: URL[] = [];
  const seen = new Set<string>();
  let skippedSensitive = 0;
  const pattern = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of body.matchAll(pattern)) {
    const href = match[1] ?? match[2] ?? match[3] ?? "";
    try {
      const parsed = new URL(href, base);
      const safe = safeUrl(parsed, domain);
      if (!safe || disallowed.some((path) => safe.pathname.startsWith(path))) { skippedSensitive += 1; continue; }
      const key = safe.toString();
      if (!seen.has(key)) { seen.add(key); links.push(safe); }
    } catch { skippedSensitive += 1; }
    if (links.length >= 100) break;
  }
  return { links, skippedSensitive };
}

export type RunnerStage = "web_control_probe" | "safe_web_crawl" | "tls_configuration_review";
export async function executeRunnerManifest(manifest: RunnerManifest, options: { fetcher?: FetchLike; sleep?: (milliseconds: number) => Promise<void>; now?: () => number; onStage?: (stage: RunnerStage, status: "started" | "completed" | "skipped", counts?: Record<string, number>) => Promise<void>; onRequest?: (event: RunnerRequestEvent) => Promise<void> } = {}): Promise<RunnerExecutionResult> {
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now ?? Date.now;
  const startedAt = new Date(now()).toISOString();
  const state: ExecutionState = { deadline: Math.min(now() + MAX_EXECUTION_MS, Date.parse(manifest.window.end)), attempted: 0, successful: 0, errors: 0, serverErrors: 0, consecutiveServerErrors: 0, statusCodes: {}, lastRequestAt: 0, stopReason: null };
  let transport: RunnerExecutionResult["transport"] = null;
  let crawl: RunnerExecutionResult["crawl"] = null;
  let webProbe: RunnerExecutionResult["webProbe"] = null;
  const root = new URL(`https://${manifest.scope.domain}/`);

  if (manifest.techniques.includes("web_control_probe")) {
    await options.onStage?.("web_control_probe", "started");
    const head = await targetRequest({ url: root, method: "HEAD", action: "Raiz autorizada", onRequest: options.onRequest, manifest, state, fetcher, sleep, now, enforceUnexpectedAuthentication: false });
    const optionsObservation = state.stopReason ? null : await targetRequest({
      url: root,
      method: "OPTIONS",
      action: "Raiz autorizada",
      onRequest: options.onRequest,
      manifest,
      state,
      fetcher,
      sleep,
      now,
      enforceUnexpectedAuthentication: false,
      extraHeaders: {
        Origin: PROBE_ORIGIN,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });
    webProbe = analyzeWebProbe(head, optionsObservation);
    if (head) transport = { httpsReachable: true, status: head.status, hstsObserved: head.headers.has("strict-transport-security"), cspObserved: head.headers.has("content-security-policy"), limitation: "O runtime confirma negociação HTTPS e resposta HTTP, mas não expõe cifra, protocolo ou validade detalhada do certificado." };
    await options.onStage?.("web_control_probe", "completed", { requestsCompleted: webProbe.requestsCompleted, signals: webProbe.signals.length });
  }

  if (manifest.techniques.includes("safe_web_crawl")) {
    if (state.stopReason) await options.onStage?.("safe_web_crawl", "skipped");
    else {
    await options.onStage?.("safe_web_crawl", "started");
    let disallowed: string[] = [];
    const robots = await targetRequest({ url: new URL("/robots.txt", root), method: "GET", action: "robots.txt", onRequest: options.onRequest, manifest, state, fetcher, sleep, now, enforceUnexpectedAuthentication: false });
    if (robots?.status === 200) disallowed = robotsDisallow(robots.body);
    const pending: URL[] = disallowed.some((path) => root.pathname.startsWith(path)) ? [] : [root];
    const visited = new Set<string>();
    let pagesVisited = 0, htmlPages = 0, redirectsObserved = 0, blockedRedirects = 0, skippedSensitiveLinks = 0, hstsPages = 0, cspPages = 0;
    while (pending.length && !state.stopReason && state.attempted < manifest.budgets.totalRequests) {
      const url = pending.shift()!;
      const key = url.toString();
      if (visited.has(key)) continue;
      visited.add(key);
      const attemptedBeforeRequest = state.attempted;
      const observation = await targetRequest({ url, method: "GET", action: url.pathname === "/" ? "Raiz autorizada" : "Página pública autorizada", onRequest: options.onRequest, manifest, state, fetcher, sleep, now });
      if (!observation) {
        if (state.stopReason && state.attempted === attemptedBeforeRequest) { visited.delete(key); pending.unshift(url); }
        continue;
      }
      pagesVisited += 1;
      if (!transport) transport = { httpsReachable: true, status: observation.status, hstsObserved: observation.headers.has("strict-transport-security"), cspObserved: observation.headers.has("content-security-policy"), limitation: "O runtime confirma negociação HTTPS e resposta HTTP, mas não expõe cifra, protocolo ou validade detalhada do certificado." };
      if (observation.redirect) { redirectsObserved += 1; pending.unshift(observation.redirect); continue; }
      if (observation.status >= 300 && observation.status < 400) { blockedRedirects += 1; continue; }
      if (observation.body && /(?:text\/html|application\/xhtml\+xml)/i.test(observation.headers.get("content-type") ?? "")) {
        htmlPages += 1;
        if (observation.headers.has("strict-transport-security")) hstsPages += 1;
        if (observation.headers.has("content-security-policy")) cspPages += 1;
        const extracted = extractLinks(observation.body, url, manifest.scope.domain, disallowed);
        skippedSensitiveLinks += extracted.skippedSensitive;
        for (const link of extracted.links) if (!visited.has(link.toString()) && !pending.some((item) => item.toString() === link.toString())) pending.push(link);
      }
    }
    if (pending.length && state.attempted >= manifest.budgets.totalRequests && !state.stopReason) state.stopReason = "request_budget_reached";
    crawl = {
      pagesVisited,
      discoveredPages: visited.size + pending.length,
      remainingPages: pending.length,
      htmlPages,
      redirectsObserved,
      blockedRedirects,
      skippedSensitiveLinks,
      hstsCoveragePercent: htmlPages ? Math.round((hstsPages / htmlPages) * 100) : 0,
      cspCoveragePercent: htmlPages ? Math.round((cspPages / htmlPages) * 100) : 0,
    };
    await options.onStage?.("safe_web_crawl", "completed", { pagesVisited: crawl.pagesVisited, htmlPages: crawl.htmlPages });
    }
  }

  if (manifest.techniques.includes("tls_configuration_review")) {
    if (state.stopReason && !transport) await options.onStage?.("tls_configuration_review", "skipped");
    else {
    await options.onStage?.("tls_configuration_review", "started");
    if (!transport && !state.stopReason) {
      const observation = await targetRequest({ url: root, method: "HEAD", action: "Raiz autorizada", onRequest: options.onRequest, manifest, state, fetcher, sleep, now });
      transport = observation
        ? { httpsReachable: true, status: observation.status, hstsObserved: observation.headers.has("strict-transport-security"), cspObserved: observation.headers.has("content-security-policy"), limitation: "O runtime confirma negociação HTTPS e resposta HTTP, mas não expõe cifra, protocolo ou validade detalhada do certificado." }
        : { httpsReachable: false, status: null, hstsObserved: false, cspObserved: false, limitation: "A negociação HTTPS não foi confirmada dentro do tempo e do orçamento autorizados." };
    }
    await options.onStage?.("tls_configuration_review", "completed", { httpsReachable: transport?.httpsReachable ? 1 : 0 });
    }
  }

  return {
    version: SECURITY_RUNNER_VERSION,
    domain: manifest.scope.domain,
    techniques: [...manifest.techniques],
    startedAt,
    completedAt: new Date(now()).toISOString(),
    outcome: state.stopReason ? "stopped" : "completed",
    stopReason: state.stopReason,
    budget: { requestsPerMinute: manifest.budgets.requestsPerMinute, totalRequests: manifest.budgets.totalRequests, consumed: state.attempted },
    requests: { successful: state.successful, errors: state.errors, serverErrors: state.serverErrors, statusCodes: state.statusCodes },
    transport,
    crawl,
    webProbe,
    limitation: "Validação HTTP(S) não invasiva, sem login, payloads de exploração, portas, força bruta ou persistência. Correlacione os sinais antes de concluir vulnerabilidade.",
  };
}
