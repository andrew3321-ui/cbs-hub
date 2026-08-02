export const SEARCH_CONSOLE_VERSION = "search-console.v1";
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

export function buildSearchConsoleAlerts(input: { currentClicks: number; previousClicks: number; currentImpressions: number; previousImpressions: number; currentPosition: number; previousPosition: number; indexedPages: number; expectedPages: number; organicVisitors: number; organicSignups: number }) {
  const alerts: SearchConsoleAlert[] = [];
  const drop = (current: number, previous: number) => previous > 0 ? (previous - current) / previous : 0;
  if (drop(input.currentClicks, input.previousClicks) >= 0.3) alerts.push({ severity: "critical", code: "CLICKS_DROP", title: "Queda de cliques orgânicos", detail: `Cliques recuaram ${Math.round(drop(input.currentClicks, input.previousClicks) * 100)}% frente ao período anterior.` });
  if (drop(input.currentImpressions, input.previousImpressions) >= 0.3) alerts.push({ severity: "warning", code: "IMPRESSIONS_DROP", title: "Queda de impressões", detail: `Impressões recuaram ${Math.round(drop(input.currentImpressions, input.previousImpressions) * 100)}% frente ao período anterior.` });
  if (input.previousPosition > 0 && input.currentPosition - input.previousPosition >= 3) alerts.push({ severity: "warning", code: "POSITION_DROP", title: "Piora de posição média", detail: `A posição média piorou ${Math.round((input.currentPosition - input.previousPosition) * 10) / 10} posições.` });
  if (input.expectedPages > 0 && input.indexedPages < input.expectedPages) alerts.push({ severity: "critical", code: "INDEXATION_GAP", title: "Cobertura de indexação incompleta", detail: `${input.indexedPages} de ${input.expectedPages} páginas públicas passaram na última inspeção.` });
  if (input.organicVisitors >= 20 && input.organicSignups === 0) alerts.push({ severity: "warning", code: "ORGANIC_CONVERSION_ZERO", title: "Tráfego sem cadastro", detail: `${input.organicVisitors} visitantes orgânicos chegaram no período sem gerar cadastro atribuído.` });
  return alerts;
}
