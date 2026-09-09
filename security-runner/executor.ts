import { isPrivateOrReservedAddress } from "../domain/cybersecurity-preview.ts";
import { SECURITY_RUNNER_VERSION, type RunnerManifest } from "../domain/security-runner-policy.ts";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type RequestObservation = { status: number; headers: Headers; body: string; redirect: URL | null };
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
  crawl: null | { pagesVisited: number; htmlPages: number; redirectsObserved: number; blockedRedirects: number; skippedSensitiveLinks: number; hstsCoveragePercent: number; cspCoveragePercent: number };
  limitation: string;
};

const DNS_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const FETCH_TIMEOUT_MS = 6_000;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_EXECUTION_MS = 120_000;
const blockedPathPattern = /(?:^|\/)(?:api|admin|logout|signout|delete|remove|destroy|cancel|checkout|billing|webhook|reset-password)(?:\/|$)/i;
const binaryExtensionPattern = /\.(?:7z|avi|bin|css|csv|docx?|gif|gz|ico|jpe?g|json|mov|mp3|mp4|pdf|png|rar|svg|tar|webm|webp|xlsx?|xml|zip)$/i;

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
  const payload = await response.json() as { Answer?: Array<{ type?: number; data?: string }> };
  return (payload.Answer ?? []).filter((item) => item.type === 1 || item.type === 28).map((item) => String(item.data ?? ""));
}

async function assertPublicResolution(domain: string, fetcher: FetchLike) {
  const results = await Promise.allSettled([dnsQuery(domain, "A", fetcher), dnsQuery(domain, "AAAA", fetcher)]);
  const addresses = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!addresses.length) throw new Error("RUNNER_DOMAIN_NOT_RESOLVED");
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
  if (enforceUnexpectedAuthentication && (status === 401 || status === 403) && manifest.stopConditions.unexpectedAuthentication) return "unexpected_authentication";
  if (state.consecutiveServerErrors >= manifest.stopConditions.consecutiveServerErrors) return "consecutive_server_errors";
  if (state.attempted >= 5 && ((state.serverErrors + state.errors) / state.attempted) * 100 >= manifest.stopConditions.errorRatePercent) return "error_rate_threshold";
  return null;
}

async function targetRequest(args: {
  url: URL;
  method: "GET" | "HEAD";
  manifest: RunnerManifest;
  state: ExecutionState;
  fetcher: FetchLike;
  sleep: (milliseconds: number) => Promise<void>;
  now: () => number;
  enforceUnexpectedAuthentication?: boolean;
}): Promise<RequestObservation | null> {
  const { manifest, state } = args;
  if (state.stopReason || state.attempted >= manifest.budgets.totalRequests) {
    state.stopReason ??= "request_budget_reached";
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
  await assertPublicResolution(args.url.hostname, args.fetcher);
  if (args.now() >= state.deadline || args.now() >= Date.parse(manifest.window.end)) {
    state.stopReason = "execution_window_expired";
    return null;
  }
  state.attempted += 1;
  state.lastRequestAt = args.now();
  try {
    const response = await args.fetcher(args.url, {
      method: args.method,
      redirect: "manual",
      headers: {
        Accept: args.method === "GET" ? "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.4" : "*/*",
        "Cache-Control": "no-cache",
        "User-Agent": "CBSHub-Security-Runner/1.0 (+authorized-safe-validation)",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
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
    return { status: response.status, headers: response.headers, body, redirect };
  } catch (error) {
    state.errors += 1;
    state.consecutiveServerErrors = 0;
    if (state.attempted >= 5 && ((state.serverErrors + state.errors) / state.attempted) * 100 >= manifest.stopConditions.errorRatePercent) state.stopReason = "error_rate_threshold";
    if (error instanceof Error && error.message.startsWith("RUNNER_")) throw error;
    return null;
  }
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

export async function executeRunnerManifest(manifest: RunnerManifest, options: { fetcher?: FetchLike; sleep?: (milliseconds: number) => Promise<void>; now?: () => number } = {}): Promise<RunnerExecutionResult> {
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now ?? Date.now;
  const startedAt = new Date(now()).toISOString();
  const state: ExecutionState = { deadline: Math.min(now() + MAX_EXECUTION_MS, Date.parse(manifest.window.end)), attempted: 0, successful: 0, errors: 0, serverErrors: 0, consecutiveServerErrors: 0, statusCodes: {}, lastRequestAt: 0, stopReason: null };
  let transport: RunnerExecutionResult["transport"] = null;
  let crawl: RunnerExecutionResult["crawl"] = null;
  const root = new URL(`https://${manifest.scope.domain}/`);

  if (manifest.techniques.includes("safe_web_crawl")) {
    let disallowed: string[] = [];
    const robots = await targetRequest({ url: new URL("/robots.txt", root), method: "GET", manifest, state, fetcher, sleep, now, enforceUnexpectedAuthentication: false });
    if (robots?.status === 200) disallowed = robotsDisallow(robots.body);
    const pending: URL[] = disallowed.some((path) => root.pathname.startsWith(path)) ? [] : [root];
    const visited = new Set<string>();
    let htmlPages = 0, redirectsObserved = 0, blockedRedirects = 0, skippedSensitiveLinks = 0, hstsPages = 0, cspPages = 0;
    while (pending.length && !state.stopReason && state.attempted < manifest.budgets.totalRequests) {
      const url = pending.shift()!;
      const key = url.toString();
      if (visited.has(key)) continue;
      visited.add(key);
      const observation = await targetRequest({ url, method: "GET", manifest, state, fetcher, sleep, now });
      if (!observation) continue;
      if (!transport) transport = { httpsReachable: true, status: observation.status, hstsObserved: observation.headers.has("strict-transport-security"), cspObserved: observation.headers.has("content-security-policy"), limitation: "O runtime confirma negociação HTTPS e resposta HTTP, mas não expõe cifra, protocolo ou validade detalhada do certificado." };
      if (observation.redirect) { redirectsObserved += 1; pending.unshift(observation.redirect); continue; }
      if (observation.status >= 300 && observation.status < 400) { blockedRedirects += 1; continue; }
      if (observation.body) {
        htmlPages += 1;
        if (observation.headers.has("strict-transport-security")) hstsPages += 1;
        if (observation.headers.has("content-security-policy")) cspPages += 1;
        const extracted = extractLinks(observation.body, url, manifest.scope.domain, disallowed);
        skippedSensitiveLinks += extracted.skippedSensitive;
        for (const link of extracted.links) if (!visited.has(link.toString()) && !pending.some((item) => item.toString() === link.toString())) pending.push(link);
      }
    }
    crawl = {
      pagesVisited: visited.size,
      htmlPages,
      redirectsObserved,
      blockedRedirects,
      skippedSensitiveLinks,
      hstsCoveragePercent: htmlPages ? Math.round((hstsPages / htmlPages) * 100) : 0,
      cspCoveragePercent: htmlPages ? Math.round((cspPages / htmlPages) * 100) : 0,
    };
  }

  if (manifest.techniques.includes("tls_configuration_review") && !transport && !state.stopReason) {
    const observation = await targetRequest({ url: root, method: "HEAD", manifest, state, fetcher, sleep, now });
    transport = observation
      ? { httpsReachable: true, status: observation.status, hstsObserved: observation.headers.has("strict-transport-security"), cspObserved: observation.headers.has("content-security-policy"), limitation: "O runtime confirma negociação HTTPS e resposta HTTP, mas não expõe cifra, protocolo ou validade detalhada do certificado." }
      : { httpsReachable: false, status: null, hstsObserved: false, cspObserved: false, limitation: "A negociação HTTPS não foi confirmada dentro do tempo e do orçamento autorizados." };
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
    limitation: "Validação HTTP(S) não invasiva, sem login, payloads de exploração, portas, força bruta ou persistência. Correlacione os sinais antes de concluir vulnerabilidade.",
  };
}
