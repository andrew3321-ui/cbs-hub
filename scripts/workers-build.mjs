import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const branch = process.env.WORKERS_CI_BRANCH ?? "";

if (process.env.WORKERS_CI === "1" && branch && branch !== "main") {
  throw new Error(`Deploy de preview bloqueado para a branch ${branch}. Somente main pode publicar.`);
}

for (const script of ["security:secrets", "lint", "migrations:verify", "test:unit", "build"]) {
  execFileSync(npm, ["run", script], { stdio: "inherit", cwd: resolve(".") });
}

