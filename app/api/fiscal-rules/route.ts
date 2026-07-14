import { asc, desc } from "drizzle-orm";
import {
  evaluateFiscalReference,
  hashFiscalRuleContent,
  parseFiscalRuleDefinition,
  type FiscalReferenceCase,
} from "../../../domain/fiscal-rules";
import { ensureScenarioSchema, getDb } from "../../../db";
import { fiscalReferenceCases, fiscalRuleSets } from "../../../db/schema";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";

async function getFiscalRules() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar o catálogo fiscal." }, { status: 401 });

  try {
    await ensureScenarioSchema();
    const db = getDb();
    const [rules, storedCases] = await Promise.all([
      db.select().from(fiscalRuleSets).orderBy(desc(fiscalRuleSets.effectiveFrom), desc(fiscalRuleSets.id)),
      db.select().from(fiscalReferenceCases).orderBy(asc(fiscalReferenceCases.ruleSetId), asc(fiscalReferenceCases.id)),
    ]);
    const casesByRule = new Map<number, typeof storedCases>();
    for (const storedCase of storedCases) {
      const cases = casesByRule.get(storedCase.ruleSetId) ?? [];
      cases.push(storedCase);
      casesByRule.set(storedCase.ruleSetId, cases);
    }

    const catalog = await Promise.all(rules.map(async (rule) => {
      const definition = parseFiscalRuleDefinition(rule.contentJson);
      const computedHash = await hashFiscalRuleContent(rule.contentJson);
      const integrityStatus = computedHash === rule.contentHash ? "verified" : "invalid";
      const referenceCases = (casesByRule.get(rule.id) ?? []).map((storedCase) => {
        try {
          const referenceCase: FiscalReferenceCase = {
            code: storedCase.code,
            title: storedCase.title,
            input: JSON.parse(storedCase.inputJson),
            expected: JSON.parse(storedCase.expectedJson),
          };
          const actual = evaluateFiscalReference(definition, referenceCase.input);
          return { ...referenceCase, actual, passed: JSON.stringify(actual) === JSON.stringify(referenceCase.expected) };
        } catch {
          return { code: storedCase.code, title: storedCase.title, input: null, expected: null, actual: null, passed: false };
        }
      });
      const testsPassed = referenceCases.length > 0 && referenceCases.every((referenceCase) => referenceCase.passed);
      const executionEnabled = rule.status === "approved"
        && definition.executionMode === "calculation"
        && integrityStatus === "verified"
        && testsPassed;
      const blockingReasons = [
        ...(rule.status !== "approved" ? ["Regra ainda não aprovada"] : []),
        ...(definition.executionMode !== "calculation" ? ["Modo somente referência"] : []),
        ...(integrityStatus !== "verified" ? ["Conteúdo divergente do hash registrado"] : []),
        ...(!testsPassed ? ["Casos de referência não passaram integralmente"] : []),
      ];

      return {
        id: rule.id,
        code: rule.code,
        version: rule.version,
        name: rule.name,
        jurisdiction: rule.jurisdiction,
        status: rule.status,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
        sourceCount: rule.sourceCount,
        contentFingerprint: computedHash.slice(0, 12),
        integrityStatus,
        testsPassed,
        executionEnabled,
        blockingReasons,
        executionMode: definition.executionMode,
        operationScope: definition.operationScope,
        components: definition.components,
        treatment: definition.treatment,
        limitations: definition.limitations,
        sources: definition.sources,
        referenceCases,
        updatedAt: rule.updatedAt,
      };
    }));

    const passedCases = catalog.reduce((total, rule) => total + rule.referenceCases.filter((referenceCase) => referenceCase.passed).length, 0);
    return Response.json({
      rules: catalog,
      metrics: {
        totalRules: catalog.length,
        totalSources: catalog.reduce((total, rule) => total + rule.sourceCount, 0),
        passedCases,
        totalCases: catalog.reduce((total, rule) => total + rule.referenceCases.length, 0),
        executionEnabled: catalog.filter((rule) => rule.executionEnabled).length,
      },
    }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return Response.json({ error: "Não foi possível verificar o catálogo fiscal." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/fiscal-rules", getFiscalRules);
