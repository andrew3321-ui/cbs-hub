import { createPrivateKey } from 'node:crypto';

export type GitHubEnv = {
 DB: D1Database; GITHUB_APP_ID?: string; GITHUB_APP_SLUG?: string; GITHUB_APP_PRIVATE_KEY?: string;
 GITHUB_CLIENT_ID?: string; GITHUB_CLIENT_SECRET?: string; GITHUB_WEBHOOK_SECRET?: string; PUBLIC_APP_URL?: string;
 SECURITY_REPOSITORY_QUEUE?: { send(body: { jobId: string }): Promise<void> };
};
export type Fetcher = typeof fetch;
export const githubConfigured = (env: GitHubEnv) => Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_SLUG && env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.GITHUB_WEBHOOK_SECRET);
export const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
export async function digest(value: string) {
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
export async function pkceChallenge(verifier: string) {
 const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
 return Buffer.from(bytes).toString('base64url');
}
export function publicOrigin(env: GitHubEnv) {
 const url = new URL(env.PUBLIC_APP_URL || 'https://cbshub.com.br');
 if (url.protocol !== 'https:' || url.username || url.password) throw new Error('GITHUB_CONFIGURATION_INVALID');
 return url.origin;
}
export async function boundedJson(response: Response, maxBytes = 4_000_000): Promise<unknown> {
 if (!response.body) throw new Error('GITHUB_RESPONSE_INVALID');
 const reader = response.body.getReader(); let size = 0; let text = ''; const decoder = new TextDecoder();
 try { while (true) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > maxBytes) throw new Error('GITHUB_RESPONSE_TOO_LARGE'); text += decoder.decode(item.value, { stream: true }); } }
 finally { await reader.cancel().catch(() => undefined); }
 return JSON.parse(text + decoder.decode());
}
export async function github<T>(path: string, token: string, init: RequestInit = {}, fetcher: Fetcher = fetch): Promise<T> {
 if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) throw new Error('GITHUB_PATH_INVALID');
 const response = await fetcher(`https://api.github.com${path}`, { ...init, redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'CBSHub-Repository-Security', Authorization: `Bearer ${token}`, ...init.headers } });
 if (!response.ok) { await response.body?.cancel(); throw new Error(`GITHUB_HTTP_${response.status}`); }
 if (response.status === 204) return null as T;
 return await boundedJson(response) as T;
}
export async function appJwt(env: GitHubEnv) {
 if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) throw new Error('GITHUB_NOT_CONFIGURED');
 const pem = env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n');
 const der = createPrivateKey(pem).export({ format: 'der', type: 'pkcs8' });
 const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
 const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
 const now = Math.floor(Date.now() / 1000);
 const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: env.GITHUB_APP_ID })}`;
 const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(body));
 return `${body}.${Buffer.from(signature).toString('base64url')}`;
}
export async function installationToken(env: GitHubEnv, installationId: number, repositoryId: number, write = false, fetcher: Fetcher = fetch) {
 if (!Number.isSafeInteger(installationId) || installationId < 1 || !Number.isSafeInteger(repositoryId) || repositoryId < 1) throw new Error('GITHUB_INSTALLATION_INVALID');
 const result = await github<{ token: string }>(`/app/installations/${installationId}/access_tokens`, await appJwt(env), { method: 'POST', body: JSON.stringify({ repository_ids: [repositoryId], permissions: { contents: write ? 'write' : 'read', metadata: 'read', ...(write ? { pull_requests: 'write' } : {}) } }) }, fetcher);
 if (!result.token) throw new Error('GITHUB_TOKEN_INVALID');
 return result.token;
}
export async function webhookValid(secret: string, signature: string | null, body: string) {
 if (secret.length < 32 || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
 const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
 const bytes = new Uint8Array(signature.slice(7).match(/../g)!.map(v => parseInt(v, 16)));
 return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(body));
}
export const repoPath = (name: string) => {
 if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(name) || name.includes('..')) throw new Error('GITHUB_REPOSITORY_INVALID');
 return `/repos/${name}`;
};
