import {
  OFFICIAL_SOURCE_CERTIFICATION_VERSION,
  officialSourceCertificationMetrics,
  officialSourceInventory,
  probeOfficialSourceInventory,
  validateOfficialSourceCertification,
} from "../domain/official-source-certification.ts";

const timeoutMs = Number(process.env.SOURCE_PROBE_TIMEOUT_MS ?? 12_000);
const fetcher = (url, init) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    ...init,
    signal: controller.signal,
    headers: { "User-Agent": "CBSHub-Official-Source-Recertification/1.0" },
  }).finally(() => clearTimeout(timeout));
};

const validation = validateOfficialSourceCertification();
if (!validation.passed) throw new Error(`invalid_official_source_inventory:${validation.errors.join(",")}`);

const probes = await probeOfficialSourceInventory(fetcher);
const unavailable = probes.filter((item) => item.status === "unavailable");
const pending = probes.filter((item) => item.status === "pending");
const checked = probes.filter((item) => item.status === "checked");
console.log(JSON.stringify({
  version: OFFICIAL_SOURCE_CERTIFICATION_VERSION,
  inventory: officialSourceCertificationMetrics(),
  uniqueUrls: probes.length,
  checked: checked.length,
  pending: pending.length,
  unavailable: unavailable.length,
  pendingSources: pending,
  unavailableSources: unavailable,
  sourceIdentities: officialSourceInventory.length,
}, null, 2));
