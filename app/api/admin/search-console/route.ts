import { env } from "cloudflare:workers";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getPlatformAdminUser } from "../../../platform-admin";
import { runSearchConsoleSync, searchConsoleConfiguration } from "../../../search-console-service";
import { SEARCH_CONSOLE_RETENTION_DAYS, SEARCH_CONSOLE_SCOPE, SEARCH_CONSOLE_VERSION } from "../../../../domain/search-console";

type Runtime = {
  DB: D1Database;
  GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?: string;
  GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?: string;
  GOOGLE_SEARCH_CONSOLE_SITE_URL?: string;
};

async function requireOwner() {
  const admin = await getPlatformAdminUser();
  return admin ? null : Response.json({ error: "Área restrita ao proprietário da plataforma." }, { status: 403, headers: { "Cache-Control": "no-store" } });
}

async function status() {
  const forbidden = await requireOwner();
  if (forbidden) return forbidden;
  const runtime = env as unknown as Runtime;
  const configuration = searchConsoleConfiguration(runtime);
  const lastRun = await runtime.DB.prepare("SELECT id, status, started_at startedAt, completed_at completedAt, start_date startDate, end_date endDate, metric_rows metricRows, inspected_pages inspectedPages, error_code errorCode FROM search_console_sync_runs ORDER BY started_at DESC, id DESC LIMIT 1").first();
  return Response.json({ version: SEARCH_CONSOLE_VERSION, configured: configuration.configured, siteUrl: configuration.siteUrl, scope: SEARCH_CONSOLE_SCOPE, retentionDays: SEARCH_CONSOLE_RETENTION_DAYS, lastRun }, { headers: { "Cache-Control": "no-store" } });
}

async function synchronize() {
  const forbidden = await requireOwner();
  if (forbidden) return forbidden;
  const runtime = env as unknown as Runtime;
  const result = await runSearchConsoleSync(runtime);
  if (!result.configured) return Response.json({ error: "Integração ainda não configurada no servidor.", code: "SEARCH_CONSOLE_NOT_CONFIGURED", result }, { status: 424, headers: { "Cache-Control": "no-store" } });
  return Response.json({ result }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/admin/search-console", status);
export const POST = withApiTelemetry("POST /api/admin/search-console", synchronize);
