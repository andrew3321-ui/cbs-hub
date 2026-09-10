export const REPOSITORY_POLICY_VERSION = 'repository-security.2026-09-09.v1';
export const REPOSITORY_LIMITS = { files: 40, fileBytes: 512_000, totalBytes: 4_000_000, packages: 150, findings: 100 };
export type RepositoryEvidence = { fingerprint: string; kind: 'secret' | 'dependency' | 'code'; title: string; severity: 'high' | 'medium'; path: string; line: number; details: Record<string, unknown> };
export type LockedPackage = { name: string; version: string; location: string };
export const exactVersion = (v: unknown): v is string => typeof v === 'string' && /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(v);
export function lockedPackages(text: string) {
 const lock = JSON.parse(text);
 if (![2, 3].includes(lock.lockfileVersion) || !lock.packages || typeof lock.packages !== 'object') throw new Error('REPOSITORY_LOCK_UNSUPPORTED');
 const result: LockedPackage[] = [];
 for (const [location, raw] of Object.entries(lock.packages)) {
  if (!location.includes('node_modules/') || !raw || typeof raw !== 'object') continue;
  const item = raw as { version?: unknown; name?: unknown; link?: unknown; resolved?: unknown };
  const name = typeof item.name === 'string' ? item.name : location.slice(location.lastIndexOf('node_modules/') + 13);
  if (item.link || !exactVersion(item.version) || !/^(@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(name)) continue;
  if (typeof item.resolved === 'string' && !item.resolved.startsWith('https://registry.npmjs.org/')) continue;
  result.push({ name, version: item.version, location });
 }
 return result;
}
const secretRules = [
 { id: 'github_token', title: 'Possível token GitHub versionado', pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
 { id: 'github_pat', title: 'Possível token de acesso GitHub versionado', pattern: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g },
 { id: 'openai_key', title: 'Possível chave de API versionada', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/g },
 { id: 'aws_key', title: 'Possível identificador de acesso AWS versionado', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
 { id: 'private_key', title: 'Chave privada versionada', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];
export async function hashEvidence(text: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join(''); }
export async function inspectSource(path: string, text: string): Promise<RepositoryEvidence[]> {
 const findings: RepositoryEvidence[] = [];
 for (const rule of secretRules) for (const match of text.matchAll(new RegExp(rule.pattern))) {
  const line = text.slice(0, match.index).split('\n').length;
  findings.push({ fingerprint: await hashEvidence(`${path}:${rule.id}:${line}`), kind: 'secret', title: rule.title, severity: 'high', path, line, details: { rule: rule.id, evidence: 'Valor ocultado; confira o arquivo no commit analisado.', recommendation: 'Revogue ou rotacione a credencial, remova-a do código e avalie o histórico. Nenhuma credencial foi testada.' } });
  if (findings.length >= 20) return findings;
 }
 const rules = [
  { id: 'tls_verification_disabled', pattern: /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|rejectUnauthorized\s*:\s*false/g, title: 'Validação TLS desativada no código' },
  { id: 'dynamic_eval', pattern: /\beval\s*\(/g, title: 'Execução dinâmica exige revisão de entrada' },
 ];
 if (/\.(?:[cm]?[jt]sx?|py)$/.test(path)) for (const rule of rules) for (const match of text.matchAll(rule.pattern)) {
  const line = text.slice(0, match.index).split('\n').length;
  findings.push({ fingerprint: await hashEvidence(`${path}:${rule.id}:${line}`), kind: 'code', title: rule.title, severity: 'medium', path, line, details: { rule: rule.id, confidence: 'heuristic', recommendation: 'Revise o contexto e a origem dos dados. Esta indicação não comprova exploração.' } });
  if (findings.length >= 20) return findings;
 }
 return findings;
}
export function isSourcePath(path: string) {
 return path.length < 400 && !path.split('/').some(p => ['node_modules', 'vendor', 'dist', 'build', '.git'].includes(p)) && (/(?:^|\/)\.env(?:\.[\w.-]+)?$/.test(path) || /\.(?:[cm]?[jt]sx?|py|ya?ml|json|toml|ini|conf|pem|key)$/.test(path));
}
export type LeafPatch = { files: Array<{ path: string; content: string }>; validation: { recipe: string; package: string; from: string; to: string; projectTests: 'not_run'; checks: string[] } };
export function createLeafDependencyPatch(packageText: string, lockText: string, name: string, oldVersion: string, newVersion: string, metadata: Record<string, unknown>): LeafPatch {
 if (!exactVersion(oldVersion) || !exactVersion(newVersion) || oldVersion.split('.')[0] !== newVersion.split('.')[0]) throw new Error('REPOSITORY_FIX_UNSUPPORTED');
 const pkg = JSON.parse(packageText), lock = JSON.parse(lockText);
 if (![2, 3].includes(lock.lockfileVersion) || !lock.packages?.['']) throw new Error('REPOSITORY_FIX_UNSUPPORTED');
 const sections = ['dependencies', 'devDependencies', 'optionalDependencies'].filter(s => Object.hasOwn(pkg[s] ?? {}, name));
 if (sections.length !== 1 || !exactVersion(pkg[sections[0]][name]) || pkg[sections[0]][name] !== oldVersion) throw new Error('REPOSITORY_FIX_UNSUPPORTED');
 const location = `node_modules/${name}`; const entry = lock.packages[location];
 if (!entry || entry.version !== oldVersion || Object.keys(lock.packages).some(p => p !== location && p.endsWith(`/node_modules/${name}`))) throw new Error('REPOSITORY_FIX_UNSUPPORTED');
 for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) if (Object.keys(entry[field] ?? {}).length || Object.keys((metadata[field] as object) ?? {}).length) throw new Error('REPOSITORY_FIX_UNSUPPORTED');
 if (entry.hasInstallScript || metadata.scripts && Object.keys(metadata.scripts as object).some(k => ['preinstall', 'install', 'postinstall'].includes(k))) throw new Error('REPOSITORY_FIX_UNSUPPORTED');
 const dist = metadata.dist as { tarball?: string; integrity?: string } | undefined;
 if (metadata.name !== name || metadata.version !== newVersion || !dist?.tarball?.startsWith(`https://registry.npmjs.org/${name}/-/`) || !/^sha512-[A-Za-z0-9+/=]+$/.test(dist.integrity ?? '')) throw new Error('REPOSITORY_REGISTRY_METADATA_INVALID');
 if (JSON.stringify(entry.engines ?? {}) !== JSON.stringify(metadata.engines ?? {})) throw new Error('REPOSITORY_FIX_UNSUPPORTED');
 pkg[sections[0]][name] = newVersion; lock.packages[''][sections[0]][name] = newVersion;
 lock.packages[location] = { ...entry, version: newVersion, resolved: dist.tarball, integrity: dist.integrity };
 if (lock.lockfileVersion === 2) {
  if (!lock.dependencies?.[name] || lock.dependencies[name].version !== oldVersion) throw new Error('REPOSITORY_FIX_UNSUPPORTED');
  lock.dependencies[name] = { ...lock.dependencies[name], version: newVersion, resolved: dist.tarball, integrity: dist.integrity };
 }
 return { files: [{ path: 'package.json', content: JSON.stringify(pkg, null, 2) + '\n' }, { path: 'package-lock.json', content: JSON.stringify(lock, null, 2) + '\n' }], validation: { recipe: 'npm-pinned-leaf-v1', package: name, from: oldVersion, to: newVersion, projectTests: 'not_run', checks: ['Versão direta fixada', 'Mesma versão principal', 'Sem dependências adicionais ou scripts de instalação', 'Integridade obtida no registro npm', 'JSON e lockfile consistentes'] } };
}
