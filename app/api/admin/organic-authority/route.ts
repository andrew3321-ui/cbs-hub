import { env } from "cloudflare:workers";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getPlatformAdminUser } from "../../../platform-admin";
import { allowedAcquisitionMethods, buildTrackedShareUrl, citableAssets, normalizeExternalUrl, normalizeTargetPath, organicAuthorityPolicy, outreachTargets } from "../../../../domain/organic-authority";

const linkStatuses = ["verified", "lost", "rejected"] as const;
const cycleStatuses = ["open", "completed"] as const;
const clean = (value: unknown, max: number) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const count = (value: unknown) => Math.max(0, Math.min(100000, Math.trunc(Number(value) || 0)));

async function readAuthority(request: Request) {
  const admin = await getPlatformAdminUser();
  if (!admin) return Response.json({ error: "Área restrita ao proprietário da plataforma." }, { status: 403 });
  const days = [30, 90, 365].includes(Number(new URL(request.url).searchParams.get("days"))) ? Number(new URL(request.url).searchParams.get("days")) : 90;
  const start = new Date(); start.setUTCDate(start.getUTCDate() - days + 1);
  const [links, cycles, referrals] = await Promise.all([
    env.DB.prepare("SELECT id, source_url sourceUrl, source_domain sourceDomain, target_path targetPath, context, acquisition_method acquisitionMethod, status, first_seen_at firstSeenAt, last_verified_at lastVerifiedAt, result_note resultNote FROM organic_authority_links ORDER BY last_verified_at DESC, source_domain LIMIT 250").all(),
    env.DB.prepare("SELECT id, cycle_month cycleMonth, status, outreach_count outreachCount, mentions_found mentionsFound, verified_links verifiedLinks, notes, updated_at updatedAt FROM organic_outreach_cycles ORDER BY cycle_month DESC LIMIT 24").all(),
    env.DB.prepare("SELECT source, medium, campaign, COUNT(*) pageViews, COUNT(DISTINCT event_date || ':' || visitor_hash) visitors FROM platform_metric_events WHERE event_type = 'page_view' AND event_date >= ? AND (medium = 'referral' OR source = 'organic_outreach') GROUP BY source, medium, campaign ORDER BY visitors DESC, pageViews DESC LIMIT 50").bind(start.toISOString().slice(0, 10)).all(),
  ]);
  return Response.json({
    generatedAt: new Date().toISOString(), days,
    assets: citableAssets.map((asset) => ({ ...asset, trackedUrl: buildTrackedShareUrl(asset.href, "authority_outreach", asset.category) })),
    targets: outreachTargets, policy: organicAuthorityPolicy,
    links: links.results, cycles: cycles.results, referrals: referrals.results,
  }, { headers: { "Cache-Control": "no-store" } });
}

async function mutateAuthority(request: Request) {
  const admin = await getPlatformAdminUser();
  if (!admin) return Response.json({ error: "Área restrita ao proprietário da plataforma." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const now = new Date().toISOString();
  if (body.action === "save_link") {
    const sourceUrl = normalizeExternalUrl(body.sourceUrl);
    const targetPath = normalizeTargetPath(body.targetPath);
    const context = clean(body.context, 280);
    const resultNote = clean(body.resultNote, 280);
    const method = clean(body.acquisitionMethod, 40);
    const status = clean(body.status, 20);
    if (!sourceUrl || !targetPath || context.length < 12 || !allowedAcquisitionMethods.includes(method as never) || !linkStatuses.includes(status as never)) return Response.json({ error: "Registro inválido. Informe URL HTTPS externa, contexto, destino, método legítimo e status." }, { status: 400 });
    const domain = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
    const id = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sourceUrl)).then((buffer) => Array.from(new Uint8Array(buffer)).slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join(""));
    await env.DB.prepare("INSERT INTO organic_authority_links (id, source_url, source_domain, target_path, context, acquisition_method, status, first_seen_at, last_verified_at, result_note, created_by_user_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(source_url) DO UPDATE SET source_domain=excluded.source_domain, target_path=excluded.target_path, context=excluded.context, acquisition_method=excluded.acquisition_method, status=excluded.status, last_verified_at=excluded.last_verified_at, result_note=excluded.result_note, updated_at=excluded.updated_at")
      .bind(id, sourceUrl, domain, targetPath, context, method, status, now, now, resultNote, admin.id, now).run();
    return Response.json({ ok: true, id });
  }
  if (body.action === "save_cycle") {
    const month = clean(body.cycleMonth, 7);
    const status = clean(body.status, 20);
    const notes = clean(body.notes, 500);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !cycleStatuses.includes(status as never)) return Response.json({ error: "Ciclo mensal inválido." }, { status: 400 });
    await env.DB.prepare("INSERT INTO organic_outreach_cycles (id, cycle_month, status, outreach_count, mentions_found, verified_links, notes, created_by_user_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(cycle_month) DO UPDATE SET status=excluded.status, outreach_count=excluded.outreach_count, mentions_found=excluded.mentions_found, verified_links=excluded.verified_links, notes=excluded.notes, updated_at=excluded.updated_at")
      .bind(`outreach:${month}`, month, status, count(body.outreachCount), count(body.mentionsFound), count(body.verifiedLinks), notes, admin.id, now).run();
    return Response.json({ ok: true, id: `outreach:${month}` });
  }
  return Response.json({ error: "Ação inválida." }, { status: 400 });
}

export const GET = withApiTelemetry("GET /api/admin/organic-authority", readAuthority);
export const POST = withApiTelemetry("POST /api/admin/organic-authority", mutateAuthority);
