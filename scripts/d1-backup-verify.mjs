import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const database = process.env.D1_DATABASE_NAME ?? "margem-clara-production";
const restoreDatabase = process.env.D1_RESTORE_TEST_DATABASE ?? "";
const restoreRequested = process.argv.includes("--restore-test");
const config = process.env.WRANGLER_CONFIG ?? "wrangler.migrations.jsonc";
const backupDirectory = resolve(process.env.D1_BACKUP_TEMP_DIR ?? ".backup-verification");
const backupFile = join(backupDirectory, `d1-${Date.now()}.sql`);
const wrangler = resolve("node_modules", "wrangler", "bin", "wrangler.js");
const requiredTables = ["users", "accounting_workspaces", "companies", "scenarios", "privacy_request_events", "security_incidents"];

mkdirSync(backupDirectory, { recursive: true });
try {
  execFileSync(process.execPath, [wrangler, "d1", "export", database, "--remote", "--skip-confirmation", "--config", config, "--output", backupFile], { stdio: "inherit" });
  const sql = readFileSync(backupFile, "utf8");
  if (sql.length < 500 || !sql.includes("CREATE TABLE")) throw new Error("backup estruturalmente vazio");
  const missing = requiredTables.filter((table) => !sql.includes(table));
  if (missing.length) throw new Error(`backup sem tabelas obrigatórias: ${missing.join(", ")}`);
  const checksum = createHash("sha256").update(sql).digest("hex");
  console.log(JSON.stringify({ event: "backup.verified", database, bytes: Buffer.byteLength(sql), sha256: checksum, tablesChecked: requiredTables.length }));

  if (restoreRequested) {
    if (!restoreDatabase || process.env.D1_RESTORE_CONFIRM !== "RESTORE_DEDICATED_TEST_DATABASE") throw new Error("restauração exige banco dedicado e confirmação explícita");
    if (restoreDatabase === database) throw new Error("o banco de restauração nunca pode ser o banco de produção");
    execFileSync(process.execPath, [wrangler, "d1", "execute", restoreDatabase, "--remote", "--yes", "--config", config, "--file", backupFile], { stdio: "inherit" });
    const result = execFileSync(process.execPath, [wrangler, "d1", "execute", restoreDatabase, "--remote", "--yes", "--json", "--config", config, "--command", "SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type='table'"], { encoding: "utf8" });
    const parsed = JSON.parse(result);
    if (!JSON.stringify(parsed).includes("table_count")) throw new Error("banco restaurado não respondeu à verificação");
    console.log(JSON.stringify({ event: "backup.restore_test_passed", sourceDatabase: database, restoreDatabase }));
  }
} finally {
  rmSync(backupDirectory, { recursive: true, force: true });
}
