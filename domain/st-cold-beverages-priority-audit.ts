import { ST_COLD_BEVERAGE_PRODUCTS, type ColdBeverageProductCode } from "./st-cold-beverages-priority.ts";
import { ST_COLD_BEVERAGES_SP_PMPF_PROFILES } from "./st-cold-beverages-sp-destination.ts";
import { ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES } from "./st-cold-beverages-sp-origin.ts";
import { ST_COLD_BEVERAGES_SC_PMPF_PROFILES } from "./st-cold-beverages-sc-destination.ts";

export const ST_COLD_BEVERAGES_PRIORITY_AUDIT_VERSION = "2026.07.31-v91";
export const ST_COLD_BEVERAGES_PRIORITY_AUDIT_CHECKED_AT = "2026-07-31";
export const ST_COLD_BEVERAGES_AUDITED_CORRIDORS = ["SP-MG", "SP-RJ", "SP-PR", "SP-SC", "SP-RS", "SP-BA", "SP-GO", "SP-ES"] as const;
export const ST_COLD_BEVERAGES_AUDIT_MUTATIONS = ["brand", "package", "volume", "regime", "interdependence", "validity"] as const;

const directedRoutes = ST_COLD_BEVERAGES_AUDITED_CORRIDORS.flatMap((corridor) => {
  const [first, second] = corridor.split("-");
  return [`${first}-${second}`, `${second}-${first}`];
});
const productByCode = new Map(ST_COLD_BEVERAGE_PRODUCTS.map((product) => [product.code, product]));
const spDestinationProductCodes = new Set(ST_COLD_BEVERAGES_SP_PMPF_PROFILES.map((profile) => profile.productCode));
const scProductCodes = new Set(ST_COLD_BEVERAGES_SC_PMPF_PROFILES.map((profile) => profile.productCode));
const cestToProductCode = new Map(ST_COLD_BEVERAGE_PRODUCTS.map((product) => [product.cest, product.code]));

function outboundProductCodes(destination: string) {
  return new Set(ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES
    .filter((profile) => profile.destination === destination)
    .map((profile) => cestToProductCode.get(profile.cest))
    .filter((code): code is ColdBeverageProductCode => Boolean(code)));
}

export type ColdBeveragePriorityAuditCell = {
  key: string;
  corridor: string;
  route: string;
  productCode: ColdBeverageProductCode;
  status: "supported" | "not_supported";
  exactProfileCount: number;
  sourceModule: "sp_destination" | "sp_origin" | "sc_destination" | null;
  sourceCodes: string[];
  resolution: string;
  blocker: string | null;
};

function classify(route: string, productCode: ColdBeverageProductCode): Omit<ColdBeveragePriorityAuditCell, "key" | "corridor" | "route" | "productCode"> {
  const [origin, destination] = route.split("-");
  if (destination === "SP" && productCode !== "WATER_GLASS" && spDestinationProductCodes.has(productCode)) {
    return { status: "supported", exactProfileCount: ST_COLD_BEVERAGES_SP_PMPF_PROFILES.filter((profile) => profile.productCode === productCode).length, sourceModule: "sp_destination", sourceCodes: ["SP-SRE-27-2026-BEVERAGES", "CONFAZ-PROTOCOL-11-1991"], resolution: "Somente os perfis exatos da pauta paulista calculam; demais marca/embalagem/volume falham fechados.", blocker: null };
  }
  if (origin === "SP" && (destination === "MG" || destination === "RJ") && outboundProductCodes(destination).has(productCode)) {
    return { status: "supported", exactProfileCount: ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.filter((profile) => profile.destination === destination && cestToProductCode.get(profile.cest) === productCode).length, sourceModule: "sp_origin", sourceCodes: destination === "MG" ? ["MG-SAIF-93-2026", "MG-RICMS-ANNEX-VII-ART-58"] : ["RJ-RESOLUTION-358-2018", "RJ-SUBEREC-433-2025"], resolution: "Somente os perfis exatos congelados para o destino calculam; fallback ainda não é herdado.", blocker: null };
  }
  if (route === "SP-SC" && productCode !== "WATER_GLASS" && scProductCodes.has(productCode)) {
    return { status: "supported", exactProfileCount: ST_COLD_BEVERAGES_SC_PMPF_PROFILES.filter((profile) => profile.productCode === productCode).length, sourceModule: "sc_destination", sourceCodes: ["SC-ATO-DIAT-12-2026", "SC-RICMS-ANNEX-1A-BEVERAGES", "SC-RICMS-ANNEX-3-ART-42"], resolution: "Perfil exato usa PMPF abaixo da trava de 90% e MVA de fallback conforme o papel do remetente.", blocker: null };
  }
  const product = productByCode.get(productCode)!;
  const water = product.family === "water";
  return {
    status: "not_supported", exactProfileCount: 0, sourceModule: null, sourceCodes: ["CONFAZ-PROTOCOL-11-1991"],
    resolution: "Nenhum valor é emitido para esta célula.",
    blocker: water ? "Água exige tratamento estadual próprio e está fora do recorte de bebidas frias controlado nas rotas envolvendo São Paulo em 2026." : `Falta congelar pauta/PMPF ou MVA, alíquota interna, FCP e vigência próprios de ${destination}; parâmetros de outro destino não são reutilizados.`,
  };
}

export const stColdBeveragePriorityAuditCells: ColdBeveragePriorityAuditCell[] = directedRoutes.flatMap((route) => {
  const reverse = route.split("-").reverse().join("-");
  const corridor = ST_COLD_BEVERAGES_AUDITED_CORRIDORS.find((item) => item === route || item === reverse)!;
  return ST_COLD_BEVERAGE_PRODUCTS.map((product) => ({ key: `${route}:${product.code}`, corridor, route, productCode: product.code, ...classify(route, product.code) }));
});

export const stColdBeveragePriorityAuditCases = stColdBeveragePriorityAuditCells.flatMap((cell) => {
  if (cell.status === "not_supported") return [{ key: `${cell.key}:baseline`, cellKey: cell.key, kind: "unsupported_baseline" as const, expected: "blocked" as const, emittedValue: false }];
  return [
    { key: `${cell.key}:positive`, cellKey: cell.key, kind: "positive" as const, expected: "profile_required" as const, emittedValue: false },
    ...ST_COLD_BEVERAGES_AUDIT_MUTATIONS.map((mutation) => ({ key: `${cell.key}:${mutation}`, cellKey: cell.key, kind: mutation, expected: "blocked" as const, emittedValue: false })),
  ];
});

export function stColdBeveragePriorityAuditMetrics() {
  const supported = stColdBeveragePriorityAuditCells.filter((cell) => cell.status === "supported").length;
  return { corridors: ST_COLD_BEVERAGES_AUDITED_CORRIDORS.length, directedRoutes: directedRoutes.length, products: ST_COLD_BEVERAGE_PRODUCTS.length, cells: stColdBeveragePriorityAuditCells.length, supported, notSupported: stColdBeveragePriorityAuditCells.length - supported, deterministicCases: stColdBeveragePriorityAuditCases.length, negativeGates: stColdBeveragePriorityAuditCases.filter((item) => item.expected === "blocked").length };
}

export function validateStColdBeveragePriorityAudit() {
  const errors: string[] = [];
  const metrics = stColdBeveragePriorityAuditMetrics();
  if (metrics.corridors !== 8 || metrics.directedRoutes !== 16 || metrics.products !== 6 || metrics.cells !== 96) errors.push("beverage_priority_audit_scope_invalid");
  if (new Set(stColdBeveragePriorityAuditCells.map((cell) => cell.key)).size !== 96) errors.push("beverage_priority_audit_cells_not_unique");
  if (metrics.supported !== 53 || metrics.notSupported !== 43) errors.push("beverage_priority_audit_resolution_drifted");
  if (stColdBeveragePriorityAuditCells.some((cell) => cell.status === "supported" ? cell.exactProfileCount < 1 || !cell.sourceModule || Boolean(cell.blocker) : cell.exactProfileCount !== 0 || !cell.blocker)) errors.push("beverage_priority_audit_cell_inconsistent");
  if (stColdBeveragePriorityAuditCases.some((item) => item.emittedValue)) errors.push("beverage_priority_audit_case_leaked_value");
  for (const cell of stColdBeveragePriorityAuditCells.filter((item) => item.status === "supported")) {
    const mutations = new Set(stColdBeveragePriorityAuditCases.filter((item) => item.cellKey === cell.key).map((item) => item.kind));
    for (const required of ["positive", ...ST_COLD_BEVERAGES_AUDIT_MUTATIONS]) if (!mutations.has(required)) errors.push(`beverage_priority_audit_missing_${required}:${cell.key}`);
  }
  return { passed: errors.length === 0, errors };
}

export async function hashStColdBeveragePriorityAudit() {
  const payload = JSON.stringify({ version: ST_COLD_BEVERAGES_PRIORITY_AUDIT_VERSION, corridors: ST_COLD_BEVERAGES_AUDITED_CORRIDORS, cells: stColdBeveragePriorityAuditCells, cases: stColdBeveragePriorityAuditCases });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
