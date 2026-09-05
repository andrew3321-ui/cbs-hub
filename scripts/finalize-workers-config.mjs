import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const generatedPath = path.join(root, "dist", "server", "wrangler.json");
const productionPath = path.join(root, "wrangler.migrations.jsonc");

const [generatedSource, productionSource] = await Promise.all([
  readFile(generatedPath, "utf8"),
  readFile(productionPath, "utf8"),
]);

const generated = JSON.parse(generatedSource);
const production = JSON.parse(productionSource);
const productionDatabase = production.d1_databases?.find((database) => database.binding === "DB");

if (!production.name || !production.compatibility_date || !productionDatabase?.database_id) {
  throw new Error("Configuracao canonica de producao incompleta.");
}
if (/^0{8}-0{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-0{12}$/i.test(productionDatabase.database_id)) {
  throw new Error("O binding DB canonico ainda aponta para o identificador local ficticio.");
}

generated.name = production.name;
generated.compatibility_date = production.compatibility_date;
generated.workers_dev = false;
generated.preview_urls = false;
generated.version_metadata = production.version_metadata ?? generated.version_metadata;
generated.queues = production.queues ?? generated.queues;
generated.d1_databases = [{
  binding: "DB",
  database_name: productionDatabase.database_name,
  database_id: productionDatabase.database_id,
}];

await writeFile(generatedPath, `${JSON.stringify(generated)}\n`);
console.log(`Workers config finalized for ${generated.name} with production D1 ${productionDatabase.database_name}.`);
