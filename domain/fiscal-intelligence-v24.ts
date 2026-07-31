import {
  evaluateFiscalQuestion,
  extractFiscalFacts,
  spMgAutoPartsKnowledge,
  type FiscalClarification,
  type FiscalDecisionTrace,
  type FiscalFactSource,
  type FiscalFactView,
  type FiscalFinding,
  type FiscalIntelligenceDefinition,
  type FiscalIntelligenceFacts,
  type FiscalIntelligenceOverrides,
  type FiscalIntelligenceResult,
  type FiscalScenarioBranch,
  type NationalFiscalTopic,
} from "./fiscal-intelligence.ts";
import { resolveSimplesActivity } from "./simples-national-deep.ts";
import { classifyPisCofinsProduct } from "./pis-cofins-deep.ts";
import { findIpiTipiProfile } from "./ipi-tipi-deep.ts";

const DEFAULT_REFERENCE_DATE = "2026-07-30";

const labels: Record<keyof FiscalIntelligenceFacts, string> = {
  tax: "Tributo", originState: "UF de origem", destinationState: "UF de destino", segment: "Segmento", productDescription: "Produto ou serviço",
  ncm: "NCM", cest: "CEST", productOrigin: "Origem da mercadoria", importRuleQualification: "Regra de importados", issuerTaxRegime: "Regime do prestador/remetente",
  recipientTaxpayer: "Destinatário contribuinte", purpose: "Finalidade", automotiveUse: "Uso automotivo", specialTreatment: "Tratamento especial",
  operationType: "Tipo de operação", businessActivity: "Atividade empresarial", incomeTaxRegime: "Regime de IRPJ", pisCofinsRegime: "Regime PIS/Cofins",
  serviceItem: "Item da LC 116", cnae: "CNAE", originMunicipality: "Município do prestador", destinationMunicipality: "Município do tomador",
  payerType: "Pagador", paymentRecipientType: "Beneficiário", serviceNature: "Natureza do serviço", referenceDate: "Data de referência",
};

const displayValues: Record<string, string> = {
  auto_parts: "Autopeças", general_goods: "Mercadorias em geral", services: "Serviços", industry: "Indústria", general_business: "Atividade empresarial",
  domestic: "Nacional", imported: "Importada", qualifies: "Enquadra-se na Resolução 13/2012", does_not_qualify: "Fora da Resolução 13/2012",
  normal: "Regime normal", simples: "Simples Nacional", real: "Lucro real", presumed: "Lucro presumido", yes: "Sim", no: "Não", none: "Nenhum informado", exists: "Existe",
  resale: "Revenda", industrialization: "Industrialização", use_consumption: "Uso ou consumo", fixed_asset: "Ativo imobilizado",
  goods: "Mercadoria", service: "Serviço", import: "Importação", export: "Exportação", mixed: "Mista", commerce: "Comércio",
  cumulative: "Cumulativo", non_cumulative: "Não cumulativo", monophase: "Monofásico", zero_rate: "Alíquota zero",
  private_legal_entity: "Pessoa jurídica privada", public_entity: "Órgão ou entidade pública", individual: "Pessoa física", legal_entity: "Pessoa jurídica",
  professional: "Profissional", cleaning_maintenance: "Limpeza/manutenção", labor_assignment: "Cessão de mão de obra", construction: "Construção/empreitada", general: "Geral",
  unknown: "Não informado",
};

const clarificationText: Partial<Record<keyof FiscalIntelligenceFacts, [string, string]>> = {
  tax: ["Qual módulo fiscal deve ser analisado?", "Sem o tributo, nenhuma regra pode ser escolhida."],
  originState: ["Qual é a UF de origem?", "A rota define a referência interestadual."],
  destinationState: ["Qual é a UF de destino?", "A rota define alíquota, DIFAL e acordos."],
  productDescription: ["Qual é a descrição técnica do produto ou serviço?", "A incidência depende do objeto real da operação."],
  ncm: ["Qual é o NCM completo?", "A TIPI e os tratamentos de mercadorias são indexados por NCM."],
  cest: ["Qual é o CEST?", "A triagem de ST exige o código da tabela aplicável."],
  productOrigin: ["A mercadoria é nacional ou importada?", "Importados podem seguir a referência interestadual de 4%."],
  importRuleQualification: ["A importada se enquadra na Resolução 13/2012?", "A alíquota de 4% exige qualificação e conferência das exceções."],
  issuerTaxRegime: ["Qual é o regime do prestador ou remetente?", "Simples e regime normal mudam a leitura operacional."],
  recipientTaxpayer: ["O destinatário é contribuinte do ICMS?", "A informação separa ST, DIFAL e operação subsequente."],
  purpose: ["Qual é a finalidade da aquisição?", "Revenda, industrialização, uso e ativo seguem trilhas distintas."],
  specialTreatment: ["Existe benefício, alíquota zero, suspensão ou regime especial?", "Tratamento específico prevalece sobre a referência geral."],
  operationType: ["É venda, serviço, importação, exportação ou operação mista?", "O fato gerador e o documento dependem da operação."],
  businessActivity: ["A atividade é comércio, indústria, serviço ou mista?", "Regime, base e obrigações mudam por atividade."],
  incomeTaxRegime: ["A empresa está no lucro real, presumido ou Simples?", "A base de IRPJ e CSLL depende do regime."],
  pisCofinsRegime: ["O regime é cumulativo, não cumulativo, monofásico ou alíquota zero?", "A referência geral não pode atravessar regimes especiais."],
  serviceItem: ["Qual é o item da lista da LC 116?", "O item é necessário para definir local e lei municipal do ISS."],
  cnae: ["Qual é o CNAE da atividade?", "CNAE inicia a triagem, mas não define sozinho o anexo."],
  originMunicipality: ["Em qual município está o prestador?", "A regra geral do ISS parte do estabelecimento prestador."],
  destinationMunicipality: ["Em qual município está o tomador ou a execução?", "As exceções do ISS dependem do local relacionado ao serviço."],
  payerType: ["Quem paga: pessoa jurídica privada, órgão público ou pessoa física?", "As regras de retenção mudam conforme o pagador."],
  paymentRecipientType: ["O beneficiário é pessoa jurídica ou física?", "IRRF, CSRF, eSocial e EFD-Reinf seguem trilhas diferentes."],
  serviceNature: ["Qual é a natureza do serviço?", "Serviço profissional, limpeza, cessão e empreitada têm regras diferentes."],
};

function known(field: keyof FiscalIntelligenceFacts, value: FiscalIntelligenceFacts[keyof FiscalIntelligenceFacts]) {
  if (["productDescription", "ncm", "cest", "serviceItem", "cnae", "originMunicipality", "destinationMunicipality"].includes(field)) return typeof value === "string" && value.length > 0;
  return value !== null && value !== "unknown";
}

function factValue(value: FiscalIntelligenceFacts[keyof FiscalIntelligenceFacts]) {
  if (value === null) return "Não identificado";
  return displayValues[String(value)] ?? String(value);
}

function factSource(questionFacts: FiscalIntelligenceFacts, overrides: FiscalIntelligenceOverrides, field: keyof FiscalIntelligenceFacts): FiscalFactSource {
  if (Object.prototype.hasOwnProperty.call(overrides, field)) return "manual";
  if (field === "referenceDate") return "default";
  return known(field, questionFacts[field]) ? "question" : "unknown";
}

function topicFactViews(topic: NationalFiscalTopic, facts: FiscalIntelligenceFacts, questionFacts: FiscalIntelligenceFacts, overrides: FiscalIntelligenceOverrides): FiscalFactView[] {
  const fields = Array.from(new Set<keyof FiscalIntelligenceFacts>(["tax", ...topic.requiredFacts, "referenceDate"]));
  return fields.map((field) => ({ key: field, label: labels[field], value: factValue(facts[field]), source: factSource(questionFacts, overrides, field) }));
}

function clarificationsFor(topic: NationalFiscalTopic, facts: FiscalIntelligenceFacts) {
  return topic.requiredFacts.filter((field) => !known(field, facts[field])).map((field) => {
    const [question, reason] = clarificationText[field] ?? [`Confirme ${labels[field]}.`, "O dado é obrigatório para esta trilha."];
    return { field, question, reason } satisfies FiscalClarification;
  });
}

function finding(code: string, label: string, value: string, detail: string, sourceCodes: string[], nature: FiscalFinding["nature"]): FiscalFinding {
  return { code, label, value, detail, sourceCodes, nature };
}

function trace(ruleCode: string, result: FiscalDecisionTrace["result"], detail: string): FiscalDecisionTrace {
  return { ruleCode, result, detail };
}

function scenario(code: string, label: string, value: string, condition: string, consequence: string, status: FiscalScenarioBranch["status"], sourceCodes: string[]): FiscalScenarioBranch {
  return { code, label, value, condition, consequence, status, sourceCodes };
}

type EvaluationParts = {
  findings: FiscalFinding[];
  scenarioBranches: FiscalScenarioBranch[];
  decisionTrace: FiscalDecisionTrace[];
  headline: string;
  summary: string;
  forcePending?: boolean;
};

function evaluateNationalIcms(facts: FiscalIntelligenceFacts): EvaluationParts {
  const findings: FiscalFinding[] = [];
  const decisionTrace: FiscalDecisionTrace[] = [];
  const scenarioBranches = [
    scenario("ICMS-NATIONAL-4", "Importada enquadrada", "4%", "Operação interestadual com mercadoria alcançada pela Resolução 13/2012.", "Confirmar conteúdo importado e exceções.", "exception", ["RSF-13-2012"]),
    scenario("ICMS-NATIONAL-7", "Sul/Sudeste para N/NE/CO/ES", "7%", "Mercadoria nacional, rota prevista na Resolução 22/1989 e regime normal.", "É somente o ICMS próprio; não resolve ST ou DIFAL.", "baseline", ["RSF-22-1989"]),
    scenario("ICMS-NATIONAL-12", "Demais rotas interestaduais", "12%", "Mercadoria nacional e nenhuma regra especial aplicável.", "É referência geral condicionada.", "baseline", ["RSF-22-1989"]),
    scenario("ICMS-NATIONAL-ST", "Substituição tributária", "Camada separada", "NCM, CEST, descrição, rota e acordo vigentes coincidem.", "Exige legislação da UF de destino e memória própria.", "additional", ["LC-87-1996", "CONFAZ-CONVENIO-142-2018"]),
  ];
  if (facts.specialTreatment === "exists") decisionTrace.push(trace("SPECIAL-TREATMENT", "blocked", "O tratamento especial informado impede aplicar a regra geral."));
  if (facts.originState && facts.destinationState && facts.originState === facts.destinationState) {
    decisionTrace.push(trace("ICMS-INTRASTATE-STATE-LAW", "blocked", "A operação é interna; a Resolução do Senado não determina a alíquota estadual interna."));
    return { findings, scenarioBranches, decisionTrace, headline: "Operação interna: consultar a legislação da UF", summary: "A base nacional identificou uma operação dentro do mesmo estado e bloqueou o uso indevido de 7% ou 12%." };
  }
  const blocked = facts.specialTreatment === "exists" || facts.issuerTaxRegime === "simples";
  let rate: 4 | 7 | 12 | null = null;
  if (!blocked && facts.productOrigin === "imported" && facts.importRuleQualification === "qualifies") rate = 4;
  else if (!blocked && facts.productOrigin === "imported" && facts.importRuleQualification === "does_not_qualify") rate = 12;
  else if (!blocked && facts.productOrigin === "domestic" && facts.originState && facts.destinationState) {
    const originSeven = new Set(["PR", "SC", "RS", "SP", "RJ", "MG", "ES"]);
    const destinationSeven = new Set(["AC", "AP", "AM", "PA", "RO", "RR", "TO", "AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE", "DF", "GO", "MT", "MS", "ES"]);
    rate = originSeven.has(facts.originState) && destinationSeven.has(facts.destinationState) ? 7 : 12;
  }
  if (rate !== null) {
    const sources = rate === 4 ? ["RSF-13-2012"] : ["RSF-22-1989"];
    findings.push(finding(`ICMS-INTERSTATE-${rate}`, "Referência interestadual", `${rate}%`, "Percentual condicionado à rota, origem informada, regime normal e ausência de regra específica. ST, DIFAL e FCP permanecem separados.", sources, "own_rate"));
    decisionTrace.push(trace("ICMS-INTERSTATE-NATIONAL-7-12", "applied", `A matriz nacional selecionou ${rate}% com os fatos confirmados.`));
  } else decisionTrace.push(trace("ICMS-INTERSTATE-NATIONAL-7-12", "blocked", facts.issuerTaxRegime === "simples" ? "No Simples, a referência não foi tratada como destaque de ICMS próprio." : "Rota, origem da mercadoria ou regra de importados ainda não permitem escolher um percentual."));
  if (facts.recipientTaxpayer === "no" || facts.purpose === "use_consumption" || facts.purpose === "fixed_asset") findings.push(finding("ICMS-DIFAL-GATE", "DIFAL", "Análise obrigatória", "A referência interestadual não encerra a operação; alíquota interna, contribuinte, finalidade e responsabilidade precisam ser apurados.", ["LC-87-1996", "LC-190-2022"], "additional_obligation"));
  decisionTrace.push(trace("ICMS-ST-ROUTE-PRODUCT-GATE", "blocked", "A camada nacional não conclui ST sem produto classificado, CEST, acordo vigente e legislação do destino."));
  return { findings, scenarioBranches, decisionTrace, headline: rate ? `Referência interestadual: ${rate}%` : "ICMS nacional: referência ainda bloqueada", summary: "O motor separou o ICMS próprio das camadas de ST, DIFAL e tratamentos especiais. Somente a referência interestadual foi automatizada." };
}

function evaluateIss(facts: FiscalIntelligenceFacts): EvaluationParts {
  const findings = [finding("ISS-LEGAL-RANGE", "Faixa legal do ISS", "2% a 5%", "Não é a alíquota aplicada. O percentual exato depende da lei do município competente, do item da lista e de eventual regime específico.", ["LC-116-2003", "LC-157-2016"], "legal_range")];
  const decisionTrace = [trace("ISS-LEGAL-RANGE-2-5", "applied", "A base apresentou apenas os limites legais, sem inventar a alíquota municipal.")];
  if (facts.serviceItem && facts.originMunicipality && facts.destinationMunicipality) decisionTrace.push(trace("ISS-PLACE-ARTICLE-3", "blocked", `O item ${facts.serviceItem} deve ser confrontado com as exceções do art. 3º antes de escolher entre ${facts.originMunicipality} e ${facts.destinationMunicipality}.`));
  else decisionTrace.push(trace("ISS-PLACE-ARTICLE-3", "blocked", "Item da lista e municípios ainda não permitem definir o local de incidência."));
  return {
    findings,
    scenarioBranches: [
      scenario("ISS-GENERAL-PLACE", "Regra geral", "Município do estabelecimento prestador", "O serviço não está em uma exceção do art. 3º.", "Aplicar a lei local do município competente.", "baseline", ["LC-116-2003"]),
      scenario("ISS-EXCEPTION-PLACE", "Exceção do art. 3º", "Local relacionado à execução/tomador", "O item do serviço integra uma das hipóteses legais específicas.", "A localização precisa ser comprovada documentalmente.", "exception", ["LC-116-2003"]),
    ],
    decisionTrace,
    headline: "ISS: faixa legal localizada; alíquota municipal pendente",
    summary: "A plataforma separou faixa legal, item do serviço, município competente e retenção. Nenhuma taxa municipal exata foi aplicada sem a lei local.",
  };
}

function evaluateIpi(facts: FiscalIntelligenceFacts): EvaluationParts {
  const findings: FiscalFinding[] = [];
  const decisionTrace: FiscalDecisionTrace[] = [];
  if (facts.ncm?.length === 8) {
    const profile = findIpiTipiProfile(facts.ncm);
    if (profile) {
      const formattedRate = `${(profile.nominalRateBps / 100).toFixed(2).replace(".", ",")}%`;
      findings.push(finding(
        "IPI-TIPI-EXACT-PROFILE",
        "Referência nominal da TIPI consolidada",
        formattedRate,
        `NCM ${profile.ncm} · ${profile.description}. A referência nominal não é um cálculo liberado: descrição, notas, Ex, operação, papel, base, vigência e benefícios ainda precisam ser confirmados.`,
        profile.sourceCodes,
        "compliance_gate",
      ));
      decisionTrace.push(trace("IPI-TIPI-EXACT-PROFILE", "applied", `Perfil exato V83 localizado para o NCM ${profile.ncm}, com ${profile.exceptions.length} Ex catalogado(s).`));
      decisionTrace.push(trace("IPI-TIPI-NCM-GATE", "blocked", "A memória permanece bloqueada até conferir descrição legal, notas, Ex, operação, contribuinte, base e benefício."));
    } else {
      findings.push(finding("IPI-TIPI-LOOKUP", "Consulta obrigatória à TIPI", `NCM ${facts.ncm}`, "O NCM completo não integra os quinze perfis prioritários. Consulte a TIPI e o Sistema Classif sem aplicar alíquota por aproximação.", ["IPI-RFB-TIPI-CONSOLIDATED", "IPI-RFB-NCM"], "compliance_gate"));
      decisionTrace.push(trace("IPI-TIPI-NCM-GATE", "blocked", "NCM completo fora da base profunda V83; não houve fallback por prefixo."));
    }
  } else decisionTrace.push(trace("IPI-TIPI-NCM-GATE", "blocked", "O NCM completo de oito dígitos é obrigatório."));
  return { findings, scenarioBranches: [scenario("IPI-INDUSTRIALIZATION", "Produto industrializado", "Saída industrial", "Saída de estabelecimento industrial.", "Confirmar industrialização, NCM, notas, base, Ex e benefício.", "baseline", ["IPI-RFB-ORIENTATION", "IPI-RFB-TIPI-CONSOLIDATED"]), scenario("IPI-EQUIPARATED", "Equiparado a industrial", "Saída equiparada", "O estabelecimento se enquadra em hipótese legal de equiparação.", "Confirmar o dispositivo e o papel do estabelecimento.", "exception", ["IPI-D7212-RIPI"]), scenario("IPI-IMPORT", "Importação", "Desembaraço aduaneiro", "Produto estrangeiro submetido a desembaraço.", "Somar valor aduaneiro, tributo aduaneiro e encargos cambiais na base controlada.", "additional", ["IPI-RFB-IMPORT", "IPI-RFB-ORIENTATION"]), scenario("IPI-NON-TAXABLE-EXIT", "Revenda comum", "Saída comercial potencialmente não tributada", "Não há industrialização, importação própria nem equiparação.", "Comprovar a ausência de hipótese de contribuinte; rótulo de revenda isolado não basta.", "not_applicable", ["IPI-D7212-RIPI"])], decisionTrace, headline: findings.length ? "IPI: perfil TIPI localizado, conclusão ainda condicionada" : "IPI: NCM e TIPI controlam a resposta", summary: "A base V83 indexa NCMs exatos e seus Ex conhecidos, mas não transforma classificação ou taxa nominal em cálculo sem os fatos jurídicos e a base da operação." };
}

function evaluatePisCofins(facts: FiscalIntelligenceFacts): EvaluationParts {
  const findings: FiscalFinding[] = [];
  const decisionTrace: FiscalDecisionTrace[] = [];
  const productCandidates = classifyPisCofinsProduct(facts.ncm || null);
  const candidate = productCandidates.length === 1 ? productCandidates[0] : null;
  const generalBlocked = facts.specialTreatment === "exists" || facts.issuerTaxRegime === "simples" || ["monophase", "zero_rate"].includes(facts.pisCofinsRegime);
  if (!generalBlocked && facts.pisCofinsRegime === "cumulative") {
    findings.push(finding("PIS-COFINS-CUMULATIVE", "Referência cumulativa combinada", "3,65%", "Composição geral de PIS 0,65% e Cofins 3%, condicionada à receita, ao contribuinte e à inexistência de regime monofásico, alíquota zero ou suspensão.", ["L-9718-1998", "MP-2158-35-2001"], "regime_reference"));
    decisionTrace.push(trace("PIS-COFINS-CUMULATIVE", "applied", "Regime cumulativo e ausência de tratamento especial foram informados."));
  } else if (!generalBlocked && facts.pisCofinsRegime === "non_cumulative") {
    findings.push(finding("PIS-COFINS-NON-CUMULATIVE", "Referência não cumulativa combinada", "9,25%", "Composição geral de PIS 1,65% e Cofins 7,6%. Créditos não foram presumidos: cada hipótese exige vínculo com a atividade e documento.", ["L-10637-2002", "L-10833-2003"], "regime_reference"));
    decisionTrace.push(trace("PIS-COFINS-NON-CUMULATIVE", "applied", "Regime não cumulativo informado; a resposta separou débito de crédito."));
  } else decisionTrace.push(trace("PIS-COFINS-SPECIAL-GATE", "blocked", facts.issuerTaxRegime === "simples" ? "No Simples, PIS e Cofins integram a sistemática do DAS e exigem segregação própria." : "Regime monofásico, alíquota zero, tratamento especial ou regime ainda não definido impede a taxa geral."));
  if (candidate) {
    findings.push(finding(
      "PIS-COFINS-PRODUCT-CANDIDATE",
      "Perfil especial candidato",
      candidate.segment,
      `O NCM informado aponta para ${candidate.candidateTreatment === "monophase" ? "tributação monofásica" : "alíquota zero"} em ${candidate.segment}. A conclusão exige NCM exato na tabela oficial, papel na cadeia, documento, operação e vigência.`,
      candidate.sourceCodes,
      "compliance_gate",
    ));
    decisionTrace.push(trace("PIS-COFINS-LC224-2026", "blocked", "Desde 01/04/2026, o efeito da LC 224/2025 e as exceções aplicáveis precisam ser conferidos antes de afirmar a alíquota do benefício."));
  }
  findings.push(finding("PIS-COFINS-RTC-2026", "Convivência com o ano-teste", "Conferir CBS/IBS", "Em 2026, a documentação da RTC convive com PIS/Cofins; o destaque teste não deve ser confundido com substituição automática destas contribuições.", ["RFB-RTC-2026"], "additional_obligation"));
  return { findings, scenarioBranches: [scenario("PIS-COFINS-CUM", "Cumulativo geral", "0,65% + 3%", "Receita abrangida e sem regime específico.", "Sem créditos da sistemática não cumulativa.", "baseline", ["L-9718-1998", "MP-2158-35-2001"]), scenario("PIS-COFINS-NC", "Não cumulativo geral", "1,65% + 7,6%", "Receita abrangida pela não cumulatividade.", "Créditos dependem das hipóteses dos arts. 3º.", "baseline", ["L-10637-2002", "L-10833-2003"]), scenario("PIS-COFINS-SPECIAL", "Monofásico/zero/suspensão", "Regra específica e vigência 2026", "Produto ou receita possui tratamento próprio.", "NCM, papel, tabela oficial e LC 224/2025 bloqueiam qualquer taxa presumida.", "exception", ["PISCOFINS-IN-2121", "PISCOFINS-LC-224"])], decisionTrace, headline: findings.find((item) => item.nature === "regime_reference")?.value ? `PIS/Cofins: referência ${findings.find((item) => item.nature === "regime_reference")!.value}` : "PIS/Cofins: regime geral bloqueado", summary: "A V94 distingue cumulatividade, 60 perfis especiais candidatos e 20 hipóteses de crédito. Débitos e créditos ficam separados e nenhuma compensação é presumida." };
}

function evaluateSimples(facts: FiscalIntelligenceFacts): EvaluationParts {
  const profile = facts.cnae ? resolveSimplesActivity(facts.cnae) : null;
  const findings = facts.cnae ? [
    finding(
      "SIMPLES-CNAE-TRIAGE",
      profile ? "CNAE prioritário localizado" : "CNAE fora do catálogo prioritário",
      facts.cnae,
      profile
        ? `${profile.activity}. Candidato aos Anexos ${profile.annexCandidates.join("/")}${profile.factorR === "required" ? ", condicionado ao fator R" : ""}; atividade efetiva, receita segregada e regras específicas prevalecem.`
        : "O CNAE inicia a triagem, mas não existe perfil prioritário estruturado para este código e nenhum anexo foi inferido.",
      profile ? ["LC-123-2006", "CGSN-140-2018", "CNAE-CONCLA"] : ["LC-123-2006", "CGSN-140-2018"],
      "compliance_gate",
    ),
  ] : [];
  findings.push(finding("SIMPLES-SUBLIMIT-2026", "Sublimite de ICMS e ISS em 2026", "R$ 3.600.000", "O limite precisa ser conferido sobre a receita acumulada; o excesso pode levar ICMS e ISS para fora do DAS sem alterar, por si só, o teto nacional de R$ 4.800.000.", ["CGSN-140-2018", "CGSN-PORTARIA-54-2025"], "compliance_gate"));
  findings.push(finding("SIMPLES-DAS-NOT-CALCULATED", "DAS", "Não calculado", "O motor não recebeu RBT12, receita do período, anexo confirmado, fator R, folha nem segregações de ST, monofásico, exportação e retenções.", ["LC-123-2006", "CGSN-140-2018"], "compliance_gate"));
  return { findings, scenarioBranches: [scenario("SIMPLES-COMMERCE", "Comércio", "Anexo I · triagem", "Receita efetiva de revenda, salvo segregações.", "ST e monofásico exigem segregação.", "baseline", ["LC-123-2006", "CGSN-140-2018"]), scenario("SIMPLES-INDUSTRY", "Indústria", "Anexo II · triagem", "Receita de industrialização.", "Revenda, IPI e operações especiais precisam ser separados.", "baseline", ["LC-123-2006", "CGSN-140-2018"]), scenario("SIMPLES-SERVICES", "Serviços", "Anexos III, IV ou V", "A atividade, o fator R e as regras específicas definem o tratamento.", "CNAE sozinho não decide o anexo; no IV, a CPP permanece fora do DAS.", "exception", ["LC-123-2006", "CGSN-140-2018"])], decisionTrace: [trace("SIMPLES-CNAE-ACTIVITY-GATE", profile ? "applied" : "blocked", profile ? "Perfil candidato localizado; a conclusão permanece dependente da atividade efetiva." : "CNAE sem perfil prioritário estruturado."), trace("SIMPLES-SUBLIMIT-2026", "blocked", "Sem RBT12, o sistema não afirma se ICMS e ISS permanecem dentro do DAS."), trace("SIMPLES-DAS-INPUT-GATE", "blocked", "O cálculo do DAS permanece bloqueado até a entrada de todas as variáveis do PGDAS-D.")], headline: profile ? `Simples: perfil candidato aos Anexos ${profile.annexCandidates.join("/")}; DAS bloqueado` : "Simples: trilha de enquadramento aberta; DAS não calculado", summary: "A V93 organiza 50 perfis prioritários, os cinco anexos, fator R, 15 segregações, 15 impedimentos e 150 casos. Uma pergunta textual nunca produz DAS." };
}

function evaluateIrpjCsll(facts: FiscalIntelligenceFacts): EvaluationParts {
  const findings: FiscalFinding[] = [];
  const decisionTrace: FiscalDecisionTrace[] = [];
  if (["real", "presumed"].includes(facts.incomeTaxRegime) && facts.specialTreatment !== "exists") {
    findings.push(finding("IRPJ-NOMINAL", "Alíquota nominal do IRPJ", "15%", "Incide sobre a base apurada conforme o regime. O adicional de 10% possui limite temporal próprio e não foi calculado.", ["L-9249-1995", "RFB-IRPJ"], "regime_reference"));
    findings.push(finding("CSLL-NOMINAL", "Alíquota geral da CSLL", "9%", "Referência para pessoas jurídicas em geral; instituições financeiras e hipóteses específicas seguem tratamento diferente.", ["RFB-CSLL", "L-9249-1995"], "regime_reference"));
    decisionTrace.push(trace("IRPJ-CSLL-NOMINAL-RATES", "applied", "As alíquotas nominais foram separadas da base real ou presumida."));
  } else decisionTrace.push(trace("IRPJ-CSLL-NOMINAL-RATES", "blocked", "Regime ou tratamento especial impede apresentar a referência geral."));
  if (facts.incomeTaxRegime === "presumed") decisionTrace.push(trace("IRPJ-CSLL-2026-GATE", "blocked", "A base presumida não foi calculada: atividades mistas e alterações de benefícios em 2026 precisam ser classificadas."));
  return { findings, scenarioBranches: [scenario("IRPJ-REAL", "Lucro real", "Resultado ajustado", "Regime real confirmado.", "Exige adições, exclusões, compensações e controles.", "baseline", ["RFB-IRPJ", "RFB-CSLL"]), scenario("IRPJ-PRESUMED", "Lucro presumido", "Percentual por atividade", "Regime presumido e atividade elegível.", "Receitas e atividades precisam ser separadas; 2026 possui controles adicionais.", "baseline", ["L-9249-1995", "RFB-BENEFITS-2026"])], decisionTrace, headline: findings.length ? "IRPJ e CSLL: alíquotas nominais localizadas" : "IRPJ e CSLL: regime ainda bloqueado", summary: "Alíquota nominal não é carga efetiva. A plataforma não aplicou percentual de presunção sem atividade, receitas separadas e controle das alterações de 2026." };
}

function evaluateIbsCbs(facts: FiscalIntelligenceFacts): EvaluationParts {
  const findings = [
    finding("CBS-TEST-2026", "CBS no documento fiscal de 2026", "0,9%", "Destaque do ano-teste conforme orientações vigentes. Não foi tratado como valor jurídico líquido a recolher.", ["LC-214-2025", "RFB-RTC-2026"], "regime_reference"),
    finding("IBS-TEST-2026", "IBS no documento fiscal de 2026", "0,1%", "Destaque do ano-teste conforme orientações vigentes. O cumprimento das obrigações aplicáveis condiciona a dispensa informada pela Receita.", ["LC-214-2025", "RFB-RTC-2026"], "regime_reference"),
  ];
  const blocked = facts.specialTreatment === "exists";
  return { findings: blocked ? [] : findings, scenarioBranches: [scenario("RTC-2026-COMPLIANT", "Documento e declaração conformes", "Dispensa de recolhimento", "Obrigações e notas técnicas vigentes atendidas.", "Preserva o destaque e a evidência sem gerar saldo automático.", "baseline", ["RFB-RTC-2026"]), scenario("RTC-2026-NONCOMPLIANT", "Obrigação não atendida", "Revisão obrigatória", "Documento ou declaração não segue a regra vigente.", "A dispensa não pode ser presumida pela plataforma.", "exception", ["LC-214-2025", "RFB-RTC-2026"])], decisionTrace: [trace("RTC-2026-TEST-YEAR", blocked ? "blocked" : "applied", blocked ? "Regime específico informado exige regra própria." : "Ano de referência 2026: destaque teste separado de recolhimento.")], headline: blocked ? "IBS/CBS: regime específico precisa ser mapeado" : "2026: CBS 0,9% e IBS 0,1% no destaque teste", summary: "A resposta trata documento, obrigação e recolhimento como conceitos diferentes. Nenhum valor líquido a pagar foi produzido." };
}

function evaluateWithholdings(facts: FiscalIntelligenceFacts): EvaluationParts {
  const findings: FiscalFinding[] = [];
  const decisionTrace: FiscalDecisionTrace[] = [];
  const privatePjToPj = facts.payerType === "private_legal_entity" && facts.paymentRecipientType === "legal_entity";
  const listedService = ["professional", "cleaning_maintenance", "labor_assignment"].includes(facts.serviceNature);
  if (facts.payerType === "public_entity") {
    findings.push(finding("PUBLIC-WITHHOLDING-TABLE", "Pagador público", "Tabela própria obrigatória", "A IN RFB nº 1.234/2012 e o enquadramento do ente prevalecem; a referência privada de 4,65% não foi reutilizada.", ["RET-IN-RFB-1234"], "compliance_gate"));
    decisionTrace.push(trace("WITHHOLDING-PUBLIC-TABLE", "blocked", "A natureza do bem ou serviço e a tabela do ente pagador ainda não foram confirmadas."));
  } else if (privatePjToPj && listedService && facts.issuerTaxRegime === "normal" && facts.specialTreatment !== "exists") {
    findings.push(finding("CSRF-POTENTIAL-4-65", "CSRF potencial", "4,65%", "CSLL 1%, Cofins 3% e PIS/Pasep 0,65% para serviço abrangido. O pagamento, o valor calculado superior a R$ 10, dispensas e retenções parciais ainda precisam ser comprovados.", ["RET-L-10833", "RET-L-13137", "RET-IN-SRF-459"], "legal_range"));
    decisionTrace.push(trace("CSRF-SERVICES-4-65", "applied", "Partes privadas, beneficiário PJ no regime normal e serviço potencialmente abrangido foram informados."));
  } else if (facts.issuerTaxRegime === "simples" && facts.paymentRecipientType === "legal_entity") {
    findings.push(finding("CSRF-SIMPLES-DISPENSATION", "CSRF sobre receita própria do Simples", "Dispensa condicionada", "A opção e a documentação do beneficiário precisam estar válidas no fato gerador; a conclusão não afasta INSS ou ISS.", ["RET-L-10833", "RET-IN-SRF-459"], "regime_reference"));
    decisionTrace.push(trace("CSRF-SERVICES-4-65", "not_applicable", "Beneficiário informou opção pelo Simples Nacional; a prova documental continua obrigatória."));
  } else decisionTrace.push(trace("CSRF-SERVICES-4-65", "blocked", "Partes, regime ou natureza do serviço ainda não sustentam a retenção conjunta."));

  if (privatePjToPj && facts.issuerTaxRegime === "normal" && facts.specialTreatment !== "exists") {
    if (facts.serviceNature === "professional") {
      findings.push(finding("IRRF-PROFESSIONAL-1-5", "IRRF potencial em serviço profissional", "1,5%", "Pagamento ou crédito, código de receita, beneficiário e dispensa precisam ser confirmados; valor calculado igual ou inferior a R$ 10 pode ser dispensado.", ["RET-RIR-2018", "RET-RFB-MAFON"], "legal_range"));
      decisionTrace.push(trace("IRRF-SERVICES-1-1-5", "applied", "Natureza profissional candidata identificada."));
    } else if (["cleaning_maintenance", "labor_assignment"].includes(facts.serviceNature)) {
      findings.push(finding("IRRF-CLEANING-LABOR-1", "IRRF potencial", "1%", "A referência alcança limpeza, conservação, segurança, vigilância e locação de mão de obra quando a atividade real coincidir.", ["RET-RIR-2018", "RET-RFB-MAFON"], "legal_range"));
      decisionTrace.push(trace("IRRF-SERVICES-1-1-5", "applied", "Serviço candidato à referência de 1% identificado."));
    } else decisionTrace.push(trace("IRRF-SERVICES-1-1-5", "blocked", "Natureza informada não conclui hipótese de IRRF."));
  } else decisionTrace.push(trace("IRRF-SERVICES-1-1-5", "blocked", "Partes, regime ou tratamento impedem apresentar referência privada."));

  if (["labor_assignment", "construction", "cleaning_maintenance"].includes(facts.serviceNature)) {
    findings.push(finding("INSS-RETENTION-TRIAGE", "Retenção previdenciária", "11% ou 3,5% · trilha separada", "Modo de execução, lista dos serviços, CPRB, base, deduções, contrato e regime do prestador definem a memória; empreitada total não herda a conclusão da empreitada parcial.", ["RET-L-8212", "RET-IN-RFB-2110"], "additional_obligation"));
  }
  findings.push(finding("ISS-RETENTION-TRIAGE", "ISS retido", "Lei municipal obrigatória", "Item da LC 116, município competente, responsável, base, alíquota entre 2% e 5% e vencimento municipal permanecem separados das retenções federais.", ["RET-LC-116", "RET-LC-123"], "additional_obligation"));
  findings.push(finding("REINF-EVIDENCE", "Escrituração das retenções", "EFD-Reinf até dia 15", "R-2010/R-2020 registram serviços com retenção previdenciária; R-4010/R-4020 registram rendimentos e retenções. A DCTFWeb não corrige fato informado incorretamente.", ["RET-RFB-REINF"], "additional_obligation"));
  decisionTrace.push(trace("WITHHOLDING-REINF-EVIDENCE", "applied", "A obrigação de evidência foi separada do fato gerador e do vencimento de cada tributo."));
  return {
    findings,
    scenarioBranches: [
      scenario("WITHHOLDING-PRIVATE", "PJ privada pagando PJ", "Quatro livros independentes", "Natureza, partes e regime confirmados.", "IRRF, CSRF, INSS e ISS conservam bases, responsáveis e prazos próprios.", "baseline", ["RET-RIR-2018", "RET-L-10833", "RET-IN-RFB-2110", "RET-LC-116"]),
      scenario("WITHHOLDING-PUBLIC", "Órgão público pagador", "Tabela própria", "Pagamento por órgão ou entidade pública.", "Bloquear a regra privada até confirmar a IN RFB nº 1.234/2012 e o ente.", "exception", ["RET-IN-RFB-1234"]),
      scenario("WITHHOLDING-SIMPLES", "Prestador do Simples", "Dispensas não transitivas", "Opção e documento válidos.", "IRRF/CSRF podem ser dispensados, mas INSS e ISS permanecem em análises próprias.", "exception", ["RET-IN-SRF-459", "RET-LC-123", "RET-IN-RFB-2110"]),
      scenario("WITHHOLDING-INSS", "Cessão ou empreitada", "11% ou 3,5%", "Execução, CPRB, base e deduções confirmadas.", "Reinf e DCTFWeb recebem a memória previdenciária separada.", "additional", ["RET-L-8212", "RET-IN-RFB-2110", "RET-RFB-REINF"]),
    ],
    decisionTrace,
    headline: facts.payerType === "public_entity" ? "Retenções: pagador público exige tabela própria" : findings.some((item) => item.code === "CSRF-POTENTIAL-4-65") ? "Retenções: IRRF, CSRF, INSS e ISS separados" : "Retenções: classificação ainda necessária",
    summary: "A V82 estrutura 15 serviços recorrentes e impede que alíquota, dispensa, base, responsável ou prazo de um tributo sejam emprestados a outro. Nenhum líquido é concluído pela busca textual.",
  };
}

function evaluateTopic(topic: NationalFiscalTopic, facts: FiscalIntelligenceFacts): EvaluationParts {
  switch (topic.tax) {
    case "ICMS": return evaluateNationalIcms(facts);
    case "ISS": return evaluateIss(facts);
    case "IPI": return evaluateIpi(facts);
    case "PIS_COFINS": return evaluatePisCofins(facts);
    case "SIMPLES": return evaluateSimples(facts);
    case "IRPJ_CSLL": return evaluateIrpjCsll(facts);
    case "IBS_CBS": return evaluateIbsCbs(facts);
    case "WITHHOLDINGS": return evaluateWithholdings(facts);
  }
}

function topicOverview(definition: FiscalIntelligenceDefinition, facts: FiscalIntelligenceFacts, questionFacts: FiscalIntelligenceFacts, overrides: FiscalIntelligenceOverrides): FiscalIntelligenceResult {
  const clarifications: FiscalClarification[] = [{ field: "tax", question: "Qual destes módulos você quer analisar?", reason: "Escolha ICMS, ISS, IPI, PIS/Cofins, Simples, IRPJ/CSLL, IBS/CBS ou retenções." }];
  const branches = definition.nationalTopics.map((topic) => scenario(`TOPIC-${topic.code}`, topic.title, topic.coverageLevel === "operational_reference" ? "Referência operacional" : "Triagem estruturada", topic.supportedOutputs.join("; "), `Bloqueios: ${topic.hardStops.join("; ")}.`, "baseline", []));
  return {
    schemaVersion: "fiscal-intelligence-result.v1", engineVersion: definition.engineVersion, baseCode: definition.baseCode, baseVersion: definition.version,
    assuranceLevel: definition.assuranceLevel, status: "needs_information", statusLabel: "Escolha o módulo", headline: "A pergunta ainda não identifica o tributo",
    summary: "A V24 reconhece oito módulos nacionais. Selecione um tema ou descreva o tributo para abrir o funil correto.", facts,
    factViews: [{ key: "tax", label: labels.tax, value: factValue(facts.tax), source: factSource(questionFacts, overrides, "tax") }], completeness: { known: 0, required: 1, percentage: 0 },
    findings: [], scenarioBranches: branches, clarifications, decisionTrace: [], sources: [], limitations: definition.limitations,
    disclaimer: "Pesquisa fiscal assistida. A ausência de módulo, fato ou fonte específica bloqueia qualquer conclusão numérica.", topicCode: "TOPIC-ROUTER", coverageLevel: "structured_triage", calculationEligible: false,
  };
}

export function evaluateExpandedFiscalQuestion(question: string, overrides: FiscalIntelligenceOverrides = {}, referenceDate = DEFAULT_REFERENCE_DATE, definition = spMgAutoPartsKnowledge): FiscalIntelligenceResult {
  if (typeof question !== "string" || question.trim().length < 5 || question.length > 500) throw new Error("invalid_fiscal_question");
  const questionFacts = extractFiscalFacts(question, {}, referenceDate, definition);
  const facts = extractFiscalFacts(question, overrides, referenceDate, definition);
  const legacyCandidate = facts.tax === "ICMS" && facts.segment === "auto_parts" && (!facts.originState || facts.originState === "SP") && (!facts.destinationState || facts.destinationState === "MG");
  if (legacyCandidate) return evaluateFiscalQuestion(question, overrides, referenceDate, definition);
  if (!facts.tax) return topicOverview(definition, facts, questionFacts, overrides);
  const topic = definition.nationalTopics.find((current) => current.tax === facts.tax);
  if (!topic) return topicOverview(definition, facts, questionFacts, overrides);
  const clarifications = clarificationsFor(topic, facts);
  if (facts.tax === "ICMS" && facts.productOrigin === "imported" && facts.importRuleQualification === "unknown") {
    const [questionText, reason] = clarificationText.importRuleQualification!;
    clarifications.push({ field: "importRuleQualification", question: questionText, reason });
  }
  const evaluated = evaluateTopic(topic, facts);
  const required = topic.requiredFacts.length;
  const knownCount = topic.requiredFacts.filter((field) => known(field, facts[field])).length;
  const status = clarifications.length || evaluated.forcePending ? "needs_information" : "conditional";
  const sourceCodes = new Set(evaluated.findings.flatMap((item) => item.sourceCodes));
  evaluated.scenarioBranches.flatMap((item) => item.sourceCodes).forEach((code) => sourceCodes.add(code));
  evaluated.decisionTrace.forEach((item) => definition.rules.find((rule) => rule.code === item.ruleCode)?.sourceCodes.forEach((code) => sourceCodes.add(code)));
  return {
    schemaVersion: "fiscal-intelligence-result.v1", engineVersion: definition.engineVersion, baseCode: definition.baseCode, baseVersion: definition.version,
    assuranceLevel: definition.assuranceLevel, status, statusLabel: status === "conditional" ? "Conclusão condicional" : "Dados pendentes",
    headline: evaluated.headline, summary: evaluated.summary, facts, factViews: topicFactViews(topic, facts, questionFacts, overrides),
    completeness: { known: knownCount, required, percentage: Math.round(knownCount / required * 100) }, findings: evaluated.findings,
    scenarioBranches: evaluated.scenarioBranches, clarifications: Array.from(new Map(clarifications.map((item) => [item.field, item])).values()),
    decisionTrace: evaluated.decisionTrace, sources: definition.sources.filter((source) => sourceCodes.has(source.code)), limitations: definition.limitations,
    disclaimer: "Pesquisa fiscal determinística condicionada aos fatos informados e à versão das fontes. Faixas, referências e trilhas não substituem a lei específica, a documentação da operação nem a revisão do contador responsável.",
    topicCode: topic.code, coverageLevel: topic.coverageLevel, calculationEligible: false,
  };
}

export function fiscalTopicCatalog(definition = spMgAutoPartsKnowledge) {
  return definition.nationalTopics.map((topic) => ({ code: topic.code, tax: topic.tax, title: topic.title, coverageLevel: topic.coverageLevel, supportedOutputs: topic.supportedOutputs, hardStops: topic.hardStops, sourceCodes: topic.sourceCodes, examples: topic.examples }));
}
