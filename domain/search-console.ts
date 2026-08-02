export const SEARCH_CONSOLE_VERSION = "search-console.v2";
export const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const SEARCH_CONSOLE_RETENTION_DAYS = 486;
export const SEARCH_CONSOLE_INDEX_RETENTION_DAYS = 180;

export type SearchConsoleOpportunity = {
  label: string;
  page: string;
  impressions: number;
  clicks: number;
  ctrPercent: number;
  position: number;
  score: number;
};

export type SearchConsoleAlert = {
  severity: "warning" | "critical";
  code: string;
  title: string;
  detail: string;
};

export type SearchIndexationStage = "indexed" | "discovered" | "unknown" | "blocked" | "inspection_error" | "pending";

export function classifySearchIndexation(row: { verdict?: string; coverageState?: string; robotsTxtState?: string; indexingState?: string }): SearchIndexationStage {
  if (row.verdict === "PASS") return "indexed";
  if (row.verdict === "ERROR" || row.coverageState === "INSPECTION_FAILED") return "inspection_error";
  if (row.robotsTxtState === "DISALLOWED" || row.indexingState === "INDEXING_NOT_ALLOWED") return "blocked";
  const coverage = String(row.coverageState ?? "").toLowerCase();
  if (coverage.includes("não reconhece") || coverage.includes("not known")) return "unknown";
  if (coverage.includes("detectada") || coverage.includes("descoberta") || coverage.includes("discovered")) return "discovered";
  return "pending";
}

export function summarizeSearchIndexation(rows: Array<{ verdict?: string; coverageState?: string; robotsTxtState?: string; indexingState?: string }>, expectedPages: number) {
  const summary = { indexed: 0, discovered: 0, unknown: 0, blocked: 0, inspectionErrors: 0, pending: 0, expected: Math.max(0, expectedPages) };
  for (const row of rows) {
    const stage = classifySearchIndexation(row);
    if (stage === "inspection_error") summary.inspectionErrors += 1;
    else summary[stage] += 1;
  }
  return summary;
}

export function buildSearchConsoleOpportunities(rows: Array<{ query?: string; page?: string; impressions?: number; clicks?: number; ctr?: number; position?: number }>) {
  return rows.map((row) => {
    const impressions = Math.max(0, Number(row.impressions) || 0);
    const clicks = Math.max(0, Number(row.clicks) || 0);
    const ctrPercent = Math.max(0, Number(row.ctr) || 0);
    const position = Math.max(0, Number(row.position) || 0);
    const score = Math.round(impressions * Math.max(0.05, 1 - ctrPercent / 100) * (position <= 20 ? 1 : 0.35));
    return { label: String(row.query ?? "").slice(0, 500), page: String(row.page ?? "").slice(0, 1000), impressions, clicks, ctrPercent, position, score };
  }).filter((row) => row.impressions >= 10 && row.ctrPercent < 5).sort((a, b) => b.score - a.score || b.impressions - a.impressions).slice(0, 20);
}

export function buildSearchConsoleAlerts(input: { currentClicks: number; previousClicks: number; currentImpressions: number; previousImpressions: number; currentPosition: number; previousPosition: number; indexedPages: number; expectedPages: number; discoveredPages?: number; unknownPages?: number; blockedPages?: number; inspectionErrors?: number; organicVisitors: number; organicSignups: number }) {
  const alerts: SearchConsoleAlert[] = [];
  const drop = (current: number, previous: number) => previous > 0 ? (previous - current) / previous : 0;
  if (drop(input.currentClicks, input.previousClicks) >= 0.3) alerts.push({ severity: "critical", code: "CLICKS_DROP", title: "Queda de cliques orgânicos", detail: `Cliques recuaram ${Math.round(drop(input.currentClicks, input.previousClicks) * 100)}% frente ao período anterior.` });
  if (drop(input.currentImpressions, input.previousImpressions) >= 0.3) alerts.push({ severity: "warning", code: "IMPRESSIONS_DROP", title: "Queda de impressões", detail: `Impressões recuaram ${Math.round(drop(input.currentImpressions, input.previousImpressions) * 100)}% frente ao período anterior.` });
  if (input.previousPosition > 0 && input.currentPosition - input.previousPosition >= 3) alerts.push({ severity: "warning", code: "POSITION_DROP", title: "Piora de posição média", detail: `A posição média piorou ${Math.round((input.currentPosition - input.previousPosition) * 10) / 10} posições.` });
  if ((input.blockedPages ?? 0) > 0 || (input.inspectionErrors ?? 0) > 0) alerts.push({ severity: "critical", code: "INDEXATION_BLOCKED", title: "Indexação exige correção técnica", detail: `${input.blockedPages ?? 0} URL(s) bloqueada(s) e ${input.inspectionErrors ?? 0} inspeção(ões) com erro.` });
  if ((input.unknownPages ?? 0) > 0) alerts.push({ severity: "warning", code: "INDEXATION_UNKNOWN", title: "URLs novas ainda não descobertas", detail: `${input.unknownPages} de ${input.expectedPages} páginas ainda não são reconhecidas pelo Google. Sitemap e links internos estão prontos; acompanhe a próxima recaptura.` });
  if ((input.discoveredPages ?? 0) > 0) alerts.push({ severity: "warning", code: "INDEXATION_DISCOVERED", title: "Páginas descobertas aguardando indexação", detail: `${input.discoveredPages} URL(s) foram descobertas, mas o Google ainda não concluiu a indexação.` });
  if (input.organicVisitors >= 20 && input.organicSignups === 0) alerts.push({ severity: "warning", code: "ORGANIC_CONVERSION_ZERO", title: "Tráfego sem cadastro", detail: `${input.organicVisitors} visitantes orgânicos chegaram no período sem gerar cadastro atribuído.` });
  return alerts;
}
