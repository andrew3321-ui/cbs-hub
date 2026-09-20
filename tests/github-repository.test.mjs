import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { inspectSource, lockedPackages, createLeafDependencyPatch } from '../domain/repository-security.ts';
import { appJwt, pkceChallenge, webhookValid } from '../app/github-client.ts';
import { startGitHubConnection, finishGitHubConnection, enqueueRepositoryScan, publishRepositoryFix, repositoryFor } from '../app/github-repository-service.ts';
import { scanRepository } from '../repository-runner/scanner.ts';
import { processRepositoryJob } from '../repository-runner/worker.ts';
import { receiveGitHubWebhook } from '../app/github-webhook-service.ts';
import { reviewCampaignSignal } from '../app/security-impact-service.ts';
import { selectImpactPaths, summarizeImpactSource, validateImpactAssessment } from '../domain/security-impact-policy.ts';
import { discoverOpenApiRoutes, discoverWebRoutes, isWebRouteFile } from '../domain/repository-attack-surface.ts';

function database() {
 const sqlite = new DatabaseSync(':memory:'); sqlite.exec(readFileSync(new URL('../drizzle/0063_github_repository_security.sql', import.meta.url), 'utf8')); sqlite.exec(readFileSync(new URL('../drizzle/0064_security_ai_impact_reviews.sql', import.meta.url), 'utf8'));
 const DB = { prepare(sql) { const stmt = sqlite.prepare(sql); const bound = values => ({ first: async () => stmt.get(...values) ?? null, all: async () => ({ results: stmt.all(...values) }), run: async () => ({ meta: { changes: Number(stmt.run(...values).changes) } }) }); return { ...bound([]), bind: (...values) => bound(values) }; }, batch: async statements => { sqlite.exec('BEGIN'); try { const rows = []; for (const s of statements) rows.push(await s.run()); sqlite.exec('COMMIT'); return rows; } catch(e) { sqlite.exec('ROLLBACK'); throw e; } } };
 return { sqlite, DB };
}
function seed(sqlite) {
 const now = new Date().toISOString();
 sqlite.prepare("INSERT INTO github_connections VALUES ('connection',42,123,'acme','active',7,?,?)").run(now, now);
 sqlite.prepare("INSERT INTO security_repositories (id,workspace_id,connection_id,github_id,full_name,default_branch,enabled,monitoring_enabled,authorized_until,created_at,updated_at) VALUES ('repo',42,'connection',987,'acme/portal','main',1,1,?,?,?)").run(new Date(Date.now()+86400000).toISOString(), now, now);
}
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const configured = { GITHUB_APP_ID: '12', GITHUB_APP_SLUG: 'cbshub-test', GITHUB_APP_PRIVATE_KEY: pair.privateKey.export({ type:'pkcs8',format:'pem' }), GITHUB_CLIENT_ID:'client-id', GITHUB_CLIENT_SECRET:'client-secret-test', GITHUB_WEBHOOK_SECRET:'webhook-secret-test-with-thirty-two-characters' };
const sha = 'a'.repeat(40), treeSha = 'b'.repeat(40);
const pkg = { name:'test', dependencies: { 'safe-leaf':'1.0.0' } };
const lock = { lockfileVersion:3, packages: { '':{ dependencies:{'safe-leaf':'1.0.0'} }, 'node_modules/safe-leaf': { version:'1.0.0',resolved:'https://registry.npmjs.org/safe-leaf/-/safe-leaf-1.0.0.tgz',integrity:'sha512-old' } } };
const metadata = { name:'safe-leaf', version:'1.0.1', dist:{tarball:'https://registry.npmjs.org/safe-leaf/-/safe-leaf-1.0.1.tgz',integrity:'sha512-YWJjZA=='} };

test('impact context is bounded, redacts literals, and rejects invented file citations', () => {
 const paths=selectImpactPaths([{path:'src/cors.ts',type:'blob',size:100},{path:'node_modules/cors.ts',type:'blob',size:100},{path:'src/huge.ts',type:'blob',size:90000}], 'cors_wildcard');
 assert.deepEqual(paths,[{path:'src/cors.ts',size:100}]);
 const secret='gh'+'p_'+'A'.repeat(36);
 const source=summarizeImpactSource('src/cors.ts',`export const cors = '${secret}';`, 'cors_wildcard');
 assert.equal(JSON.stringify(source).includes(secret),false);
 assert.throws(()=>validateImpactAssessment({confidence:'high',hypothesis:'Check CORS',relevantFiles:[{path:'src/other.ts',line:1,reason:'guess'}],affectedAreas:[],proposedChanges:[],tests:[],limitations:[]},[source]),/REPOSITORY_IMPACT_OUTPUT_INVALID/);
});

test('verified campaign signal maps to immutable read-only code context with a strict token budget', async () => {
 const {sqlite,DB}=database();seed(sqlite);
 sqlite.exec("CREATE TABLE security_agent_scopes (id text, workspace_id integer, domain text, status text, authorization_expires_at text); CREATE TABLE security_campaigns (id text, workspace_id integer, scope_id text, status text, executor text, runner_result_json text)");
 sqlite.prepare("INSERT INTO security_agent_scopes VALUES ('scope',42,'portal.example','verified',?)").run(new Date(Date.now()+86400000).toISOString());
 sqlite.prepare("INSERT INTO security_campaigns VALUES ('campaign',42,'scope','completed','isolated_runner',?)").run(JSON.stringify({webProbe:{signals:[{code:'cors_wildcard'}]}}));
 const secret='gh'+'p_'+'B'.repeat(36);const calls=[];let aiCalls=0;
 const env={...configured,DB,OPENAI_API_KEY:'test-key',OPENAI_SECURITY_PRIMARY_MODEL:'gpt-5.6-terra'};
 const fetcher=async (input,init={})=>{const url=String(input);calls.push({url,init});
  if(url.endsWith('/access_tokens')){assert.equal(JSON.parse(init.body).permissions.contents,'read');return Response.json({token:'read-token'});}
  if(url.endsWith('/commits/main'))return Response.json({sha,commit:{tree:{sha:treeSha}}});
  if(url.includes('/git/trees/'))return Response.json({truncated:false,tree:[{path:'src/cors.ts',type:'blob',mode:'100644',size:100}]});
  if(url.includes('/contents/')){assert.ok(url.endsWith(`?ref=${sha}`));const source=`export const cors = '${secret}';`;return Response.json({content:Buffer.from(source).toString('base64'),encoding:'base64',size:source.length});}
  if(url.includes('api.openai.com')){aiCalls++;const body=JSON.parse(init.body);assert.equal(body.store,false);assert.equal(body.max_output_tokens,1800);assert.equal(body.tools,undefined);assert.equal(JSON.stringify(body).includes(secret),false);return Response.json({status:'completed',output_text:JSON.stringify({confidence:'low',hypothesis:'CORS may be configured here',relevantFiles:[{path:'src/cors.ts',line:1,reason:'CORS setting'}],affectedAreas:['HTTP responses'],proposedChanges:['Review origin allowlist'],tests:['Verify allowed and denied origins'],limitations:['Header alone does not prove a data exposure']}),usage:{input_tokens:150,output_tokens:100,total_tokens:250}});}
  throw new Error(url);
 };
 try {
  await assert.rejects(reviewCampaignSignal(env,42,7,{repositoryId:'repo',campaignId:'campaign',signalCode:'cors_wildcard',relationshipConfirmed:false},fetcher),/AUTHORIZATION_REQUIRED/);
  const input={repositoryId:'repo',campaignId:'campaign',signalCode:'cors_wildcard',relationshipConfirmed:true};
  const result=await reviewCampaignSignal(env,42,7,input,fetcher);assert.equal(result.status,'completed');assert.equal(result.usage.total,250);
  assert.equal((await reviewCampaignSignal(env,42,7,input,fetcher)).reviewId,result.reviewId);assert.equal(aiCalls,1);
  assert.equal(sqlite.prepare('SELECT result_json FROM security_ai_impact_reviews').get().result_json.includes(secret),false);
  assert.ok(calls.every(call=>!['PATCH','PUT','DELETE'].includes(call.init.method)));
 } finally {sqlite.close();}
});

test('secret evidence never contains the discovered credential and records location', async () => {
 const secret = 'gh' + 'p_' + 'A'.repeat(36);
 const findings = await inspectSource('src/config.ts', `// config\nconst api = '${secret}';\n`);
 assert.equal(findings.length,1); assert.equal(findings[0].line,2); assert.equal(findings[0].kind,'secret'); assert.equal(JSON.stringify(findings).includes(secret),false);
 assert.equal((await inspectSource('src/network.ts','const options = {rejectUnauthorized: false}')).length,1);
});
test('route inventory prioritizes review of mutating and privileged endpoints without asserting exposure', () => {
 const source = 'export async function GET() { return Response.json({ ok: true }); }\nexport const PATCH = handler;';
 assert.deepEqual(discoverWebRoutes('src/app/api/(private)/users/[id]/route.ts', source).map(({ route, method, line, priority }) => ({ route, method, line, priority })), [
  { route: '/api/users/:id', method: 'GET', line: 1, priority: 'high' },
  { route: '/api/users/:id', method: 'PATCH', line: 2, priority: 'high' },
 ]);
 assert.equal(discoverWebRoutes('pages/api/webhook.ts', 'export default function handler(req) {}')[0].checks[0], 'Validar assinatura ou state');
 assert.equal(discoverWebRoutes('pages/api/health/index.ts', 'export default function handler(req) {}')[0].route, '/api/health');
 assert.deepEqual(discoverWebRoutes('node_modules/app/api/admin/route.ts', source), []);
 assert.equal(isWebRouteFile('src/app/api/route.ts'), true);
 assert.equal(discoverWebRoutes('src/app/api/route.ts', 'export { GET, POST } from "./handlers";').length, 2);
 const openapi=JSON.stringify({openapi:'3.0.3',paths:{'/v1/accounts/{id}':{get:{},delete:{}},'/health':{get:{}}}});
 assert.deepEqual(discoverOpenApiRoutes('docs/openapi.json',openapi).map(({route,method})=>({route,method})),[
  {route:'/v1/accounts/:id',method:'GET'}, {route:'/v1/accounts/:id',method:'DELETE'}, {route:'/health',method:'GET'},
 ]);
 assert.deepEqual(discoverOpenApiRoutes('docs/openapi.json','{"openapi":"3.0.3","paths":"invalid"}'),[]);
});
test('dependency recipe only updates pinned leaf versions and keeps package-lock aligned', () => {
 assert.deepEqual(lockedPackages(JSON.stringify(lock)),[{name:'safe-leaf',version:'1.0.0',location:'node_modules/safe-leaf'}]);
 const patch = createLeafDependencyPatch(JSON.stringify(pkg),JSON.stringify(lock),'safe-leaf','1.0.0','1.0.1',metadata);
 assert.equal(JSON.parse(patch.files[0].content).dependencies['safe-leaf'],'1.0.1');
 assert.equal(JSON.parse(patch.files[1].content).packages['node_modules/safe-leaf'].integrity,metadata.dist.integrity);
 assert.equal(patch.validation.projectTests,'not_run');
 for (const bad of [{...metadata,dependencies:{extra:'1.0.0'}},{...metadata,scripts:{postinstall:'something'}},{...metadata,version:'2.0.0'},{...metadata,dist:{tarball:'https://attacker.test/archive',integrity:'sha512-YWJjZA=='}}]) assert.throws(()=>createLeafDependencyPatch(JSON.stringify(pkg),JSON.stringify(lock),'safe-leaf','1.0.0','1.0.1',bad));
 assert.throws(()=>createLeafDependencyPatch(JSON.stringify({...pkg,dependencies:{'safe-leaf':'^1.0.0'}}),JSON.stringify(lock),'safe-leaf','1.0.0','1.0.1',metadata));
});
test('GitHub app JWT has a short lifetime and installation OAuth is single-use and user-bound', async () => {
 const {sqlite,DB}=database(); const env={...configured,DB};
 try {
  const jwt=await appJwt(env), payload=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url')); assert.ok(payload.exp-payload.iat<=600); assert.equal(payload.iss,'12');
  const {url}=await startGitHubConnection(env,42,7); const authorize=new URL(url), state=authorize.searchParams.get('state');
  assert.equal(authorize.searchParams.get('code_challenge_method'),'S256'); assert.equal(authorize.searchParams.get('code_challenge'),await pkceChallenge(state));
  await assert.rejects(finishGitHubConnection(env,42,8,'code',state,async()=>{throw new Error('should not fetch');}),/GITHUB_OAUTH_INVALID/);
  const fetcher=async (input,init={})=>{ const url=String(input); assert.equal(init.redirect,'manual'); if(url.includes('/access_token')){assert.equal(init.headers['Content-Type'],'application/x-www-form-urlencoded');const form=new URLSearchParams(init.body);assert.equal(form.get('client_id'),configured.GITHUB_CLIENT_ID);assert.equal(form.get('client_secret'),configured.GITHUB_CLIENT_SECRET);assert.equal(form.get('code_verifier'),state);return Response.json({access_token:'ephemeral-user-token'});} if(url.endsWith('/user/installations?per_page=30&page=1'))return Response.json({installations:[{id:123,app_id:12,account:{login:'acme'}}]}); if(url.includes('/repositories?'))return Response.json({repositories:[{id:987,full_name:'acme/portal',default_branch:'main',permissions:{admin:true}},{id:988,full_name:'acme/foreign',default_branch:'main',permissions:{admin:false}}]}); throw new Error(url); };
  assert.deepEqual(await finishGitHubConnection(env,42,7,'code',state,fetcher),{repositories:1});
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM security_repositories').get().n,1);
  assert.equal(sqlite.prepare('SELECT enabled FROM security_repositories').get().enabled,0);
  await assert.rejects(finishGitHubConnection(env,42,7,'code',state,fetcher),/GITHUB_OAUTH_INVALID/);
 } finally {sqlite.close();}
});
test('GitHub connection preserves a safe stage when a provider response is malformed', async () => {
 const {sqlite,DB}=database(); const env={...configured,DB};
 try {
  const first=new URL((await startGitHubConnection(env,42,7)).url).searchParams.get('state');
  await assert.rejects(finishGitHubConnection(env,42,7,'code',first,async()=>{throw new TypeError('provider transport detail');}),/GITHUB_OAUTH_NETWORK_FAILED/);
  const second=new URL((await startGitHubConnection(env,42,7)).url).searchParams.get('state');
  const fetcher=async input=>String(input).includes('/access_token')?Response.json({access_token:'ephemeral-user-token'}):Response.json({unexpected:[]});
  await assert.rejects(finishGitHubConnection(env,42,7,'code',second,fetcher),/GITHUB_INSTALLATION_RESPONSE_INVALID/);
 } finally {sqlite.close();}
});
test('repository scanning pins content to a commit and queries only package metadata',async()=>{
 const {sqlite,DB}=database(); seed(sqlite); const env={...configured,DB}; const urls=[];
 try {
  const fetcher=async (input,init={})=>{ const url=String(input);urls.push(url);
   if(url.endsWith('/access_tokens')) {assert.equal(JSON.parse(init.body).permissions.contents,'read');assert.deepEqual(JSON.parse(init.body).repository_ids,[987]);return Response.json({token:'short-install-token'});}
   if(url.endsWith('/commits/main'))return Response.json({sha,commit:{tree:{sha:treeSha}}});
   if(url.includes('/git/trees/'))return Response.json({truncated:false,tree:[{path:'package-lock.json',type:'blob',mode:'100644',size:1000},{path:'src/index.ts',type:'blob',mode:'100644',size:200},{path:'src/app/api/admin/users/route.ts',type:'blob',mode:'100644',size:200},{path:'docs/openapi.json',type:'blob',mode:'100644',size:150}]});
   if(url.includes('/contents/')){assert.ok(url.endsWith(`?ref=${sha}`));const text=url.includes('package-lock')?JSON.stringify(lock):url.includes('/admin/users/')?'export async function POST() { return new Response(); }':url.includes('openapi.json')?JSON.stringify({openapi:'3.0.3',paths:{'/v1/accounts/{id}':{get:{}}}}):'const x = 1';return Response.json({content:Buffer.from(text).toString('base64'),encoding:'base64',size:text.length});}
   if(url.endsWith('/querybatch')) {const body=JSON.parse(init.body);assert.deepEqual(body.queries,[{package:{ecosystem:'npm',name:'safe-leaf'},version:'1.0.0'}]);return Response.json({results:[{vulns:[{id:'GHSA-test-1234'}]}]});}
   if(url.includes('/vulns/'))return Response.json({affected:[{package:{name:'safe-leaf',ecosystem:'npm'},ranges:[{events:[{fixed:'1.0.1'}]}]}]});
   throw new Error(url);
  };
  const result=await scanRepository(env,42,'repo',fetcher);assert.equal(result.sha,sha);assert.equal(result.coverage.complete,true);assert.equal(result.findings[0].details.fixedVersion,'1.0.1');assert.equal(result.coverage.attackSurface.routes[0].route,'/api/admin/users');assert.equal(result.coverage.attackSurface.routes[0].method,'POST');assert.equal(result.coverage.attackSurface.routes.length,2);assert.ok(urls.every(u=>u.startsWith('https://api.github.com/')||u.startsWith('https://api.osv.dev/')));
  await assert.rejects(repositoryFor(env,99,'repo'),/NOT_AUTHORIZED/);
 } finally {sqlite.close();}
});
test('job lifecycle is idempotent and partial scans cannot resolve previous findings',async()=>{
 const {sqlite,DB}=database();seed(sqlite);const queued=[];const env={...configured,DB,SECURITY_REPOSITORY_QUEUE:{send:async v=>queued.push(v)}};
 try{
  const first=await enqueueRepositoryScan(env,42,'repo',7); await enqueueRepositoryScan(env,42,'repo',7,'push');assert.equal(queued.length,1);assert.equal(sqlite.prepare('SELECT rescan_requested FROM security_repositories').get().rescan_requested,1);
  const f={fingerprint:'fingerprint',kind:'secret',title:'Possible token',severity:'high',path:'a.ts',line:1,details:{evidence:'redacted'}};
  const result={sha,findings:[f],coverage:{complete:true}};
  await processRepositoryJob(env,first.jobId,async()=>result);await processRepositoryJob(env,first.jobId,async()=>{throw new Error('duplicate execution');});
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM security_repository_findings').get().n,1);
  const second=await enqueueRepositoryScan(env,42,'repo',7);await processRepositoryJob(env,second.jobId,async()=>({...result,findings:[],coverage:{complete:false}}));assert.equal(sqlite.prepare('SELECT status FROM security_repository_findings').get().status,'open');
  const third=await enqueueRepositoryScan(env,42,'repo',7);await processRepositoryJob(env,third.jobId,async()=>({...result,findings:[]}));assert.equal(sqlite.prepare('SELECT status FROM security_repository_findings').get().status,'resolved');
 } finally {sqlite.close();}
});
test('signed webhook revocation disables repositories and rejects tampering',async()=>{
 const {sqlite,DB}=database();seed(sqlite);const env={...configured,DB};
 try{
  const body=JSON.stringify({installation:{id:123},action:'deleted'});const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.GITHUB_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature='sha256='+Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body))).toString('hex');
  assert.equal(await webhookValid(env.GITHUB_WEBHOOK_SECRET,signature,body+' '),false);
  const request=()=>new Request('https://cbshub.com.br/api/github/webhook',{method:'POST',headers:{'x-hub-signature-256':signature,'x-github-event':'installation','x-github-delivery':'delivery-test-1234'},body});
  assert.equal((await receiveGitHubWebhook(env,request())).status,200);assert.equal(sqlite.prepare('SELECT enabled FROM security_repositories').get().enabled,0);assert.equal(sqlite.prepare('SELECT status FROM github_connections').get().status,'revoked');assert.equal((await (await receiveGitHubWebhook(env,request())).json()).duplicate,true);
 } finally{sqlite.close();}
});
test('approved fixes create draft PRs on a dedicated branch, never update the default branch',async()=>{
 const {sqlite,DB}=database();seed(sqlite);const env={...configured,DB};const writes=[];
 try{
  const patch=createLeafDependencyPatch(JSON.stringify(pkg),JSON.stringify(lock),'safe-leaf','1.0.0','1.0.1',metadata);const now=new Date().toISOString();
  sqlite.prepare("INSERT INTO security_repository_fixes (id,workspace_id,repository_id,finding_id,base_sha,status,patch_json,validation_json,created_at,updated_at) VALUES ('fix',42,'repo','finding',?,'draft',?,?,?,?)").run(sha,JSON.stringify(patch.files),JSON.stringify(patch.validation),now,now);
  const fetcher=async(input,init={})=>{const url=String(input);if(url.endsWith('/access_tokens'))return Response.json({token:'scoped-write-token'});if(url.endsWith('/commits/main'))return Response.json({sha,commit:{tree:{sha:treeSha}}});writes.push({url,method:init.method,body:JSON.parse(init.body)});if(url.endsWith('/git/trees')||url.endsWith('/git/commits'))return Response.json({sha:'c'.repeat(40)});if(url.endsWith('/git/refs'))return Response.json({ref:'refs/heads/cbshub/security-fix'});if(url.endsWith('/pulls'))return Response.json({html_url:'https://github.com/acme/portal/pull/1',number:1});throw new Error(url);};
  assert.equal((await publishRepositoryFix(env,42,'fix',7,fetcher)).url,'https://github.com/acme/portal/pull/1');
  assert.equal(writes.find(w=>w.url.endsWith('/pulls')).body.draft,true);assert.equal(writes.find(w=>w.url.endsWith('/git/refs')).body.ref,'refs/heads/cbshub/security-fix');assert.ok(writes.every(w=>w.method==='POST'));assert.equal(sqlite.prepare('SELECT patch_json FROM security_repository_fixes').get().patch_json,'[]');
  await assert.rejects(publishRepositoryFix(env,42,'fix',7,fetcher));
 }finally{sqlite.close();}
});
