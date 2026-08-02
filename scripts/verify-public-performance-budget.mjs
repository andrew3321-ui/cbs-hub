import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { publicAssetBudgets, PUBLIC_PERFORMANCE_VERSION } from "../domain/public-performance.ts";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, "dist/client/.vite/manifest.json"), "utf8"));
const selected = Object.entries(manifest).filter(([key, value]) => value.isEntry || ["app/AnalyticsBeacon.tsx", "app/WebVitalsBeacon.tsx", "app/LandingHeroShowcase.tsx"].includes(key));
const visited = new Set();
function visit(key) {
  if (visited.has(key) || !manifest[key]) return;
  visited.add(key);
  for (const dependency of manifest[key].imports ?? []) visit(dependency);
}
for (const [key] of selected) visit(key);
const jsFiles = [...visited].map((key) => manifest[key]?.file).filter((file) => file?.endsWith(".js"));
const jsBytes = (await Promise.all(jsFiles.map((file) => stat(path.join(root, "dist/client", file)).then((item) => item.size)))).reduce((sum, size) => sum + size, 0);
const emittedCss = (await readdir(path.join(root, "dist/client/assets"))).filter((file) => file.endsWith(".css"));
const cssFiles = [...new Set([...visited].flatMap((key) => manifest[key]?.css ?? []))];
if (!cssFiles.length) cssFiles.push(...emittedCss.filter((file) => file.startsWith("index-")));
const cssBytes = (await Promise.all(cssFiles.map((file) => stat(path.join(root, "dist/client", file.startsWith("assets/") ? file : `assets/${file}`)).then((item) => item.size)))).reduce((sum, size) => sum + size, 0);
const posterBytes = (await stat(path.join(root, "public/media/cbshub-overview-completo-v2-poster.jpg"))).size;
const videoBytes = (await stat(path.join(root, "public/media/cbshub-overview-completo-v2.webm"))).size;
const checks = [
  { name: "initialJavaScriptBytes", actual: jsBytes, budget: publicAssetBudgets.initialJavaScriptBytes },
  { name: "publicCssBytes", actual: cssBytes, budget: publicAssetBudgets.publicCssBytes },
  { name: "heroPosterBytes", actual: posterBytes, budget: publicAssetBudgets.heroPosterBytes },
  { name: "showcaseVideoBytes", actual: videoBytes, budget: publicAssetBudgets.showcaseVideoBytes },
].map((item) => ({ ...item, passed: item.actual <= item.budget }));
const report = { version: PUBLIC_PERFORMANCE_VERSION, generatedAt: new Date().toISOString(), jsFiles, cssFiles, checks, passed: checks.every((check) => check.passed) };
await mkdir(path.join(root, "outputs/performance"), { recursive: true });
await writeFile(path.join(root, "outputs/performance/asset-budget.json"), JSON.stringify(report, null, 2));
console.log(checks.map((check) => `${check.passed ? "PASS" : "FAIL"} ${check.name}: ${check.actual} / ${check.budget} bytes`).join("\n"));
if (!report.passed) process.exitCode = 1;
