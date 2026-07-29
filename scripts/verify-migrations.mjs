import { readdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const directory = resolve("drizzle");
const journalPath = resolve(directory, "meta", "_journal.json");
const files = readdirSync(directory)
  .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(name))
  .sort();
const journal = JSON.parse(readFileSync(journalPath, "utf8"));
const entries = Array.isArray(journal.entries) ? journal.entries : [];

if (!files.length) throw new Error("Nenhuma migration SQL versionada foi encontrada.");
if (files.length !== entries.length) {
  throw new Error(`Journal e migrations divergentes: ${entries.length} entradas para ${files.length} arquivos.`);
}

for (let index = 0; index < files.length; index += 1) {
  const expectedPrefix = String(index).padStart(4, "0");
  const file = files[index];
  const entry = entries[index];
  if (!file.startsWith(`${expectedPrefix}_`) || entry.idx !== index) {
    throw new Error(`Sequência de migrations interrompida no índice ${index}.`);
  }
  if (basename(file, ".sql") !== entry.tag) {
    throw new Error(`Migration ${file} não corresponde ao journal (${entry.tag ?? "sem tag"}).`);
  }
  const sql = readFileSync(resolve(directory, file), "utf8").trim();
  if (!sql) throw new Error(`Migration vazia: ${file}.`);
  if (/\bDROP\s+(?:TABLE|COLUMN)\b/i.test(sql) && !/PRAGMA\s+defer_foreign_keys/i.test(sql)) {
    throw new Error(`Migration destrutiva sem ensaio explícito de integridade: ${file}.`);
  }
}

const duplicatedTags = entries
  .map((entry) => entry.tag)
  .filter((tag, index, all) => all.indexOf(tag) !== index);
if (duplicatedTags.length) throw new Error(`Tags duplicadas: ${duplicatedTags.join(", ")}.`);

console.log(JSON.stringify({
  event: "migrations.verified",
  count: files.length,
  latest: files.at(-1),
  tracking: "d1_migrations",
}));

