import { evaluateAuthorizationLaboratory } from "../tests/fixtures/authorization-lab.mjs";

const report = await evaluateAuthorizationLaboratory();
console.log(JSON.stringify(report, null, 2));
if (report.failed) process.exitCode = 1;
