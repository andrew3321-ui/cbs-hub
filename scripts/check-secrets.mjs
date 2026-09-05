import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((file) => file && !file.startsWith(".codex-remote-attachments/") && !file.startsWith("tmp/"));
const findings = [];
const rules = [
  { name: "Cloudflare API token", pattern: /\b(?:cfat|cfut)_[A-Za-z0-9_-]{20,}\b/g },
  { name: "Mercado Pago access token", pattern: /\b(?:APP_USR-\d{10,}-\d{6}-[a-f0-9]{20,}-\d+|TEST-\d{10,}-[A-Za-z0-9_-]{20,})\b/gi },
  { name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "OpenAI API key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { name: "assigned secret", pattern: /^[ \t]*(?:OPENAI_API_KEY|MERCADO_PAGO_ACCESS_TOKEN|MERCADO_PAGO_WEBHOOK_SECRET|SECURITY_HASH_KEY|SECURITY_HASH_KEYS_PREVIOUS|CLOUDFLARE_API_TOKEN|CF_API_TOKEN)[ \t]*=[ \t]*[^\s#][^\r\n]*$/gm },
];

for (const file of tracked) {
  let content;
  try { content = readFileSync(file, "utf8"); }
  catch { continue; }
  for (const rule of rules) {
    for (const match of content.matchAll(rule.pattern)) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      findings.push({ file, line, rule: rule.name });
    }
  }
}

if (findings.length) {
  for (const finding of findings) console.error(`${finding.file}:${finding.line} — possível ${finding.rule}`);
  console.error("Valores não foram impressos. Remova o segredo do histórico e faça a rotação no provedor.");
  process.exitCode = 1;
} else {
  console.log(`Secret scan concluído: ${tracked.length} arquivos rastreados, nenhum padrão de credencial encontrado.`);
}
