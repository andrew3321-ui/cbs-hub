import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicIndexableRoutes } from "../domain/seo-route-policy.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDirectory = path.join(root, "dist", "client");
const wrangler = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const runtimeConfig = path.join(root, "dist", "server", "wrangler.json");
const persistenceDirectory = path.join(root, "work", `static-export-${process.pid}`);
const staticRoutes = [
  ...publicIndexableRoutes.map((route) => route.path),
  "/cadastro",
  "/entrar",
  "/recuperar-senha",
];

const hardNavigationScript = `<script data-cbshub-static-navigation>(function(){document.addEventListener("click",function(event){if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;var target=event.target instanceof Element?event.target.closest("a[href]"):null;if(!target||target.target||target.hasAttribute("download"))return;var next=new URL(target.href,location.href);if(next.origin!==location.origin||next.hash&&next.pathname===location.pathname&&next.search===location.search)return;event.preventDefault();location.assign(next.href)},true)})();</script>`;

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function destinationFor(route) {
  return route === "/"
    ? path.join(clientDirectory, "index.html")
    : path.join(clientDirectory, `${route.slice(1)}.html`);
}

async function waitForServer(baseUrl, process, logs) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (process.exitCode !== null) throw new Error(`Wrangler local encerrou antes da exportacao.\n${logs()}`);
    try {
      const response = await fetch(new URL("/", baseUrl), { headers: { Accept: "text/html" } });
      if (response.ok && response.headers.get("content-type")?.includes("text/html")) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Wrangler local nao iniciou no prazo.\n${logs()}`);
}

await Promise.all(staticRoutes.map((route) => rm(destinationFor(route), { force: true })));

const port = await availablePort();
const baseUrl = new URL(`http://127.0.0.1:${port}`);
let output = "";
const local = spawn(process.execPath, [
  wrangler,
  "dev",
  "--config", runtimeConfig,
  "--port", String(port),
  "--local",
  "--persist-to", persistenceDirectory,
  "--show-interactive-dev-session=false",
], { cwd: root, env: { ...process.env, CI: "1" }, stdio: ["ignore", "pipe", "pipe"] });
local.stdout.on("data", (chunk) => { output = `${output}${chunk}`.slice(-20_000); });
local.stderr.on("data", (chunk) => { output = `${output}${chunk}`.slice(-20_000); });

try {
  await waitForServer(baseUrl, local, () => output);
  for (const route of staticRoutes) {
    const response = await fetch(new URL(route, baseUrl), {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "CBSHub-Static-Exporter/1.0" },
      redirect: "error",
    });
    const html = await response.text();
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html") || !html.startsWith("<!DOCTYPE html>")) {
      throw new Error(`Exportacao estatica invalida para ${route}: HTTP ${response.status}`);
    }
    const destination = destinationFor(route);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, html.replace("</body>", `${hardNavigationScript}</body>`));
    console.log(`Exported ${route} -> ${path.relative(root, destination)}`);
  }
} finally {
  local.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => local.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  await rm(persistenceDirectory, { recursive: true, force: true });
}

console.log(`Static public export complete: ${staticRoutes.length} routes.`);
