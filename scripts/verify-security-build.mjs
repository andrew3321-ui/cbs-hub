import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

function requireInvariant(condition, code) {
  if (!condition) throw new Error(`security_build_blocked:${code}`);
}

const [appPage, appLayout, workspace, agentRoute, landing, seoPolicy, nextConfig, operations, findings, campaigns, campaignPolicy] = await Promise.all([
  source("app/app/page.tsx"),
  source("app/app/layout.tsx"),
  source("app/app/SecurityAgentCenter.tsx"),
  source("app/api/security-agent/route.ts"),
  source("app/CybersecurityLanding.tsx"),
  source("domain/seo-route-policy.ts"),
  source("next.config.ts"),
  source("domain/security-operations.ts"),
  source("app/security-findings-service.ts"),
  source("app/security-campaign-service.ts"),
  source("domain/security-campaign-policy.ts"),
]);

requireInvariant(appPage.includes("SecurityAgentCenter"), "workspace_entrypoint_missing");
requireInvariant(!appPage.includes("CBSHubApp") && !appPage.includes("GuestCBSHubApp"), "fiscal_workspace_still_active");
requireInvariant(appLayout.includes("security-workspace.css") && appLayout.includes("security-agent.css"), "security_styles_missing");
requireInvariant(workspace.includes("AUTHORIZED SECURITY VALIDATION") && workspace.includes("authorizationConfirmed"), "authorization_guard_missing");
requireInvariant(agentRoute.includes("getCurrentUser") && agentRoute.includes("enqueueSecurityAgentJob"), "authenticated_agent_route_missing");
requireInvariant(agentRoute.includes("triage_telemetry") && operations.includes("manual_telemetry"), "blue_team_triage_missing");
requireInvariant(findings.includes("syncSecurityFindings") && findings.includes("security_finding_events"), "security_findings_workflow_missing");
requireInvariant(campaigns.includes("pull_request_only") && campaignPolicy.includes("blockedCapabilities"), "controlled_delivery_workflow_missing");
requireInvariant(landing.includes("CBSHub Cybersecurity") && !landing.includes("Produto fiscal"), "cybersecurity_landing_incomplete");
requireInvariant(!seoPolicy.includes("taxContentRoutes") && !seoPolicy.includes("relatorios-fiscais"), "legacy_seo_routes_active");
requireInvariant(nextConfig.includes("/calculadora-reforma-tributaria") && nextConfig.includes("permanent: true"), "legacy_redirects_missing");

process.stdout.write("Security build assurance passed: workspace, authorization guard, routing and legacy retirement verified.\n");
