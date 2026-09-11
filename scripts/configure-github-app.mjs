import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const required = ['GITHUB_APP_ID', 'GITHUB_APP_SLUG', 'GITHUB_APP_PRIVATE_KEY', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_WEBHOOK_SECRET'];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) throw new Error(`Configure no ambiente seguro: ${missing.join(', ')}. Valores não devem ser enviados ao Git.`);
if (process.env.GITHUB_WEBHOOK_SECRET.length < 32) throw new Error('O segredo do webhook precisa de pelo menos 32 caracteres.');
const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
for (const config of ['wrangler.jsonc', 'repository-runner/wrangler.jsonc']) {
 const names = config.startsWith('repository-runner') ? ['GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY'] : required;
 const secrets = Object.fromEntries(names.map(name => [name, process.env[name]]));
 const result = spawnSync(process.execPath, [wrangler, 'secret', 'bulk', '--config', config], { input: JSON.stringify(secrets), encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] });
 if (result.status !== 0) throw new Error(`Configuração interrompida em ${config}.`);
}
console.log('GitHub App configurada. Instale a App em um repositório de teste e complete a conexão pelo painel.');
