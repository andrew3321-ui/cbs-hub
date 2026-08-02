export const PLATFORM_METRICS_VERSION = "platform-metrics.v5";
export const PLATFORM_METRIC_EVENT_RETENTION_DAYS = 90;
export const PLATFORM_METRIC_DAILY_RETENTION_DAYS = 730;

export const platformMetricDefinitions = {
  pageViews: "Visualizações qualificadas, deduplicadas por sessão, caminho e janela de dez minutos.",
  visitors: "Visitas diárias únicas por navegador/dispositivo: vários acessos no mesmo dia contam uma vez e um novo dia abre uma nova visita; não usa IP bruto.",
  sessions: "Sessões pseudonimizadas distintas, renovadas após trinta minutos.",
  signups: "Contas persistidas com sucesso no período; convites também contam como cadastro.",
  signupFunnel: "Etapas pseudonimizadas do cadastro: visualização, início do preenchimento, clique, chegada à API, falha classificada e conta persistida. Nenhum valor digitado é armazenado.",
  activeUsers: "Contas existentes distintas que abriram o workspace em cada janela (DAU/WAU/MAU); contas apagadas não inflam o estado atual.",
  trials: "Claims vinculados a contas existentes; ativo e expirado são resolvidos pela data e pelo estado atual, enquanto claims antifraude anonimizados ficam fora do painel.",
  payers: "Contas de cobrança ativas; MRR usa o preço contratado e os blocos adicionais.",
  conversion: "Conversões usam registros operacionais persistidos, nunca eventos de interface isolados.",
  organicAttribution: "Atribui cadastro, trial e pagamento ao navegador pseudonimizado que chegou por busca orgânica nos 30 dias anteriores; a consulta do Google nunca é vinculada à pessoa.",
  searchConsole: "Impressões, cliques, CTR e posição são agregados pela API oficial; consultas raras omitidas pelo Google não são reidentificadas.",
} as const;

export type MetricAcquisition = { source: string; medium: string; campaign: string };

function cleanToken(value: unknown, maximum = 80) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, maximum)
    : "";
}

export function normalizeMetricPath(value: unknown) {
  const path = typeof value === "string" ? value.split(/[?#]/)[0].trim().toLowerCase() : "";
  if (path === "/") return "landing";
  if (path === "/cadastro") return "signup";
  if (path === "/entrar") return "login";
  if (path === "/planos") return "pricing";
  if (["/calculadora-reforma-tributaria", "/cbs-ibs-contadores", "/icms-st-contadores", "/inteligencia-tributaria-escritorios", "/relatorios-fiscais-rastreaveis"].includes(path)) return `seo:${path.slice(1)}`;
  if (path === "/app" || path.startsWith("/app/")) return "workspace";
  if (["/privacidade", "/termos", "/metodologia", "/responsavel"].includes(path)) return "institutional";
  return "other";
}

export function normalizeMetricAcquisition(input: { source?: unknown; medium?: unknown; campaign?: unknown; referrerHost?: unknown }): MetricAcquisition {
  const referrer = cleanToken(input.referrerHost, 120);
  return {
    source: cleanToken(input.source) || referrer || "direct",
    medium: cleanToken(input.medium) || (referrer ? "referral" : "none"),
    campaign: cleanToken(input.campaign, 120),
  };
}

export function isLikelyAutomatedTraffic(userAgent: string) {
  const value = userAgent.toLowerCase();
  return !value || /(bot|crawler|spider|headless|lighthouse|pagespeed|monitoring|uptime|curl|wget|python-requests)/.test(value);
}

export function metricDate(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function percentage(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

export function buildMetricWindow(days: number, now = new Date()) {
  const safeDays = [7, 30, 90].includes(days) ? days : 30;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - safeDays + 1);
  return { days: safeDays, startDate: metricDate(start), endDate: metricDate(end) };
}

export function completeDailySeries<T extends { date: string }>(rows: T[], days: number, now = new Date()) {
  const window = buildMetricWindow(days, now);
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const output: Array<T | ({ date: string } & Record<string, number>)> = [];
  const cursor = new Date(`${window.startDate}T00:00:00.000Z`);
  for (let index = 0; index < window.days; index += 1) {
    const date = metricDate(cursor);
    output.push(byDate.get(date) ?? { date });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return output;
}

export type PlatformDailyMetric = { date: string; pageViews: number; visitors: number; sessions: number; activeUsers: number; signups: number; trialsStarted: number; trialsDenied: number; paymentsApproved: number; grossAmountCents: number };

export function mergePlatformDailyGroups(days: number, endDate: string, groups: Array<Partial<PlatformDailyMetric> & { date: string }>) {
  const merged = new Map<string, PlatformDailyMetric>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(`${endDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = metricDate(date);
    merged.set(key, { date: key, pageViews: 0, visitors: 0, sessions: 0, activeUsers: 0, signups: 0, trialsStarted: 0, trialsDenied: 0, paymentsApproved: 0, grossAmountCents: 0 });
  }
  const numericKeys = ["pageViews", "visitors", "sessions", "activeUsers", "signups", "trialsStarted", "trialsDenied", "paymentsApproved", "grossAmountCents"] as const;
  for (const row of groups) {
    const target = merged.get(row.date);
    if (!target) continue;
    for (const key of numericKeys) {
      const value = Number(row[key]);
      target[key] += Number.isFinite(value) ? value : 0;
    }
  }
  return [...merged.values()];
}
