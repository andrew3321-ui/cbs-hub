import { boundedJson, github, installationToken, repoPath, type Fetcher, type GitHubEnv } from '../app/github-client.ts';
import { githubFile, repositoryFor } from '../app/github-repository-service.ts';
import { hashEvidence, inspectSource, isSourcePath, lockedPackages, REPOSITORY_LIMITS, REPOSITORY_POLICY_VERSION, type RepositoryEvidence } from '../domain/repository-security.ts';
import { discoverAttackSurface, isAttackSurfaceFile, isOpenApiDocument, MAX_ATTACK_SURFACE_ROUTES, REPOSITORY_ATTACK_SURFACE_VERSION, type AttackSurfaceRoute } from '../domain/repository-attack-surface.ts';

export type RepositoryScan = { sha: string; findings: RepositoryEvidence[]; coverage: { version: string; complete: boolean; filesScanned: number; eligibleFiles: number; packagesChecked: number; limitations: string[]; attackSurface: { version: string; complete: boolean; routeFilesFound: number; routeFilesScanned: number; routes: AttackSurfaceRoute[] } } };
export async function scanRepository(env: GitHubEnv, workspaceId: number, repositoryId: string, fetcher: Fetcher = fetch): Promise<RepositoryScan> {
 const repo = await repositoryFor(env, workspaceId, repositoryId);
 if (!repo.enabled) throw new Error('GITHUB_REPOSITORY_DISABLED');
 const token = await installationToken(env, repo.installation_id, repo.github_id, false, fetcher), base = repoPath(repo.full_name);
 const head = await github<{ sha: string; commit: { tree: { sha: string } } }>(`${base}/commits/${encodeURIComponent(repo.default_branch)}`, token, {}, fetcher);
 if (!/^[0-9a-f]{40}$/.test(head.sha)) throw new Error('GITHUB_COMMIT_INVALID');
 const tree = await github<{ truncated: boolean; tree: Array<{ path: string; type: string; mode: string; size?: number }> }>(`${base}/git/trees/${head.commit.tree.sha}?recursive=1`, token, {}, fetcher);
 const eligible = tree.tree.filter(f => f.type === 'blob' && f.mode !== '120000' && isSourcePath(f.path));
 eligible.sort((a, b) => Number(b.path.endsWith('package-lock.json')) - Number(a.path.endsWith('package-lock.json')) || Number(isAttackSurfaceFile(b.path)) - Number(isAttackSurfaceFile(a.path)) || a.path.localeCompare(b.path));
 const findings: RepositoryEvidence[] = [], limitations = ['Inspeção estática limitada ao commit atual. Não inclui histórico Git nem execução de testes do projeto.', 'Regras de código são heurísticas. Possíveis segredos exigem confirmação e rotação pelo responsável.'];
 const routeFilesFound = eligible.filter((file) => isAttackSurfaceFile(file.path)).length;
 const routes: AttackSurfaceRoute[] = [];
 let complete = !tree.truncated, bytes = 0, filesScanned = 0, packagesChecked = 0, routeFilesScanned = 0, unparsedDocuments = 0, routesTruncated = false;
 for (const file of eligible.slice(0, REPOSITORY_LIMITS.files)) {
  if ((file.size ?? Infinity) > REPOSITORY_LIMITS.fileBytes || bytes + (file.size ?? 0) > REPOSITORY_LIMITS.totalBytes) { complete = false; continue; }
  const source = await githubFile(token, repo.full_name, file.path, head.sha, fetcher); bytes += new TextEncoder().encode(source).byteLength; filesScanned++;
  if (isAttackSurfaceFile(file.path)) {
   routeFilesScanned++;
   const discovered = discoverAttackSurface(file.path, source);
   if (isOpenApiDocument(file.path) && !discovered.length) unparsedDocuments++;
   if (routes.length + discovered.length > MAX_ATTACK_SURFACE_ROUTES) routesTruncated = true;
   routes.push(...discovered.slice(0, MAX_ATTACK_SURFACE_ROUTES - routes.length));
  }
  const sourceFindings = await inspectSource(file.path, source);
  if (sourceFindings.length >= 20) complete = false;
  findings.push(...sourceFindings);
  if (!file.path.endsWith('package-lock.json')) continue;
  let packages;
  try { packages = lockedPackages(source); } catch { complete = false; limitations.push(`Lockfile não suportado: ${file.path}`); continue; }
  const remaining = REPOSITORY_LIMITS.packages - packagesChecked;
  if (packages.length > remaining) complete = false;
  packages = packages.slice(0, remaining); if (!packages.length) continue;
  const response = await fetcher('https://api.osv.dev/v1/querybatch', { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(20_000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queries: packages.map(p => ({ package: { ecosystem: 'npm', name: p.name }, version: p.version })) }) });
  if (!response.ok) throw new Error('REPOSITORY_ADVISORIES_UNAVAILABLE');
  const batch = await boundedJson(response) as { results?: Array<{ vulns?: Array<{ id: string }>; next_page_token?: string }> };
  if (batch.results?.length !== packages.length) throw new Error('REPOSITORY_ADVISORIES_INVALID');
  packagesChecked += packages.length;
  for (let i = 0; i < packages.length; i++) {
   if (batch.results[i].next_page_token || (batch.results[i].vulns?.length ?? 0) > 3) complete = false;
   for (const vuln of (batch.results[i].vulns ?? []).slice(0, 3)) {
    const p = packages[i]; let fixedVersion: string | null = null;
    // Fetch advisory details only for a bounded set of actionable direct dependencies.
    if (findings.filter(f => f.kind === 'dependency').length < 10 && /^[A-Za-z0-9_-]+$/.test(vuln.id)) {
     const detailResponse = await fetcher(`https://api.osv.dev/v1/vulns/${encodeURIComponent(vuln.id)}`, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
     if (detailResponse.ok) {
      const detail = await boundedJson(detailResponse, 512_000) as { affected?: Array<{ package?: { name?: string; ecosystem?: string }; ranges?: Array<{ events?: Array<{ fixed?: string }> }> }> };
      const candidates = (detail.affected ?? []).filter(a => a.package?.name === p.name && a.package.ecosystem === 'npm').flatMap(a => (a.ranges ?? []).flatMap(r => (r.events ?? []).flatMap(e => e.fixed && /^\d+\.\d+\.\d+$/.test(e.fixed) ? [e.fixed] : [])));
      fixedVersion = candidates.filter(v => v.split('.')[0] === p.version.split('.')[0] && compareVersions(v, p.version) > 0).sort(compareVersions)[0] ?? null;
     } else await detailResponse.body?.cancel();
    }
    findings.push({ fingerprint: await hashEvidence(`${file.path}:${p.location}:${vuln.id}`), kind: 'dependency', title: `${p.name}: vulnerabilidade conhecida`, severity: 'high', path: file.path, line: 1, details: { package: p.name, version: p.version, location: p.location, advisory: vuln.id, fixedVersion, url: `https://osv.dev/vulnerability/${encodeURIComponent(vuln.id)}`, recommendation: 'Atualize a dependência e execute os testes do projeto.' } });
   }
  }
 }
 if (filesScanned < eligible.length || findings.length > REPOSITORY_LIMITS.findings || routesTruncated || unparsedDocuments > 0) complete = false;
 if (!packagesChecked) limitations.push('Nenhum pacote npm com versão travada foi consultado. Outros ecossistemas ainda não são cobertos.');
 if (!complete) limitations.push('Limites de cobertura atingidos. Ausência de achado nesta execução não confirma resolução dos anteriores.');
 const attackSurfaceComplete = !tree.truncated && routeFilesScanned === routeFilesFound && !routesTruncated && unparsedDocuments === 0;
 if (!attackSurfaceComplete) limitations.push('O inventário de rotas é parcial; arquivos ou endpoints podem não ter sido inspecionados.');
 routes.sort((left, right) => ({ high: 0, medium: 1, low: 2 })[left.priority] - ({ high: 0, medium: 1, low: 2 })[right.priority] || left.route.localeCompare(right.route) || left.method.localeCompare(right.method));
 return { sha: head.sha, findings: findings.slice(0, REPOSITORY_LIMITS.findings), coverage: { version: REPOSITORY_POLICY_VERSION, complete, filesScanned, eligibleFiles: eligible.length, packagesChecked, limitations, attackSurface: { version: REPOSITORY_ATTACK_SURFACE_VERSION, complete: attackSurfaceComplete, routeFilesFound, routeFilesScanned, routes } } };
}
function compareVersions(a: string, b: string) { const av = a.split('.').map(Number), bv = b.split('.').map(Number); return av[0] - bv[0] || av[1] - bv[1] || av[2] - bv[2]; }
