"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeProfessionalRegistration, professionalRegistrationError, professionalRegistrationIsValid } from "../professional-registration";
import { calculateScenarioValues } from "../scenario-calculations";
import { rateSourceLabel, resolveStoredScenarioValues, type RateSource, type ReviewStatus } from "../scenario-reliability";
import FiscalIntelligence from "./FiscalIntelligence";
import NfeAuditWorkbench from "./NfeAuditWorkbench";

type Section = "overview" | "companies" | "simulator" | "reviews" | "documents" | "team" | "intelligence" | "rules" | "determination" | "academy";

type ScenarioApproval = {
  id: number;
  reviewerName: string;
  professionalRegistration: string;
  assuranceLevel: string;
  credentialVerification: string;
  decision: string;
  decisionNote: string;
  declarationVersion: string;
  decidedAt: string;
  integrityStatus: "verified" | "invalid";
};

type SavedScenario = {
  id: number;
  name: string;
  revenueCents: number;
  currentRateBps: number;
  newRateBps: number;
  costRateBps: number;
  fixedCostsCents: number;
  volumeLossBps: number;
  priceAdjustmentBps: number;
  targetYear: number;
  rateSource: RateSource;
  sourceNote: string;
  reviewStatus: ReviewStatus;
  calculationVersion: string;
  methodologyVersion: string;
  inputHash: string | null;
  snapshotJson: string | null;
  calculatedAt: string | null;
  signatureVersion: string;
  integrityStatus: "verified" | "legacy" | "invalid";
  companyId: number;
  preparedByUserId: number | null;
  preparerName: string | null;
  supersedesScenarioId: number | null;
  companyName?: string | null;
  createdAt: string;
  approval: ScenarioApproval | null;
};

type ReviewRoundStatus = "pending" | "changes_requested" | "rejected" | "approved" | "superseded";

type ReviewComment = {
  id: number;
  reviewRoundId: number;
  authorUserId: number;
  authorName: string;
  kind: "submission" | "assignment" | "comment" | "changes_requested" | "rejected" | "approved" | "superseded";
  body: string;
  createdAt: string;
};

type ReviewQueueItem = {
  id: number;
  scenarioId: number;
  companyId: number;
  preparedByUserId: number;
  assignedReviewerUserId: number | null;
  requestedByUserId: number;
  roundNumber: number;
  status: ReviewRoundStatus;
  dueAt: string | null;
  decisionByUserId: number | null;
  decisionByName: string | null;
  decisionNote: string;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  preparerName: string;
  assigneeName: string | null;
  company: { id: number; name: string; taxRegime: string; sector: string } | null;
  scenario: SavedScenario;
  comments: ReviewComment[];
};

type EligibleReviewer = { userId: number; name: string; email: string; role: "owner" | "admin" | "reviewer" };
type ReviewMetrics = { pending: number; mine: number; overdue: number; changesRequested: number; approved: number; averageHours: number | null };

type AuditEvent = {
  id: number;
  scenarioId: number | null;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
};

type ReportShare = {
  id: number;
  token: string;
  scenarioId: number;
  scenarioName: string;
  companyId: number;
  note: string | null;
  url: string;
  expiresAt: string;
  revokedAt: string | null;
  views: number;
  lastViewedAt: string | null;
  createdAt: string;
};

type Company = {
  id: number;
  name: string;
  cnpj: string | null;
  taxRegime: string;
  sector: string;
  createdAt: string;
  latestScenario: SavedScenario | null;
};

type CompanyForm = {
  name: string;
  cnpj: string;
  taxRegime: string;
  sector: string;
};

type TeamMember = {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: "owner" | "admin" | "preparer" | "reviewer";
  status: string;
  joinedAt: string;
};

type TeamInvitation = {
  id: number;
  email: string;
  role: "admin" | "preparer" | "reviewer";
  status: string;
  expiresAt: string;
  createdAt?: string;
  url?: string;
};

type DemoStep = {
  label: string;
  title: string;
  description: string;
  metricLabel: string;
  metric: string;
  action: string;
};

type ProductDemo = {
  title: string;
  description: string;
  duration: string;
  level: string;
  accent: "teal" | "lime" | "coral";
  steps: DemoStep[];
};

type FiscalReferenceOutput = {
  cbsHighlightedCents: number;
  ibsHighlightedCents: number;
  totalHighlightedCents: number;
  collectionTreatment: "conditional_waiver" | "offset_against_pis_cofins";
  netPayableCents: null;
};

type FiscalRule = {
  id: number;
  code: string;
  version: string;
  name: string;
  jurisdiction: string;
  status: "draft" | "in_review" | "approved" | "retired";
  effectiveFrom: string;
  effectiveTo: string;
  contentFingerprint: string;
  integrityStatus: "verified" | "invalid";
  testsPassed: boolean;
  executionEnabled: boolean;
  blockingReasons: string[];
  executionMode: "reference_only" | "calculation";
  components: Array<{ tax: "CBS" | "IBS"; rateBps: number }>;
  limitations: string[];
  sources: Array<{ title: string; url: string; publisher: string; sourceUpdatedAt: string | null; checkedAt: string }>;
  referenceCases: Array<{
    code: string;
    title: string;
    input: { taxableBaseCents: number; ancillaryObligationsStatus: "confirmed_compliant" | "not_confirmed" } | null;
    expected: FiscalReferenceOutput | null;
    actual: FiscalReferenceOutput | null;
    passed: boolean;
  }>;
};

type FiscalCatalog = {
  rules: FiscalRule[];
  metrics: { totalRules: number; totalSources: number; passedCases: number; totalCases: number; executionEnabled: number };
};

type TaxDeterminationLedger = {
  tax: "CBS" | "IBS";
  grossDebitsCents: number;
  debitAdjustmentsCents: number;
  eligibleCreditsCents: number;
  creditAdjustmentsCents: number;
  openingCreditCents: number;
  confirmedExtinguishmentsCents: number;
  preliminaryDebitBalanceCents: number;
  preliminaryCreditCarryforwardCents: number;
  netPayableCents: number | null;
};

type TaxDeterminationModel = {
  blueprint: {
    title: string;
    version: string;
    status: string;
    legalBoundary: string;
    formula: string;
    stages: Array<{ code: string; title: string; description: string }>;
    controls: Array<{ key: string; label: string }>;
    entryMatrix: Array<{ kind: string; source: string; inclusion: string }>;
    sources: Array<{ title: string; url: string; publisher: string; checkedAt: string }>;
  };
  fingerprint: string;
  engineVersion: string;
  integrityStatus: "verified" | "invalid";
  casesPassed: boolean;
  referenceCases: Array<{
    code: string;
    title: string;
    passed: boolean;
    legalEffect: "simulation_2026" | "production";
    closingReady: boolean;
    cbsPreliminaryDebitCents: number;
    ibsPreliminaryDebitCents: number;
    cbsNetPayableCents: number | null;
    ibsNetPayableCents: number | null;
    issueCodes: string[];
  }>;
  execution: { status: "blocked"; netPayableEnabled: false; reasons: string[] };
  simulationExample: {
    period: string;
    legalEffect: "simulation_2026";
    cbs: TaxDeterminationLedger;
    ibs: TaxDeterminationLedger;
    netPayableEnabled: false;
  };
  workspace: { totalPeriods: number; closedPeriods: number; writesEnabled: false };
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const preciseCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

function createClientRequestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const products = [
  { name: "Consultoria mensal", share: "34%", current: "8,65%", projected: "13,45%", impact: "+ R$ 3.860", tone: "danger" },
  { name: "Implantação de processos", share: "26%", current: "8,65%", projected: "11,90%", impact: "+ R$ 2.170", tone: "danger" },
  { name: "Treinamento corporativo", share: "18%", current: "8,65%", projected: "9,20%", impact: "+ R$ 282", tone: "neutral" },
  { name: "Licenciamento de conteúdo", share: "14%", current: "8,65%", projected: "7,80%", impact: "− R$ 338", tone: "good" },
];

const auditEventLabels: Record<string, string> = {
  "scenario.created": "Versão de cálculo congelada",
  "scenario.corrected_version_created": "Versão corretiva vinculada",
  "scenario.ready_for_review": "Revisão interna iniciada",
  "scenario.review_requested": "Revisão atribuída com prazo",
  "scenario.review_assigned": "Revisão reatribuída",
  "scenario.review_changes_requested": "Correções solicitadas pelo revisor",
  "scenario.review_rejected": "Versão rejeitada pelo revisor",
  "scenario.responsible_approved": "Aprovada pelo responsável técnico",
  "scenario.office_second_review_approved": "Aprovada por segundo profissional do escritório",
  "scenario.deleted": "Cenário excluído",
  "report_share.created": "Relatório compartilhado",
  "report_share.revoked": "Compartilhamento revogado",
};

const reviewStatusLabels: Record<ReviewRoundStatus, string> = {
  pending: "Aguardando revisão",
  changes_requested: "Correções solicitadas",
  rejected: "Rejeitada",
  approved: "Aprovada",
  superseded: "Substituída por correção",
};

function dateInputValue(daysFromNow = 3) {
  const date = new Date(Date.now() + daysFromNow * 86_400_000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function reviewDueIso(date: string) {
  return new Date(`${date}T18:00:00`).toISOString();
}

const productDemos: ProductDemo[] = [
  {
    title: "Da empresa ao diagnóstico",
    description: "Cadastre um cliente e monte a primeira análise completa.",
    duration: "1:48",
    level: "Comece aqui",
    accent: "teal",
    steps: [
      { label: "PASSO 1 · EMPRESAS", title: "Crie o espaço do cliente", description: "Informe razão social, regime tributário e setor. Cada empresa mantém seus próprios cenários e documentos.", metricLabel: "CARTEIRA ORGANIZADA", metric: "1 novo cliente", action: "Adicionar empresa" },
      { label: "PASSO 2 · SIMULADOR", title: "Defina o cenário base", description: "Registre receita, carga atual, projeção IBS + CBS e custos operacionais para medir a exposição.", metricLabel: "RECEITA ANALISADA", metric: "R$ 284.650", action: "Calcular impacto" },
      { label: "PASSO 3 · RESULTADO", title: "Leia o impacto em reais", description: "Compare imposto atual e projetado. A queda de margem aparece antes de afetar a operação.", metricLabel: "EXPOSIÇÃO ESTIMADA", metric: "+ R$ 13.665", action: "Ver recomendação" },
      { label: "PASSO 4 · DECISÃO", title: "Salve o plano de ação", description: "Aplique o reajuste sugerido e salve o cenário para comparar alternativas com o cliente.", metricLabel: "MARGEM PROTEGIDA", metric: "24,2%", action: "Salvar cenário" },
    ],
  },
  {
    title: "Teste o reajuste ideal",
    description: "Use o simulador para proteger a margem sem adivinhação.",
    duration: "2:12",
    level: "Simulador",
    accent: "lime",
    steps: [
      { label: "PASSO 1 · PREMISSAS", title: "Confirme a realidade atual", description: "Comece com a alíquota e a estrutura de custos que a empresa já possui hoje.", metricLabel: "MARGEM ATUAL", metric: "24,2%", action: "Avançar" },
      { label: "PASSO 2 · TRANSIÇÃO", title: "Informe a nova carga", description: "Ajuste a alíquota projetada e veja a nova despesa tributária recalculada em tempo real.", metricLabel: "IBS + CBS PROJETADOS", metric: "13,45%", action: "Comparar margens" },
      { label: "PASSO 3 · RECOMENDAÇÃO", title: "Encontre o ponto de equilíbrio", description: "O Margem Clara calcula quanto o preço precisa subir para preservar o resultado atual.", metricLabel: "REAJUSTE RECOMENDADO", metric: "5,6%", action: "Aplicar reajuste" },
      { label: "PASSO 4 · COMPARAÇÃO", title: "Compare duas estratégias", description: "Salve uma alternativa conservadora e outra integral para conduzir a decisão comercial.", metricLabel: "GANHO NO CENÁRIO", metric: "+ R$ 12.940", action: "Gerar resumo" },
    ],
  },
  {
    title: "Priorize quem precisa agir",
    description: "Transforme a carteira em uma fila objetiva de decisões.",
    duration: "1:35",
    level: "Carteira",
    accent: "coral",
    steps: [
      { label: "PASSO 1 · VISÃO GERAL", title: "Veja a cobertura da carteira", description: "Identifique rapidamente quantas empresas já têm cenário e quais ainda precisam de análise.", metricLabel: "EMPRESAS ANALISADAS", metric: "8 de 12", action: "Ver pendências" },
      { label: "PASSO 2 · RISCO", title: "Comece pela maior exposição", description: "Empresas com perda projetada de margem aparecem destacadas para receber atenção primeiro.", metricLabel: "MARGEM EM RISCO", metric: "3 empresas", action: "Abrir primeira empresa" },
      { label: "PASSO 3 · CONTEXTO", title: "Entre no cenário certo", description: "Ao trocar de empresa, histórico, documentos e premissas mudam juntos sem misturar dados.", metricLabel: "CENÁRIOS SALVOS", metric: "4 alternativas", action: "Comparar cenários" },
      { label: "PASSO 4 · ROTINA", title: "Conduza a próxima conversa", description: "Use o resumo executivo para transformar o alerta em uma proposta de reajuste explicável.", metricLabel: "PRÓXIMA AÇÃO", metric: "Revisar contrato", action: "Abrir relatório" },
    ],
  },
];

function formatCnpj(value: string | null) {
  if (!value || value.length !== 14) return "CNPJ não informado";
  return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

type MargemAppProps = {
  user: { id: number; displayName: string; email: string };
  workspace: { id: number; name: string; type: "individual" | "office"; ownerUserId: number; suggestedPlanKey: "pro" | "escritorio"; role: "owner" | "admin" | "preparer" | "reviewer" };
  signOutPath: string;
};

export default function MargemApp({ user, workspace, signOutPath }: MargemAppProps) {
  const [section, setSection] = useState<Section>("overview");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyForm>({ name: "", cnpj: "", taxRegime: "Simples Nacional", sector: "Serviços B2B" });
  const [revenue, setRevenue] = useState(284650);
  const [currentRate, setCurrentRate] = useState(8.65);
  const [newRate, setNewRate] = useState(13.45);
  const [costRate, setCostRate] = useState(67.2);
  const [fixedCosts, setFixedCosts] = useState(15000);
  const [volumeLoss, setVolumeLoss] = useState(0);
  const [priceAdjustment, setPriceAdjustment] = useState(0);
  const [scenarioName, setScenarioName] = useState("Cenário base · 2027");
  const [targetYear, setTargetYear] = useState(2027);
  const [rateSource, setRateSource] = useState<Exclude<RateSource, "legacy_unverified">>("custom");
  const [sourceNote, setSourceNote] = useState("Premissa recebida do cliente e registrada pelo escritório; conferir incidência e créditos antes da aprovação.");
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [reportShares, setReportShares] = useState<ReportShare[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [reviewingScenarioId, setReviewingScenarioId] = useState<number | null>(null);
  const [approvalScenario, setApprovalScenario] = useState<SavedScenario | null>(null);
  const [professionalRegistration, setProfessionalRegistration] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const [approvingScenarioId, setApprovingScenarioId] = useState<number | null>(null);
  const [creatingShareId, setCreatingShareId] = useState<number | null>(null);
  const [comparisonIds, setComparisonIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [demoIndex, setDemoIndex] = useState(0);
  const [demoStep, setDemoStep] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [fiscalCatalog, setFiscalCatalog] = useState<FiscalCatalog | null>(null);
  const [rulesError, setRulesError] = useState("");
  const [taxDetermination, setTaxDetermination] = useState<TaxDeterminationModel | null>(null);
  const [determinationError, setDeterminationError] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [reviewMetrics, setReviewMetrics] = useState<ReviewMetrics>({ pending: 0, mine: 0, overdue: 0, changesRequested: 0, approved: 0, averageHours: null });
  const [eligibleReviewers, setEligibleReviewers] = useState<EligibleReviewer[]>([]);
  const [reviewPermissions, setReviewPermissions] = useState({ canManage: false, canReview: false });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "mine" | "pending" | "changes_requested" | "approved" | "rejected">("all");
  const [activeReviewId, setActiveReviewId] = useState<number | null>(null);
  const [reviewSubmissionScenario, setReviewSubmissionScenario] = useState<SavedScenario | null>(null);
  const [submissionReviewerId, setSubmissionReviewerId] = useState<number | null>(null);
  const [submissionDueDate, setSubmissionDueDate] = useState(dateInputValue());
  const [submissionNote, setSubmissionNote] = useState("");
  const [reviewDecision, setReviewDecision] = useState<{ review: ReviewQueueItem; decision: "changes_requested" | "rejected" } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMutating, setReviewMutating] = useState(false);
  const [assignmentReviewerId, setAssignmentReviewerId] = useState<number | null>(null);
  const [assignmentDueDate, setAssignmentDueDate] = useState(dateInputValue());
  const [correctionSourceScenarioId, setCorrectionSourceScenarioId] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamInvitation["role"]>("reviewer");
  const [createdInviteUrl, setCreatedInviteUrl] = useState("");
  const [officeUpgradeName, setOfficeUpgradeName] = useState("");
  const [upgradingWorkspace, setUpgradingWorkspace] = useState(false);
  const pendingScenarioRequest = useRef<{ fingerprint: string; id: string } | null>(null);

  const activeCompany = useMemo(() => companies.find((company) => company.id === activeCompanyId) ?? null, [companies, activeCompanyId]);
  const activeDemo = productDemos[demoIndex];
  const activeDemoStep = activeDemo.steps[demoStep];
  const userInitials = user.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "MC";
  const canManageTeam = workspace.role === "owner" || workspace.role === "admin";
  const canPrepare = workspace.role !== "reviewer";
  const filteredReviews = useMemo(() => reviewQueue.filter((review) => {
    if (reviewFilter === "all") return true;
    if (reviewFilter === "mine") return review.status === "pending" && review.assignedReviewerUserId === user.id;
    return review.status === reviewFilter;
  }), [reviewQueue, reviewFilter, user.id]);
  const activeReview = useMemo(() => filteredReviews.find((review) => review.id === activeReviewId) ?? filteredReviews[0] ?? null, [filteredReviews, activeReviewId]);
  const activeReviewValues = useMemo(() => activeReview?.scenario.integrityStatus === "verified" ? resolveStoredScenarioValues(activeReview.scenario) : null, [activeReview]);

  const figures = useMemo(() => calculateScenarioValues({ revenue, currentRate, newRate, costRate, fixedCosts, volumeLoss, priceAdjustment }), [revenue, currentRate, newRate, costRate, fixedCosts, volumeLoss, priceAdjustment]);

  const comparedScenarios = useMemo(() => comparisonIds.map((id) => {
    const scenario = savedScenarios.find((item) => item.id === id);
    if (!scenario || scenario.integrityStatus === "invalid") return null;
    const values = resolveStoredScenarioValues(scenario);
    return { scenario, values };
  }).filter((item): item is NonNullable<typeof item> => item !== null), [comparisonIds, savedScenarios]);

  const portfolioInsights = useMemo(() => {
    const analyses = companies.map((company) => {
      if (!company.latestScenario || company.latestScenario.integrityStatus === "invalid") return { company, values: null };
      const item = company.latestScenario;
      return { company, values: resolveStoredScenarioValues(item) };
    });
    return {
      analyzed: analyses.filter((item) => item.values).length,
      atRisk: analyses.filter((item) => item.values && item.values.projectedMargin < item.values.currentMargin).length,
      protected: analyses.filter((item) => item.values && item.values.projectedMargin >= item.values.currentMargin).length,
      pending: analyses.filter((item) => !item.values).length,
      revenue: companies.reduce((sum, company) => sum + (company.latestScenario?.revenueCents ?? 0) / 100, 0),
    };
  }, [companies]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") !== "academy") return;
    const timer = window.setTimeout(() => setSection("academy"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (section !== "academy" || !demoPlaying) return;
    const timer = window.setTimeout(() => {
      if (demoStep >= activeDemo.steps.length - 1) {
        setDemoPlaying(false);
        return;
      }
      setDemoStep((current) => current + 1);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [section, demoPlaying, demoStep, activeDemo.steps.length]);

  useEffect(() => {
    if (section !== "rules" || fiscalCatalog || rulesError) return;
    fetch("/api/fiscal-rules")
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog unavailable");
        return response.json() as Promise<FiscalCatalog>;
      })
      .then(setFiscalCatalog)
      .catch(() => setRulesError("Não foi possível verificar o catálogo fiscal agora."));
  }, [section, fiscalCatalog, rulesError]);

  useEffect(() => {
    if (section !== "determination" || taxDetermination || determinationError) return;
    fetch("/api/tax-determination")
      .then(async (response) => {
        if (!response.ok) throw new Error("determination unavailable");
        return response.json() as Promise<TaxDeterminationModel>;
      })
      .then(setTaxDetermination)
      .catch(() => setDeterminationError("Não foi possível verificar o modelo de apuração agora."));
  }, [section, taxDetermination, determinationError]);

  useEffect(() => {
    if (section !== "team" || workspace.type !== "office") return;
    void refreshTeam();
  }, [section, workspace.type]);

  useEffect(() => {
    if (section !== "reviews" || workspace.type !== "office") return;
    void refreshReviews();
    // The refresh function intentionally reads the current UI selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, workspace.type]);

  useEffect(() => {
    fetch("/api/companies")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { companies?: Company[] }) => {
        const rows = data.companies ?? [];
        setCompanies(rows);
        if (!rows.length) {
          setSection("companies");
          setShowCompanyForm(true);
        }
        const storedId = Number(window.localStorage.getItem("margem-clara-company"));
        const selected = rows.find((company) => company.id === storedId)?.id ?? rows[0]?.id ?? null;
        changeActiveCompany(selected);
      })
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    if (!activeCompanyId) return;
    window.localStorage.setItem("margem-clara-company", String(activeCompanyId));
    void refreshReportShares(activeCompanyId);
    void refreshAuditEvents(activeCompanyId);
    fetch(`/api/scenarios?companyId=${activeCompanyId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { scenarios?: SavedScenario[] }) => {
        const rows = data.scenarios ?? [];
        setSavedScenarios(rows);
        const correctionSource = correctionSourceScenarioId ? rows.find((scenario) => scenario.id === correctionSourceScenarioId) : null;
        const latestUsable = correctionSource ?? rows.find((scenario) => scenario.integrityStatus !== "invalid");
        if (latestUsable) {
          loadScenario(latestUsable, false);
          if (correctionSource) setScenarioName(`${correctionSource.name} · correção`);
        }
        else resetScenarioFields();
      })
      .catch(() => setSavedScenarios([]));
  }, [activeCompanyId, correctionSourceScenarioId]);

  async function refreshCompanies() {
    try {
      const response = await fetch("/api/companies");
      if (!response.ok) return;
      const data = (await response.json()) as { companies?: Company[] };
      setCompanies(data.companies ?? []);
    } catch {
      // The active workflow remains usable if the portfolio refresh fails.
    }
  }

  async function refreshScenarioAfterApproval(companyId: number, scenarioId: number) {
    const response = await fetch(`/api/scenarios?companyId=${companyId}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { scenarios?: SavedScenario[] };
    const rows = data.scenarios ?? [];
    const confirmed = rows.find((scenario) => scenario.id === scenarioId) ?? null;
    setSavedScenarios(rows);
    if (confirmed) setCompanies((current) => current.map((company) => company.latestScenario?.id === scenarioId ? { ...company, latestScenario: confirmed } : company));
    return confirmed;
  }

  function changeActiveCompany(companyId: number | null) {
    setComparisonIds([]);
    setActiveCompanyId(companyId);
  }

  async function refreshReportShares(companyId: number) {
    try {
      const response = await fetch(`/api/report-shares?companyId=${companyId}`);
      if (!response.ok) throw new Error("share list failed");
      const data = (await response.json()) as { shares?: ReportShare[] };
      setReportShares(data.shares ?? []);
    } catch {
      setReportShares([]);
    }
  }

  async function refreshAuditEvents(companyId: number) {
    try {
      const response = await fetch(`/api/audit-events?companyId=${companyId}`);
      if (!response.ok) throw new Error("audit list failed");
      const data = (await response.json()) as { events?: AuditEvent[] };
      setAuditEvents(data.events ?? []);
    } catch {
      setAuditEvents([]);
    }
  }

  async function refreshTeam() {
    setTeamLoading(true);
    try {
      const response = await fetch("/api/office/members");
      const data = (await response.json()) as { members?: TeamMember[]; invitations?: TeamInvitation[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Equipe indisponível.");
      setTeamMembers(data.members ?? []);
      setTeamInvitations(data.invitations ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar a equipe.");
    } finally {
      setTeamLoading(false);
    }
  }

  async function refreshReviews(preferredScenarioId?: number) {
    if (workspace.type !== "office") return null;
    setReviewLoading(true);
    try {
      const response = await fetch("/api/reviews");
      const data = (await response.json()) as { reviews?: ReviewQueueItem[]; eligibleReviewers?: EligibleReviewer[]; metrics?: ReviewMetrics; permissions?: { canManage: boolean; canReview: boolean }; error?: string };
      if (!response.ok) throw new Error(data.error || "Central de revisão indisponível.");
      const rows = data.reviews ?? [];
      const reviewers = data.eligibleReviewers ?? [];
      const selected = rows.find((review) => review.scenarioId === preferredScenarioId) ?? rows.find((review) => review.id === activeReviewId) ?? rows[0] ?? null;
      setReviewQueue(rows);
      setEligibleReviewers(reviewers);
      if (data.metrics) setReviewMetrics(data.metrics);
      if (data.permissions) setReviewPermissions(data.permissions);
      setActiveReviewId(selected?.id ?? null);
      setAssignmentReviewerId(selected?.assignedReviewerUserId ?? null);
      setAssignmentDueDate(selected?.dueAt ? selected.dueAt.slice(0, 10) : dateInputValue());
      setReviewComment("");
      return { reviews: rows, eligibleReviewers: reviewers };
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar a Central de Revisão.");
      return null;
    } finally {
      setReviewLoading(false);
    }
  }

  async function openReviewCenter(scenarioId?: number) {
    setSection("reviews");
    if (scenarioId) await refreshReviews(scenarioId);
  }

  function selectReview(review: ReviewQueueItem) {
    setActiveReviewId(review.id);
    setAssignmentReviewerId(review.assignedReviewerUserId);
    setAssignmentDueDate(review.dueAt ? review.dueAt.slice(0, 10) : dateInputValue());
    setReviewComment("");
  }

  function changeReviewFilter(filter: typeof reviewFilter) {
    setReviewFilter(filter);
    const first = reviewQueue.find((review) => filter === "all" || (filter === "mine" ? review.status === "pending" && review.assignedReviewerUserId === user.id : review.status === filter));
    if (first) selectReview(first);
  }

  async function submitScenarioReview() {
    if (!reviewSubmissionScenario || !submissionReviewerId || !submissionDueDate) return;
    setReviewMutating(true);
    setMessage("");
    try {
      const response = await fetch("/api/scenarios/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: reviewSubmissionScenario.id, reviewerUserId: submissionReviewerId, dueAt: reviewDueIso(submissionDueDate), note: submissionNote }) });
      const data = (await response.json()) as { scenario?: { id: number; reviewStatus: ReviewStatus }; review?: ReviewQueueItem; error?: string };
      if (!response.ok || !data.scenario) throw new Error(data.error || "Não foi possível enviar a revisão.");
      setSavedScenarios((current) => current.map((scenario) => scenario.id === data.scenario!.id ? { ...scenario, reviewStatus: data.scenario!.reviewStatus } : scenario));
      setCompanies((current) => current.map((company) => company.latestScenario?.id === data.scenario!.id ? { ...company, latestScenario: { ...company.latestScenario, reviewStatus: data.scenario!.reviewStatus } } : company));
      const scenarioId = reviewSubmissionScenario.id;
      setReviewSubmissionScenario(null);
      setSubmissionNote("");
      setMessage("Versão enviada ao revisor designado com prazo e trilha de acompanhamento.");
      await openReviewCenter(scenarioId);
      if (activeCompanyId) void refreshAuditEvents(activeCompanyId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a revisão.");
    } finally {
      setReviewMutating(false);
    }
  }

  async function mutateReview(payload: Record<string, unknown>) {
    const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Não foi possível atualizar a revisão.");
    return data;
  }

  async function addReviewComment() {
    if (!activeReview || reviewComment.trim().length < 2) return;
    setReviewMutating(true);
    try {
      await mutateReview({ action: "comment", reviewRoundId: activeReview.id, body: reviewComment });
      setReviewComment("");
      await refreshReviews(activeReview.scenarioId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar o comentário.");
    } finally {
      setReviewMutating(false);
    }
  }

  async function reassignReview() {
    if (!activeReview || !assignmentReviewerId || !assignmentDueDate) return;
    setReviewMutating(true);
    try {
      await mutateReview({ action: "assign", reviewRoundId: activeReview.id, reviewerUserId: assignmentReviewerId, dueAt: reviewDueIso(assignmentDueDate) });
      setMessage("Responsável e prazo da revisão atualizados.");
      await refreshReviews(activeReview.scenarioId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível reatribuir a revisão.");
    } finally {
      setReviewMutating(false);
    }
  }

  async function decideReview() {
    if (!reviewDecision || decisionNote.trim().length < 10) return;
    setReviewMutating(true);
    try {
      await mutateReview({ action: "decide", reviewRoundId: reviewDecision.review.id, decision: reviewDecision.decision, note: decisionNote });
      const scenarioId = reviewDecision.review.scenarioId;
      const decision = reviewDecision.decision;
      setSavedScenarios((current) => current.map((scenario) => scenario.id === scenarioId ? { ...scenario, reviewStatus: decision } : scenario));
      setCompanies((current) => current.map((company) => company.latestScenario?.id === scenarioId ? { ...company, latestScenario: { ...company.latestScenario, reviewStatus: decision } } : company));
      setReviewDecision(null);
      setDecisionNote("");
      setMessage(decision === "changes_requested" ? "Correções solicitadas. A versão original foi preservada." : "Versão rejeitada e preservada na trilha.");
      await refreshReviews(scenarioId);
      if (activeCompanyId) void refreshAuditEvents(activeCompanyId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a decisão.");
    } finally {
      setReviewMutating(false);
    }
  }

  function startCorrectedVersion(review: ReviewQueueItem) {
    setCorrectionSourceScenarioId(review.scenarioId);
    changeActiveCompany(review.companyId);
    loadScenario(review.scenario, false);
    setScenarioName(`${review.scenario.name} · correção`);
    setSection("simulator");
    setMessage("Você está criando uma nova versão vinculada. A versão devolvida não será alterada.");
  }

  async function inviteTeamMember() {
    setTeamLoading(true);
    setCreatedInviteUrl("");
    setMessage("");
    try {
      const response = await fetch("/api/office/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
      const data = (await response.json()) as { invitation?: TeamInvitation; error?: string };
      if (!response.ok || !data.invitation?.url) throw new Error(data.error || "Não foi possível criar o convite.");
      setCreatedInviteUrl(data.invitation.url);
      setInviteEmail("");
      try { await navigator.clipboard.writeText(data.invitation.url); } catch { /* The link remains visible for manual copying. */ }
      setMessage("Convite criado e copiado. Ele expira em 7 dias.");
      await refreshTeam();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o convite.");
    } finally {
      setTeamLoading(false);
    }
  }

  async function revokeTeamInvitation(invitation: TeamInvitation) {
    try {
      const response = await fetch(`/api/office/members?id=${invitation.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Não foi possível revogar o convite.");
      setTeamInvitations((current) => current.filter((item) => item.id !== invitation.id));
      setMessage("Convite revogado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível revogar o convite.");
    }
  }

  async function changeTeamMemberRole(member: TeamMember, role: TeamInvitation["role"]) {
    try {
      const response = await fetch("/api/office/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: member.id, role }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível alterar o papel.");
      setTeamMembers((current) => current.map((item) => item.id === member.id ? { ...item, role } : item));
      setMessage(`Papel de ${member.name} atualizado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível alterar o papel.");
    }
  }

  async function removeTeamMember(member: TeamMember) {
    if (!window.confirm(`Remover ${member.name} do escritório? A pessoa continuará com uma conta individual, sem acesso à carteira compartilhada.`)) return;
    try {
      const response = await fetch(`/api/office/members?memberId=${member.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível remover o membro.");
      setTeamMembers((current) => current.filter((item) => item.id !== member.id));
      setMessage(`${member.name} foi removido do escritório e recebeu um espaço individual.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível remover o membro.");
    }
  }

  async function upgradeToOffice() {
    setUpgradingWorkspace(true);
    setMessage("");
    try {
      const response = await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: officeUpgradeName }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível ativar o modo escritório.");
      window.location.assign("/app");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível ativar o modo escritório.");
      setUpgradingWorkspace(false);
    }
  }

  function resetScenarioFields() {
    setRevenue(100000);
    setCurrentRate(8.65);
    setNewRate(13.45);
    setCostRate(65);
    setFixedCosts(10000);
    setVolumeLoss(0);
    setPriceAdjustment(0);
    setScenarioName("Primeiro cenário · 2027");
    setTargetYear(2027);
    setRateSource("custom");
    setSourceNote("Premissa recebida do cliente e registrada pelo escritório; conferir incidência e créditos antes da aprovação.");
  }

  async function saveScenario() {
    if (!activeCompanyId) {
      setMessage("Cadastre ou selecione uma empresa antes de salvar.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const scenarioPayload = {
        name: scenarioName,
        companyId: activeCompanyId,
        revenueCents: Math.round(revenue * 100),
        currentRateBps: Math.round(currentRate * 100),
        newRateBps: Math.round(newRate * 100),
        costRateBps: Math.round(costRate * 100),
        fixedCostsCents: Math.round(fixedCosts * 100),
        volumeLossBps: Math.round(volumeLoss * 100),
        priceAdjustmentBps: Math.round(priceAdjustment * 100),
        targetYear,
        rateSource,
        sourceNote,
        supersedesScenarioId: correctionSourceScenarioId,
      };
      const fingerprint = JSON.stringify(scenarioPayload);
      const clientRequestId = pendingScenarioRequest.current?.fingerprint === fingerprint ? pendingScenarioRequest.current.id : createClientRequestId();
      pendingScenarioRequest.current = { fingerprint, id: clientRequestId };
      const response = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scenarioPayload, clientRequestId }),
      });
      const data = (await response.json()) as { scenario?: SavedScenario; replayed?: boolean; error?: string };
      if (!response.ok || !data.scenario) throw new Error(data.error || "save failed");
      const savedScenario = data.scenario;
      pendingScenarioRequest.current = null;
      const correctedVersion = correctionSourceScenarioId !== null;
      setCorrectionSourceScenarioId(null);
      setSavedScenarios((current) => [savedScenario, ...current.filter((scenario) => scenario.id !== savedScenario.id)].slice(0, 8));
      setCompanies((current) => current.map((company) => company.id === activeCompanyId ? { ...company, latestScenario: savedScenario } : company));
      setMessage(data.replayed ? "A tentativa anterior já havia sido salva; o sistema recuperou a mesma versão sem duplicar o cenário." : correctedVersion ? `Versão corretiva vinculada e assinada no motor ${savedScenario.calculationVersion}. Envie-a para uma nova rodada de revisão.` : `Versão congelada e assinada no motor ${savedScenario.calculationVersion}. Agora inicie a revisão interna.`);
      void refreshAuditEvents(activeCompanyId);
      if (correctedVersion) void refreshReviews(savedScenario.id);
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "save failed" ? error.message : "Não foi possível salvar agora. A prévia continua disponível nesta tela.");
    } finally {
      setSaving(false);
    }
  }

  function loadScenario(item: SavedScenario, notify = true) {
    if (item.integrityStatus === "invalid") {
      setMessage("Este registro foi bloqueado porque a assinatura criptográfica não confere.");
      return;
    }
    setRevenue(item.revenueCents / 100);
    setCurrentRate(item.currentRateBps / 100);
    setNewRate(item.newRateBps / 100);
    setCostRate(item.costRateBps / 100);
    setFixedCosts((item.fixedCostsCents ?? 0) / 100);
    setVolumeLoss((item.volumeLossBps ?? 0) / 100);
    setPriceAdjustment((item.priceAdjustmentBps ?? 0) / 100);
    setScenarioName(item.name);
    setTargetYear(item.targetYear ?? 2027);
    setRateSource(item.rateSource === "accountant" ? "accountant" : "custom");
    setSourceNote(item.rateSource === "legacy_unverified" ? "Registro legado carregado. Descreva a fonte e salve uma nova versão." : item.sourceNote);
    if (notify) setMessage("Cenário carregado.");
  }

  async function markReadyForReview(item: SavedScenario) {
    if (workspace.type === "office") {
      const loaded = eligibleReviewers.length ? null : await refreshReviews();
      const reviewers = loaded?.eligibleReviewers ?? eligibleReviewers;
      setReviewSubmissionScenario(item);
      setSubmissionReviewerId(reviewers.find((reviewer) => reviewer.userId !== item.preparedByUserId)?.userId ?? null);
      setSubmissionDueDate(dateInputValue());
      setSubmissionNote("");
      return;
    }
    setReviewingScenarioId(item.id);
    setMessage("");
    try {
      const response = await fetch("/api/scenarios/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: item.id }) });
      const data = (await response.json()) as { scenario?: { id: number; reviewStatus: ReviewStatus }; error?: string };
      if (!response.ok || !data.scenario) throw new Error(data.error || "review failed");
      setSavedScenarios((current) => current.map((scenario) => scenario.id === item.id ? { ...scenario, reviewStatus: data.scenario!.reviewStatus } : scenario));
      setCompanies((current) => current.map((company) => company.latestScenario?.id === item.id ? { ...company, latestScenario: { ...company.latestScenario, reviewStatus: data.scenario!.reviewStatus } } : company));
      setMessage("Revisão interna iniciada. Confira as premissas e, ao concluir, aprove como responsável técnico.");
      if (activeCompanyId) void refreshAuditEvents(activeCompanyId);
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "review failed" ? error.message : "Não foi possível iniciar a revisão interna.");
    } finally {
      setReviewingScenarioId(null);
    }
  }

  function openResponsibleApproval(item: SavedScenario) {
    const previousRegistration = savedScenarios.find((scenario) => scenario.approval?.professionalRegistration)?.approval?.professionalRegistration ?? "";
    setProfessionalRegistration(previousRegistration);
    setApprovalNote("");
    setApprovalAcknowledged(false);
    setApprovalError("");
    setApprovalScenario(item);
    setMessage("");
  }

  async function approveAsResponsible() {
    if (!approvalScenario) return;
    const registrationError = professionalRegistrationError(professionalRegistration);
    if (registrationError) {
      setApprovalError(registrationError);
      return;
    }
    if (!approvalAcknowledged) {
      setApprovalError("Confirme a declaração de responsabilidade para assinar esta versão.");
      return;
    }
    setApprovingScenarioId(approvalScenario.id);
    setApprovalError("");
    setMessage("");
    try {
      const response = await fetch("/api/scenarios/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: approvalScenario.id,
          professionalRegistration: normalizeProfessionalRegistration(professionalRegistration),
          decisionNote: approvalNote,
          acknowledged: approvalAcknowledged,
        }),
      });
      const data = (await response.json()) as { scenario?: { id: number; reviewStatus: ReviewStatus; approval: ScenarioApproval }; error?: string };
      if (!response.ok || !data.scenario) throw new Error(data.error || "approval failed");
      const confirmed = activeCompanyId ? await refreshScenarioAfterApproval(activeCompanyId, data.scenario.id) : null;
      if (!confirmed || !["responsible_approved", "delivered"].includes(confirmed.reviewStatus) || confirmed.approval?.integrityStatus !== "verified") throw new Error("A aprovação foi recebida, mas a confirmação assinada ainda não voltou do servidor. Tente novamente; a entrega permanece protegida.");
      setApprovalScenario(null);
      setProfessionalRegistration(confirmed.approval.professionalRegistration);
      setMessage(workspace.type === "office" ? "Segunda revisão concluída e assinada. O relatório identifica separadamente quem preparou e quem revisou." : "Revisão concluída e assinada. O relatório agora pode ser entregue ao cliente como revisado pelo responsável.");
      if (activeCompanyId) void refreshAuditEvents(activeCompanyId);
      if (workspace.type === "office") void refreshReviews(data.scenario.id);
    } catch (error) {
      const errorMessage = error instanceof Error && error.message !== "approval failed" ? error.message : "Não foi possível registrar a revisão responsável.";
      setApprovalError(errorMessage);
      setMessage(errorMessage);
    } finally {
      setApprovingScenarioId(null);
    }
  }

  async function deleteScenario(item: SavedScenario) {
    if (!window.confirm(`Excluir o cenário “${item.name}”?`)) return;
    try {
      const response = await fetch(`/api/scenarios?id=${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      setSavedScenarios((current) => current.filter((scenario) => scenario.id !== item.id));
      setComparisonIds((current) => current.filter((id) => id !== item.id));
      setReportShares((current) => current.filter((share) => share.scenarioId !== item.id));
      setMessage("Cenário excluído.");
      void refreshCompanies();
      if (activeCompanyId) void refreshAuditEvents(activeCompanyId);
    } catch {
      setMessage("Não foi possível excluir o cenário agora.");
    }
  }

  async function createReportShare(item: SavedScenario) {
    setCreatingShareId(item.id);
    setMessage("");
    try {
      const response = await fetch("/api/report-shares", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: item.id, expiryDays: 30 }) });
      const data = (await response.json()) as { share?: ReportShare; scenarioReviewStatus?: ReviewStatus; error?: string };
      if (!response.ok || !data.share) throw new Error(data.error || "share failed");
      const share = { ...data.share, scenarioName: item.name };
      setReportShares((current) => [share, ...current.map((row) => row.scenarioId === item.id && !row.revokedAt ? { ...row, revokedAt: new Date().toISOString() } : row)]);
      if (data.scenarioReviewStatus) {
        setSavedScenarios((current) => current.map((scenario) => scenario.id === item.id ? { ...scenario, reviewStatus: data.scenarioReviewStatus! } : scenario));
        setCompanies((current) => current.map((company) => company.latestScenario?.id === item.id ? { ...company, latestScenario: { ...company.latestScenario, reviewStatus: data.scenarioReviewStatus! } } : company));
      }
      try { await navigator.clipboard.writeText(share.url); } catch { /* The link remains available in the sharing center. */ }
      setMessage("Link seguro gerado e copiado. Ele expira em 30 dias.");
      if (activeCompanyId) void refreshAuditEvents(activeCompanyId);
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "share failed" ? error.message : "Não foi possível gerar o link agora.");
    } finally {
      setCreatingShareId(null);
    }
  }

  async function copyReportShare(share: ReportShare) {
    try {
      await navigator.clipboard.writeText(share.url);
      setMessage("Link do relatório copiado.");
    } catch {
      setMessage("Abra o relatório e copie o endereço do navegador.");
    }
  }

  async function revokeReportShare(share: ReportShare) {
    if (!window.confirm(`Revogar o link do cenário “${share.scenarioName}”?`)) return;
    try {
      const response = await fetch(`/api/report-shares?id=${share.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("revoke failed");
      setReportShares((current) => current.map((row) => row.id === share.id ? { ...row, revokedAt: new Date().toISOString() } : row));
      setMessage("Link revogado. O cliente não poderá mais abrir o relatório.");
      if (activeCompanyId) void refreshAuditEvents(activeCompanyId);
    } catch {
      setMessage("Não foi possível revogar o link agora.");
    }
  }

  function exportScenarioReport() {
    const rows = [
      ["Relatório Margem Clara", scenarioName],
      ["Empresa", activeCompany?.name ?? "Não selecionada"],
      ["Regime tributário", activeCompany?.taxRegime ?? "Não informado"],
      ["Ano-alvo", String(targetYear)],
      ["Origem da alíquota", rateSourceLabel(rateSource)],
      ["Nota de origem", sourceNote],
      ["Estado", "Prévia local ainda não congelada nem validada"],
      ["Premissa", "Valor"],
      ["Receita mensal", revenue.toFixed(2)],
      ["Alíquota atual", `${currentRate.toFixed(2)}%`],
      ["Alíquota IBS + CBS informada", `${newRate.toFixed(2)}%`],
      ["Custos variáveis", `${costRate.toFixed(2)}%`],
      ["Custos fixos mensais", fixedCosts.toFixed(2)],
      ["Reajuste simulado", `${priceAdjustment.toFixed(2)}%`],
      ["Queda de volume estimada", `${volumeLoss.toFixed(2)}%`],
      ["Margem atual", figures.currentMargin.toFixed(2)],
      ["Margem projetada", figures.projectedMargin.toFixed(2)],
      ["Reajuste de equilíbrio", `${figures.requiredPriceIncrease.toFixed(2)}%`],
      ["Ponto de equilíbrio", Number.isFinite(figures.breakEvenRevenue) ? figures.breakEvenRevenue.toFixed(2) : "Inviável"],
      ["Margem de segurança", `${figures.marginOfSafetyRate.toFixed(2)}%`],
      ["Perda máxima de volume", `${figures.maxVolumeLoss.toFixed(2)}%`],
      ["Impacto anual", figures.annualImpact.toFixed(2)],
      ["Observação", "Prévia técnica. Não representa validação contábil ou fiscal."],
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `margem-clara-${scenarioName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cenario"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Relatório exportado em CSV.");
  }

  function useAuditedInvoiceTotal(totalCents: number) {
    if (!Number.isSafeInteger(totalCents) || totalCents <= 0) return;
    setRevenue(totalCents / 100);
    setScenarioName("Cenário a partir de NF-e auditada");
    setPriceAdjustment(0);
    setSection("simulator");
    setMessage("Total da NF-e auditada aplicado ao simulador. Confirme se o documento representa toda a receita do cenário.");
  }

  function toggleComparison(id: number) {
    setComparisonIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 2) {
        setMessage("O comparador aceita até dois cenários. Remova um para continuar.");
        return current;
      }
      return [...current, id];
    });
  }

  async function createCompany() {
    setCreatingCompany(true);
    setMessage("");
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm),
      });
      if (!response.ok) throw new Error("create failed");
      const data = (await response.json()) as { company: Company };
      setCompanies((current) => [...current, data.company].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      changeActiveCompany(data.company.id);
      setCompanyForm({ name: "", cnpj: "", taxRegime: "Simples Nacional", sector: "Serviços B2B" });
      setShowCompanyForm(false);
      setSection("simulator");
      setMessage("Cliente cadastrado. Crie a primeira análise para iniciar o trabalho técnico.");
    } catch {
      setMessage("Revise os dados. O CNPJ deve conter 14 dígitos quando informado.");
    } finally {
      setCreatingCompany(false);
    }
  }

  function openCompany(companyId: number, target: Section = "overview") {
    changeActiveCompany(companyId);
    setSection(target);
    setMessage("");
  }

  function selectDemo(index: number) {
    setDemoIndex(index);
    setDemoStep(0);
    setDemoPlaying(true);
  }

  function toggleDemoPlayback() {
    if (demoStep === activeDemo.steps.length - 1 && !demoPlaying) setDemoStep(0);
    setDemoPlaying((current) => !current);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand" aria-label="Margem Clara">
          <span className="brand-mark">mc</span>
          <span>margem<span>clara</span></span>
        </div>

        <nav className="main-nav" aria-label="Navegação principal">
          <button className={section === "overview" ? "active" : ""} onClick={() => setSection("overview")}>
            <span className="nav-icon">⌂</span>Visão geral
          </button>
          <button className={section === "companies" ? "active" : ""} onClick={() => setSection("companies")}>
            <span className="nav-icon">▦</span>Clientes
          </button>
          <button className={section === "simulator" ? "active" : ""} onClick={() => setSection("simulator")}>
            <span className="nav-icon">↗</span>Análises
          </button>
          {workspace.type === "office" && <button className={section === "reviews" ? "active" : ""} onClick={() => setSection("reviews")}>
            <span className="nav-icon">✓</span>Central de revisão
          </button>}
          <button className={section === "documents" ? "active" : ""} onClick={() => setSection("documents")}>
            <span className="nav-icon">▤</span>Documentos
          </button>
          <button className={section === "team" ? "active" : ""} onClick={() => setSection("team")}>
            <span className="nav-icon">◎</span>{workspace.type === "office" ? "Equipe" : "Modo de trabalho"}
          </button>
          <button className={section === "intelligence" ? "active" : ""} onClick={() => setSection("intelligence")}>
            <span className="nav-icon">⌕</span>Inteligência fiscal
          </button>
          <button className={section === "rules" ? "active" : ""} onClick={() => setSection("rules")}>
            <span className="nav-icon">§</span>Regras fiscais
          </button>
          <button className={section === "determination" ? "active" : ""} onClick={() => setSection("determination")}>
            <span className="nav-icon">≋</span>Apuração fiscal
          </button>
          <button className={section === "academy" ? "active" : ""} onClick={() => setSection("academy")}>
            <span className="nav-icon">▷</span>Demonstrações
          </button>
        </nav>

        <div className="sidebar-insight">
          <span className="eyebrow">Cobertura da carteira</span>
          <strong>{portfolioInsights.analyzed} de {companies.length} analisadas</strong>
          <div className="progress-track"><span style={{ width: `${companies.length ? (portfolioInsights.analyzed / companies.length) * 100 : 0}%` }} /></div>
          <p>{portfolioInsights.pending ? `${portfolioInsights.pending} cliente${portfolioInsights.pending > 1 ? "s" : ""} sem análise.` : "Toda a carteira possui análise."}</p>
        </div>

        <a className="support-button methodology-link" href="/metodologia"><span>✓</span> Metodologia</a>
        <button className="support-button" onClick={() => setSection("academy")}><span>?</span> Central de ajuda</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="company-label">{workspace.type === "office" ? "CLIENTE ATIVO DO ESCRITÓRIO" : "CLIENTE ATIVO"}</p>
            <select className="company-select" aria-label="Cliente analisado" value={activeCompanyId ?? ""} onChange={(event) => changeActiveCompany(Number(event.target.value))}>
              {!companies.length && <option value="">Carregando carteira…</option>}
              {companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}
            </select>
          </div>
          <div className="topbar-actions">
            <span className={`workspace-chip ${workspace.type}`}><i />{workspace.type === "office" ? workspace.name : "Modo independente"}</span>
            <span className="year-chip"><i /> Ano {targetYear} · {rateSource === "accountant" ? "fonte: contador" : "premissa informada"}</span>
            <button className="notification" aria-label="Notificações" onClick={() => workspace.type === "office" && setSection("reviews")}>{workspace.type === "office" && reviewMetrics.mine ? reviewMetrics.mine : "•"}</button>
            <div className="account-summary">
              <div className="avatar" aria-label={`Perfil de ${user.displayName}`}>{userInitials}</div>
              <span><b>{user.displayName.split(" ")[0]}</b><small>{workspace.role === "owner" ? "Proprietário" : workspace.role === "admin" ? "Administrador" : workspace.role === "reviewer" ? "Revisor" : "Preparador"} · <a href="/planos">Plano</a> · <a href={signOutPath}>Sair</a></small></span>
            </div>
          </div>
        </header>

        {section === "companies" && (
          <div className="page-content companies-page">
            <div className="page-heading">
              <div><p className="kicker">CARTEIRA DO ESCRITÓRIO</p><h1>Clientes monitorados</h1><p>Organize cada empresa atendida, priorize riscos e preserve a responsabilidade por versão.</p></div>
              <button className="primary-button" onClick={() => setShowCompanyForm((current) => !current)} disabled={!canPrepare}>{canPrepare ? showCompanyForm ? "Fechar cadastro" : "Adicionar cliente" : "Acesso somente para revisão"}</button>
            </div>

            {message && <div className="toast" role="status">{message}</div>}

            {showCompanyForm && canPrepare && <form className="panel company-form" onSubmit={(event) => { event.preventDefault(); void createCompany(); }}>
              <div className="panel-heading"><div><span className="eyebrow">NOVO CLIENTE</span><h3>Dados essenciais da empresa</h3></div><span className="editable-chip">Carteira privada</span></div>
              <div className="company-form-grid">
                <label>Razão social<input required value={companyForm.name} onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Horizonte Serviços Ltda." /></label>
                <label>CNPJ (opcional)<input inputMode="numeric" value={companyForm.cnpj} onChange={(event) => setCompanyForm((current) => ({ ...current, cnpj: event.target.value.replace(/\D/g, "").slice(0, 14) }))} placeholder="14 dígitos" /></label>
                <label>Regime tributário<select value={companyForm.taxRegime} onChange={(event) => setCompanyForm((current) => ({ ...current, taxRegime: event.target.value }))}><option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option><option>MEI</option></select></label>
                <label>Setor<input required value={companyForm.sector} onChange={(event) => setCompanyForm((current) => ({ ...current, sector: event.target.value }))} placeholder="Ex.: Distribuição B2B" /></label>
              </div>
              <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowCompanyForm(false)}>Cancelar</button><button className="primary-button" disabled={creatingCompany || !companyForm.name.trim() || !companyForm.sector.trim()}>{creatingCompany ? "Cadastrando…" : "Cadastrar e analisar"}</button></div>
            </form>}

            <section className="portfolio-metrics" aria-label="Indicadores da carteira">
              <article><span>Clientes</span><strong>{companies.length}</strong><small>{portfolioInsights.analyzed} com análise salva</small></article>
              <article className="risk"><span>Margem em risco</span><strong>{portfolioInsights.atRisk}</strong><small>Precisam de ação comercial</small></article>
              <article className="protected"><span>Margem protegida</span><strong>{portfolioInsights.protected}</strong><small>Reajuste suficiente</small></article>
              <article><span>Receita monitorada</span><strong>{compactCurrency.format(portfolioInsights.revenue)}</strong><small>Últimos cenários da carteira</small></article>
            </section>

            <section className="company-grid">
              {companies.map((company) => {
                const latest = company.latestScenario;
                const integrityBlocked = latest?.integrityStatus === "invalid";
                const values = latest && !integrityBlocked ? resolveStoredScenarioValues(latest) : null;
                const protectedMargin = values ? values.projectedMargin >= values.currentMargin : false;
                return <article className={`company-card ${activeCompanyId === company.id ? "active-company" : ""}`} key={company.id}>
                  <div className="company-card-top"><span className="company-monogram">{company.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className={`portfolio-status ${integrityBlocked ? "risk" : !values ? "pending" : protectedMargin ? "protected" : "risk"}`}>{integrityBlocked ? "Registro bloqueado" : !values ? "Sem análise" : protectedMargin ? "Protegida" : "Em risco"}</span></div>
                  <h2>{company.name}</h2>
                  <p>{formatCnpj(company.cnpj)} · {company.taxRegime}</p>
                  <span className="sector-chip">{company.sector}</span>
                  {values ? <div className="company-analysis"><div><span>Receita</span><strong>{compactCurrency.format(latest!.revenueCents / 100)}</strong></div><div><span>Margem projetada</span><strong>{values.projectedMarginRate.toFixed(1).replace(".", ",")}%</strong></div><div><span>Reajuste</span><strong>{((latest!.priceAdjustmentBps ?? 0) / 100).toFixed(1).replace(".", ",")}%</strong></div></div> : <div className="company-empty-analysis">{integrityBlocked ? "A assinatura não confere. Regrave as premissas em uma nova versão." : "Crie o primeiro cenário para medir o risco tributário."}</div>}
                  <div className="company-actions"><button onClick={() => openCompany(company.id, "overview")}>Abrir painel</button><button onClick={() => openCompany(company.id, "simulator")}>{values ? "Novo cenário" : "Analisar agora"}</button></div>
                </article>;
              })}
            </section>
          </div>
        )}

        {section === "overview" && (
          <div className="page-content">
            <div className="page-heading">
              <div>
                <p className="kicker">EMPRESA ATIVA · {activeCompany?.taxRegime?.toUpperCase() ?? "CARREGANDO"}</p>
                <h1>{activeCompany?.name ?? "Selecione um cliente"}</h1>
                <p>Acompanhe o impacto estimado da transição tributária neste cliente.</p>
              </div>
              <button className="primary-button" onClick={() => setSection("simulator")}>Abrir simulador <span>→</span></button>
            </div>

            <section className="impact-banner">
              <div className="impact-symbol">↘</div>
              <div>
                <span className="eyebrow">ALERTA DE MARGEM</span>
                <h2>{figures.projectedMargin < figures.currentMargin ? `Margem pode cair ${Math.abs(figures.currentMarginRate - figures.projectedMarginRate).toFixed(1).replace(".", ",")} p.p.` : "O reajuste informado protege a margem"}</h2>
                <p>Compare a carga estimada e teste o reajuste necessário antes de renovar contratos ou tabelas de preço.</p>
              </div>
              <button onClick={() => setSection("simulator")}>Ver recomendações</button>
            </section>

            <section className="metrics-grid" aria-label="Indicadores principais">
              <article className="metric-card">
                <span>Receita analisada</span>
                <strong>{currency.format(revenue)}</strong>
                <small><b>{savedScenarios.length ? "Cenário atualizado" : "Estimativa inicial"}</b> para {activeCompany?.sector ?? "a operação"}</small>
              </article>
              <article className="metric-card">
                <span>Tributos no cenário atual</span>
                <strong>{currency.format(figures.currentTax)}</strong>
                <small>Alíquota efetiva de {currentRate.toFixed(2).replace(".", ",")}%</small>
              </article>
              <article className="metric-card accent-card">
                <span>Projeção IBS + CBS</span>
                <strong>{currency.format(figures.projectedTax)}</strong>
                <small><b>+ {currency.format(figures.delta)}</b> de exposição</small>
              </article>
              <article className="metric-card">
                <span>Margem projetada</span>
                <strong>{figures.projectedMarginRate.toFixed(1).replace(".", ",")}%</strong>
                <small><em>↓ {(figures.currentMarginRate - figures.projectedMarginRate).toFixed(1).replace(".", ",")} p.p.</em> sem reajuste</small>
              </article>
            </section>

            <div className="overview-grid">
              <section className="panel chart-panel">
                <div className="panel-heading">
                  <div><span className="eyebrow">EVOLUÇÃO MENSAL</span><h3>Tributos sobre receita</h3></div>
                  <div className="legend"><span className="current-dot" /> Atual <span className="future-dot" /> Projetado</div>
                </div>
                <div className="chart" aria-label="Comparação mensal entre tributos atuais e projetados">
                  {[42, 48, 45, 56, 52, 61, 58, 66, 62, 72, 68, 78].map((height, index) => (
                    <div className="bar-group" key={index}>
                      <div className="bars"><span style={{ height: `${height}%` }} /><span style={{ height: `${height + 16}%` }} /></div>
                      <small>{["Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"][index]}</small>
                    </div>
                  ))}
                </div>
                <div className="chart-summary">
                  <span>Exposição anual estimada</span><strong>{compactCurrency.format(figures.delta * 12)}</strong><small>se o faturamento permanecer estável</small>
                </div>
              </section>

              <section className="panel actions-panel">
                <div className="panel-heading"><div><span className="eyebrow">PRÓXIMAS AÇÕES</span><h3>O que merece atenção</h3></div><span className="count-badge">3</span></div>
                <button onClick={() => setSection("simulator")} className="action-row">
                  <span className="action-icon urgent">!</span><span><b>Revisar preço da consultoria</b><small>Impacto potencial de R$ 3,8 mil/mês</small></span><i>→</i>
                </button>
                <button onClick={() => setSection("documents")} className="action-row">
                  <span className="action-icon">▤</span><span><b>Classificar 3 notas de entrada</b><small>Créditos ainda não considerados</small></span><i>→</i>
                </button>
                <button onClick={() => setSection("simulator")} className="action-row">
                  <span className="action-icon good">✓</span><span><b>Comparar cenários de crédito</b><small>Economia possível de R$ 1,2 mil/mês</small></span><i>→</i>
                </button>
              </section>
            </div>

            <section className="panel product-panel">
              <div className="panel-heading"><div><span className="eyebrow">POR CATEGORIA</span><h3>Onde o impacto se concentra</h3></div><button className="text-button" onClick={() => setSection("simulator")}>Analisar tudo →</button></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Receita</th><th>Participação</th><th>Atual</th><th>Projetado</th><th>Impacto mensal</th></tr></thead>
                  <tbody>{products.map((product) => <tr key={product.name}><td><b>{product.name}</b></td><td>{product.share}</td><td>{product.current}</td><td>{product.projected}</td><td><span className={`impact-pill ${product.tone}`}>{product.impact}</span></td></tr>)}</tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {section === "simulator" && (
          <div className="page-content simulator-page">
            <div className="page-heading">
              <div><p className="kicker">ANÁLISE TRIBUTÁRIA CONTROLADA · {activeCompany?.name?.toUpperCase() ?? "EMPRESA"}</p><h1>Análise de impacto tributário</h1><p>Registre premissas, origem e ano-alvo. Cada versão salva fica congelada e auditável.</p></div>
              <div className="heading-actions"><button className="secondary-button" onClick={exportScenarioReport}>Exportar prévia</button><button className="primary-button" onClick={saveScenario} disabled={!canPrepare || saving || !scenarioName.trim() || revenue < 1000 || sourceNote.trim().length < 10}>{!canPrepare ? "Acesso somente para revisão" : saving ? "Salvando…" : "Salvar versão"}</button></div>
            </div>

            {message && <div className="toast" role="status">{message}</div>}
            {correctionSourceScenarioId && <div className="correction-banner"><span>↺</span><div><b>Nova versão corretiva</b><p>Você pode alterar as premissas sem reescrever a versão #{correctionSourceScenarioId}. Ao salvar, o vínculo e uma nova rodada serão preservados.</p></div><button type="button" onClick={() => setCorrectionSourceScenarioId(null)}>Cancelar correção</button></div>}

            <div className="simulator-grid">
              <section className="panel assumptions-panel">
                <div className="panel-heading"><div><span className="eyebrow">PREMISSAS</span><h3>Configure o cenário</h3></div><span className="editable-chip">Editável</span></div>
                <label>Nome do cenário<input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /></label>
                <div className="field-row reliability-fields">
                  <label>Ano-alvo<select value={targetYear} onChange={(event) => setTargetYear(Number(event.target.value))}>{[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033].map((year) => <option value={year} key={year}>{year}</option>)}</select></label>
                  <label>Origem da alíquota<select value={rateSource} onChange={(event) => setRateSource(event.target.value as Exclude<RateSource, "legacy_unverified">)}><option value="custom">Informada pelo cliente</option><option value="accountant">Definida pelo escritório</option></select></label>
                </div>
                <label>Registro da fonte<textarea minLength={10} maxLength={400} value={sourceNote} onChange={(event) => setSourceNote(event.target.value)} placeholder="Documento, memória de cálculo, nome do responsável ou hipótese usada." /></label>
                {targetYear === 2026 && <p className="reliability-warning"><b>Atenção a 2026:</b> é ano de teste da CBS e do IBS. A alíquota deste campo é uma premissa informada e não é tratada pelo sistema como alíquota oficial homologada.</p>}
                <div className="field-row">
                  <label>Receita mensal (R$)<input type="number" min="1000" step="1000" value={revenue} onChange={(event) => setRevenue(Number(event.target.value))} /></label>
                  <label>Reajuste de preço (%)<input type="number" min="0" max="100" step="0.1" value={priceAdjustment} onChange={(event) => setPriceAdjustment(Number(event.target.value))} /></label>
                </div>
                <div className="field-row">
                  <label>Alíquota atual (%)<input type="number" min="0" max="100" step="0.05" value={currentRate} onChange={(event) => setCurrentRate(Number(event.target.value))} /></label>
                  <label>Alíquota IBS + CBS projetada (%)<input type="number" min="0" max="99" step="0.05" value={newRate} onChange={(event) => setNewRate(Number(event.target.value))} /></label>
                </div>
                <div className="field-row">
                  <label>Custos fixos mensais (R$)<input type="number" min="0" step="500" value={fixedCosts} onChange={(event) => setFixedCosts(Number(event.target.value))} /></label>
                  <label>Queda esperada no volume (%)<input type="number" min="0" max="95" step="0.5" value={volumeLoss} onChange={(event) => setVolumeLoss(Number(event.target.value))} /></label>
                </div>
                <label>Custos variáveis (% da receita)<input type="range" min="0" max="95" step="0.1" value={costRate} onChange={(event) => setCostRate(Number(event.target.value))} /><span className="range-value">{costRate.toFixed(1).replace(".", ",")}%</span></label>
                <p className="helper-text">O motor calcula no servidor ao salvar, registra um hash SHA-256 das entradas e congela o resultado. A origem informada não substitui a conferência de incidência, créditos e enquadramento.</p>
              </section>

              <section className="panel result-panel">
                <div className="result-header"><span>Prévia técnica</span><small>Ainda não congelada</small></div>
                <strong className="result-number">{currency.format(figures.projectedMargin)}</strong>
                <p>margem líquida de <b>{figures.projectedMarginRate.toFixed(1).replace(".", ",")}%</b></p>
                <div className="comparison-bars">
                  <div><span>Margem atual</span><b>{currency.format(figures.currentMargin)}</b><i><em style={{ width: `${Math.min(100, Math.max(figures.currentMarginRate, 2))}%` }} /></i></div>
                  <div><span>Margem projetada</span><b>{currency.format(figures.projectedMargin)}</b><i><em className="projected" style={{ width: `${Math.min(100, Math.max(figures.projectedMarginRate, 2))}%` }} /></i></div>
                </div>
                <div className="recommendation">
                  <span>RECOMENDAÇÃO</span>
                  <b>Reajuste de equilíbrio: {figures.requiredPriceIncrease.toFixed(1).replace(".", ",")}%</b>
                  <p>Preserva o resultado mensal mesmo com {volumeLoss.toFixed(1).replace(".", ",")}% de queda no volume informado.</p>
                  <button onClick={() => setPriceAdjustment(Number(figures.requiredPriceIncrease.toFixed(2)))}>Aplicar reajuste sugerido</button>
                </div>
              </section>
            </div>

            <section className="decision-metrics-grid" aria-label="Indicadores de decisão">
              <article><span>PONTO DE EQUILÍBRIO</span><strong>{Number.isFinite(figures.breakEvenRevenue) ? currency.format(figures.breakEvenRevenue) : "Inviável"}</strong><small>receita mínima para cobrir custos e tributos</small></article>
              <article className={figures.marginOfSafetyRate >= 15 ? "good" : "risk"}><span>MARGEM DE SEGURANÇA</span><strong>{figures.marginOfSafetyRate.toFixed(1).replace(".", ",")}%</strong><small>{figures.marginOfSafetyRate >= 0 ? "receita acima do ponto de equilíbrio" : "receita abaixo do ponto de equilíbrio"}</small></article>
              <article><span>PERDA MÁXIMA DE VOLUME</span><strong>{figures.maxVolumeLoss.toFixed(1).replace(".", ",")}%</strong><small>limite para ainda preservar o resultado atual</small></article>
              <article className={figures.annualImpact >= 0 ? "good" : "risk"}><span>IMPACTO EM 12 MESES</span><strong>{figures.annualImpact >= 0 ? "+ " : "− "}{currency.format(Math.abs(figures.annualImpact))}</strong><small>diferença anual frente ao cenário atual</small></article>
            </section>

            <section className="panel executive-panel">
              <div className="print-only print-brand"><span className="brand-mark">mc</span><strong>margemclara</strong><small>{activeCompany?.name ?? "Resumo executivo"}</small></div>
              <div className="panel-heading">
                <div><span className="eyebrow">RESUMO EXECUTIVO</span><h3>Decisão recomendada</h3></div>
                <button className="text-button print-button" onClick={() => window.print()}>Imprimir resumo</button>
              </div>
              <div className="executive-grid">
                <div className={`executive-status ${figures.projectedMargin >= figures.currentMargin ? "protected" : "attention"}`}>
                  <span>{figures.projectedMargin >= figures.currentMargin ? "MARGEM PROTEGIDA" : "MARGEM EM RISCO"}</span>
                  <strong>{figures.projectedMargin >= figures.currentMargin ? "O reajuste cobre a transição" : "O reajuste ainda é insuficiente"}</strong>
                  <p>A margem projetada fica em {currency.format(figures.projectedMargin)}, uma diferença de {currency.format(Math.abs(figures.projectedMargin - figures.currentMargin))} frente ao cenário atual.</p>
                </div>
                <div className="decision-list">
                  <div><span>01</span><p><b>Reajuste aplicado</b><small>{priceAdjustment.toFixed(2).replace(".", ",")}% de {figures.requiredPriceIncrease.toFixed(2).replace(".", ",")}% recomendados</small></p><strong>{priceAdjustment >= figures.requiredPriceIncrease ? "Coberto" : `Faltam ${(figures.requiredPriceIncrease - priceAdjustment).toFixed(2).replace(".", ",")} p.p.`}</strong></div>
                  <div><span>02</span><p><b>Impacto tributário</b><small>Comparação mensal entre os dois regimes</small></p><strong>{figures.delta >= 0 ? "+ " : "− "}{currency.format(Math.abs(figures.delta))}</strong></div>
                  <div><span>03</span><p><b>Receita projetada</b><small>Após preço e variação de volume</small></p><strong>{currency.format(figures.projectedRevenue)}</strong></div>
                  <div><span>04</span><p><b>Limite de perda de volume</b><small>Para preservar o resultado atual</small></p><strong>{figures.maxVolumeLoss.toFixed(1).replace(".", ",")}%</strong></div>
                </div>
              </div>
              <p className="executive-note">Prévia técnica para {activeCompany?.name ?? "o cliente"}, baseada nas premissas registradas em {new Date().toLocaleDateString("pt-BR")}. Conclua a revisão responsável antes de entregar este resultado.</p>
            </section>

            {comparedScenarios.length > 0 && <section className="panel compare-panel">
              <div className="panel-heading"><div><span className="eyebrow">COMPARADOR</span><h3>Cenários lado a lado</h3></div><button className="text-button" onClick={() => setComparisonIds([])}>Limpar seleção</button></div>
              <div className="compare-grid">
                {comparedScenarios.map(({ scenario, values }) => <article key={scenario.id}>
                  <span className="compare-label">{scenario.name}</span>
                  <strong>{currency.format(values.projectedMargin)}</strong>
                  <small>margem projetada · {values.projectedMarginRate.toFixed(1).replace(".", ",")}%</small>
                  <dl><div><dt>Receita</dt><dd>{currency.format(scenario.revenueCents / 100)}</dd></div><div><dt>IBS + CBS</dt><dd>{(scenario.newRateBps / 100).toFixed(2).replace(".", ",")}%</dd></div><div><dt>Reajuste</dt><dd>{((scenario.priceAdjustmentBps ?? 0) / 100).toFixed(2).replace(".", ",")}%</dd></div><div><dt>Queda de volume</dt><dd>{((scenario.volumeLossBps ?? 0) / 100).toFixed(2).replace(".", ",")}%</dd></div><div><dt>Ponto de equilíbrio</dt><dd>{Number.isFinite(values.breakEvenRevenue) ? currency.format(values.breakEvenRevenue) : "Inviável"}</dd></div><div><dt>Impacto anual</dt><dd>{currency.format(values.annualImpact)}</dd></div></dl>
                </article>)}
                {comparedScenarios.length === 1 && <div className="compare-empty"><span>＋</span><b>Selecione mais um cenário</b><p>Use o botão “Comparar” no histórico abaixo.</p></div>}
              </div>
              {comparedScenarios.length === 2 && <div className="compare-verdict"><span>Melhor margem projetada</span><strong>{[...comparedScenarios].sort((a, b) => b.values.projectedMargin - a.values.projectedMargin)[0].scenario.name}</strong><small>Diferença de {currency.format(Math.abs(comparedScenarios[0].values.projectedMargin - comparedScenarios[1].values.projectedMargin))}</small></div>}
            </section>}

            <section className="panel saved-panel">
              <div className="panel-heading"><div><span className="eyebrow">TRABALHO TÉCNICO VERSIONADO</span><h3>Análises e responsabilidade</h3></div><span>{savedScenarios.length} versões · nenhuma aprovação reescreve o cálculo</span></div>
              <div className="review-flow-strip" aria-label="Fluxo de revisão do escritório">
                <span><b>01</b><small>EM ELABORAÇÃO</small><strong>Versão congelada</strong></span>
                <i>→</i><span><b>02</b><small>CONTROLE INTERNO</small><strong>{workspace.type === "office" ? "Segundo profissional" : "Revisão responsável"}</strong></span>
                <i>→</i><span><b>03</b><small>RESPONSABILIDADE</small><strong>Aprovação assinada</strong></span>
                <i>→</i><span><b>04</b><small>CLIENTE</small><strong>Entrega rastreável</strong></span>
              </div>
              {savedScenarios.length ? (
                <div className="saved-list">{savedScenarios.map((item) => {
                  const finalized = ["responsible_approved", "delivered"].includes(item.reviewStatus);
                  const preserved = item.reviewStatus !== "draft";
                  const approvalBlocked = finalized && item.approval?.integrityStatus !== "verified";
                  const approved = finalized && !approvalBlocked;
                  const delivered = item.reviewStatus === "delivered";
                  const approvedBySecondPerson = item.approval?.assuranceLevel === "office_second_person_review";
                  const officeWorkflow = workspace.type === "office" && item.reviewStatus !== "draft";
                  return (
                  <div className="saved-row" key={item.id}>
                    <button className="saved-load" onClick={() => loadScenario(item)} disabled={item.integrityStatus === "invalid"}>
                      <span><b>{item.name}</b><small>{new Date(item.createdAt).toLocaleDateString("pt-BR")} · {item.preparerName ? `preparado por ${item.preparerName} · ` : ""}ano {item.targetYear} · {rateSourceLabel(item.rateSource)}</small></span>
                      <span><b>{(item.newRateBps / 100).toFixed(2).replace(".", ",")}%</b><small>IBS + CBS informados</small></span>
                      <i className={`integrity-label ${item.integrityStatus}`}>{item.integrityStatus === "verified" ? `Assinado · #${item.inputHash?.slice(0, 8)}` : item.integrityStatus === "invalid" ? "Integridade bloqueada" : "Legado"}</i>
                    </button>
                    <button className={`review-button ${item.reviewStatus === "ready_for_review" ? "ready" : ""} ${approved ? "approved" : ""}`} onClick={() => officeWorkflow ? void openReviewCenter(item.id) : item.reviewStatus === "ready_for_review" ? openResponsibleApproval(item) : void markReadyForReview(item)} disabled={item.integrityStatus !== "verified" || finalized || reviewingScenarioId === item.id || !item.snapshotJson || (item.reviewStatus === "draft" && !canPrepare)}>{item.integrityStatus === "invalid" ? "Cálculo bloqueado" : approvalBlocked ? "Aprovação bloqueada" : delivered ? "Entregue ao cliente" : approved ? approvedBySecondPerson ? "Revisado por outra pessoa" : "Aprovado pelo responsável" : item.reviewStatus === "changes_requested" ? "Ver correções solicitadas" : item.reviewStatus === "rejected" ? "Ver decisão da revisão" : item.reviewStatus === "ready_for_review" ? workspace.type === "office" ? "Abrir na Central de Revisão" : "Aprovar como responsável" : reviewingScenarioId === item.id ? "Iniciando…" : item.snapshotJson && item.integrityStatus === "verified" ? workspace.type === "office" ? "Enviar para revisor" : "Iniciar revisão interna" : "Regravar versão"}</button>
                    <span className="delivery-action"><button className="share-report-button" title={!approved ? workspace.type === "office" ? "A entrega libera após a aprovação assinada pelo revisor designado." : "A entrega libera após concluir e assinar a revisão responsável." : "Gerar link rastreável para o cliente."} onClick={() => void createReportShare(item)} disabled={creatingShareId === item.id || !approved || item.integrityStatus !== "verified" || !canPrepare}>{creatingShareId === item.id ? "Gerando…" : delivered ? "Gerar novo link" : "Entregar ao cliente"}</button>{!approved && <small>{approvalBlocked ? "Assinatura inválida" : "Aguardando assinatura"}</small>}</span>
                    <button className={`compare-toggle ${comparisonIds.includes(item.id) ? "selected" : ""}`} onClick={() => toggleComparison(item.id)} disabled={item.integrityStatus === "invalid"} aria-pressed={comparisonIds.includes(item.id)}>{comparisonIds.includes(item.id) ? "Selecionado" : "Comparar"}</button>
                    <button className={`delete-button ${preserved ? "preserved" : ""}`} onClick={() => deleteScenario(item)} disabled={preserved} title={preserved ? "Versão preservada pela trilha de responsabilidade" : "Excluir versão"} aria-label={preserved ? `Preservar ${item.name}` : `Excluir ${item.name}`}>{preserved ? "⌑" : "×"}</button>
                  </div>
                )})}</div>
              ) : <div className="empty-state"><span>＋</span><b>Nenhum cenário salvo</b><p>Ajuste as premissas e salve sua primeira comparação.</p></div>}
            </section>

            <section className="panel share-center-panel">
              <div className="panel-heading"><div><span className="eyebrow">ENTREGA AO CLIENTE</span><h3>Relatórios compartilhados</h3></div><span className="share-count">{reportShares.filter((share) => !share.revokedAt && new Date(share.expiresAt) > new Date()).length} ativos</span></div>
              <p className="share-center-intro">Somente versões aprovadas e assinadas podem ser entregues. {workspace.type === "office" ? "No escritório, o relatório identifica separadamente preparador e revisor interno." : "No modo independente, o relatório informa que a revisão foi feita pelo próprio responsável."}</p>
              {reportShares.length ? <div className="share-list">{reportShares.map((share) => {
                const expired = new Date(share.expiresAt) <= new Date();
                const active = !share.revokedAt && !expired;
                return <article className={active ? "" : "inactive"} key={share.id}>
                  <span className={`share-status ${active ? "active" : "inactive"}`}><i />{active ? "Ativo" : share.revokedAt ? "Revogado" : "Expirado"}</span>
                  <div><b>{share.scenarioName}</b><small>Criado em {new Date(share.createdAt).toLocaleDateString("pt-BR")} · expira em {new Date(share.expiresAt).toLocaleDateString("pt-BR")}</small></div>
                  <div className="share-views"><strong>{share.views}</strong><small>visualizações</small></div>
                  <div className="share-actions"><button disabled={!active} onClick={() => void copyReportShare(share)}>Copiar</button><a className={active ? "" : "disabled"} href={active ? share.url : undefined} target="_blank" rel="noreferrer">Abrir</a><button className="revoke" disabled={!active} onClick={() => void revokeReportShare(share)}>Revogar</button></div>
                </article>;
              })}</div> : <div className="share-empty"><span>↗</span><div><b>Nenhum relatório entregue</b><p>Congele, revise e aprove uma versão antes de gerar o link do cliente.</p></div></div>}
            </section>

            <section className="panel audit-panel">
              <div className="panel-heading"><div><span className="eyebrow">TRILHA DE AUDITORIA</span><h3>Eventos desta empresa</h3></div><a href="/metodologia">Controles e metodologia →</a></div>
              {auditEvents.length ? <div className="audit-list">{auditEvents.slice(0, 8).map((event) => <article key={event.id}><span>✓</span><div><b>{auditEventLabels[event.eventType] ?? event.eventType}</b><small>{new Date(event.createdAt).toLocaleString("pt-BR")} · {typeof event.eventData.calculationVersion === "string" ? event.eventData.calculationVersion : "evento operacional"}</small></div><code>{typeof event.eventData.inputHash === "string" ? `${event.eventData.inputHash.slice(0, 12)}…` : `evento ${event.id}`}</code></article>)}</div> : <div className="empty-state"><span>✓</span><b>A trilha começa no próximo salvamento</b><p>Criação, revisão, compartilhamento, revogação e exclusão serão registrados.</p></div>}
            </section>
          </div>
        )}

        {section === "reviews" && workspace.type === "office" && (
          <div className="page-content review-center-page">
            <div className="page-heading review-center-heading">
              <div><p className="kicker">CONTROLE DE QUALIDADE DO ESCRITÓRIO</p><h1>Central de Revisão</h1><p>Acompanhe responsáveis, prazos, comentários e decisões sem alterar versões já congeladas.</p></div>
              <button className="secondary-button" type="button" onClick={() => void refreshReviews(activeReview?.scenarioId)} disabled={reviewLoading}>{reviewLoading ? "Atualizando…" : "Atualizar fila"}</button>
            </div>

            {message && <div className="toast" role="status">{message}</div>}

            <section className="review-metrics" aria-label="Indicadores das revisões">
              <article><span>PENDENTES</span><strong>{reviewMetrics.pending}</strong><small>aguardando uma decisão</small></article>
              <article className="mine"><span>ATRIBUÍDAS A VOCÊ</span><strong>{reviewMetrics.mine}</strong><small>itens na sua responsabilidade</small></article>
              <article className={reviewMetrics.overdue ? "risk" : "protected"}><span>FORA DO PRAZO</span><strong>{reviewMetrics.overdue}</strong><small>{reviewMetrics.overdue ? "exigem priorização" : "nenhum atraso"}</small></article>
              <article><span>CORREÇÕES ABERTAS</span><strong>{reviewMetrics.changesRequested}</strong><small>preservadas por versão</small></article>
              <article><span>TEMPO MÉDIO</span><strong>{reviewMetrics.averageHours === null ? "—" : reviewMetrics.averageHours < 24 ? `${reviewMetrics.averageHours}h` : `${Math.round(reviewMetrics.averageHours / 24)}d`}</strong><small>das revisões aprovadas</small></article>
            </section>

            <div className="review-filter-bar" role="group" aria-label="Filtros da central">
              {([['all', 'Todas'], ['mine', 'Minhas pendências'], ['pending', 'Pendentes'], ['changes_requested', 'Correções'], ['approved', 'Aprovadas'], ['rejected', 'Rejeitadas']] as const).map(([value, label]) => <button type="button" className={reviewFilter === value ? "active" : ""} onClick={() => changeReviewFilter(value)} key={value}>{label}</button>)}
            </div>

            <section className="review-workbench">
              <aside className="review-queue-panel">
                <div className="review-queue-heading"><span>FILA DO ESCRITÓRIO</span><b>{filteredReviews.length} registro{filteredReviews.length === 1 ? "" : "s"}</b></div>
                {filteredReviews.map((review) => {
                  const overdue = review.status === "pending" && Boolean(review.dueAt) && new Date(review.dueAt!).getTime() < Date.now();
                  return <button type="button" className={`review-queue-item ${activeReview?.id === review.id ? "active" : ""} ${overdue ? "overdue" : ""}`} onClick={() => selectReview(review)} key={review.id}>
                    <span className={`review-status-dot ${review.status}`} />
                    <span><small>{review.company?.name ?? "Empresa"} · rodada {review.roundNumber}</small><b>{review.scenario.name}</b><em>{reviewStatusLabels[review.status]}</em></span>
                    <span><small>{review.assigneeName ?? "Sem responsável"}</small><time>{review.dueAt ? new Date(review.dueAt).toLocaleDateString("pt-BR") : "Sem prazo"}</time></span>
                  </button>;
                })}
                {!reviewLoading && !filteredReviews.length && <div className="review-queue-empty"><span>✓</span><b>Nenhuma revisão neste filtro</b><p>A fila será preenchida quando uma versão for enviada para outro profissional.</p></div>}
                {reviewLoading && !reviewQueue.length && <div className="review-queue-empty"><span className="loading-spinner" /><b>Carregando fila…</b></div>}
              </aside>

              {activeReview ? <article className="review-detail-panel">
                <header className="review-detail-header">
                  <div><span className={`review-status-badge ${activeReview.status}`}><i />{reviewStatusLabels[activeReview.status]}</span><h2>{activeReview.scenario.name}</h2><p>{activeReview.company?.name} · rodada {activeReview.roundNumber} · hash #{activeReview.scenario.inputHash?.slice(0, 12)}</p></div>
                  <div className="review-owner-card"><small>RESPONSÁVEL ATUAL</small><b>{activeReview.assigneeName ?? "Não atribuído"}</b><span>{activeReview.dueAt ? `Prazo ${new Date(activeReview.dueAt).toLocaleDateString("pt-BR")}` : "Sem prazo"}</span></div>
                </header>

                <section className="review-segregation-strip">
                  <div><small>PREPARADO POR</small><b>{activeReview.preparerName}</b></div><span>→</span><div><small>REVISADO POR</small><b>{activeReview.assigneeName ?? "A definir"}</b></div><span>→</span><div><small>VERSÃO</small><b>#{activeReview.scenarioId} · imutável</b></div>
                </section>

                <section className="review-scenario-metrics">
                  <div><span>Receita mensal</span><strong>{currency.format(activeReview.scenario.revenueCents / 100)}</strong></div>
                  <div><span>IBS + CBS informados</span><strong>{(activeReview.scenario.newRateBps / 100).toFixed(2).replace(".", ",")}%</strong></div>
                  <div><span>Margem projetada</span><strong>{activeReviewValues ? `${activeReviewValues.projectedMarginRate.toFixed(1).replace(".", ",")}%` : "Bloqueada"}</strong></div>
                  <div><span>Impacto mensal</span><strong>{activeReviewValues ? currency.format(activeReviewValues.projectedMargin - activeReviewValues.currentMargin) : "—"}</strong></div>
                </section>

                <div className="review-source-note"><span>FONTE DA PREMISSA</span><p>{activeReview.scenario.sourceNote}</p><small>Motor {activeReview.scenario.calculationVersion} · metodologia {activeReview.scenario.methodologyVersion}</small></div>

                {reviewPermissions.canManage && activeReview.status === "pending" && <section className="review-assignment-box">
                  <div><span>GESTÃO DA FILA</span><b>Reatribuir responsável ou prazo</b></div>
                  <select aria-label="Revisor responsável" value={assignmentReviewerId ?? ""} onChange={(event) => setAssignmentReviewerId(Number(event.target.value))}><option value="">Selecione</option>{eligibleReviewers.filter((reviewer) => reviewer.userId !== activeReview.preparedByUserId).map((reviewer) => <option value={reviewer.userId} key={reviewer.userId}>{reviewer.name} · {reviewer.role}</option>)}</select>
                  <input type="date" min={dateInputValue(1)} value={assignmentDueDate} onChange={(event) => setAssignmentDueDate(event.target.value)} aria-label="Prazo da revisão" />
                  <button type="button" onClick={() => void reassignReview()} disabled={reviewMutating || !assignmentReviewerId || !assignmentDueDate}>Atualizar</button>
                </section>}

                <section className="review-timeline-section">
                  <div className="review-section-heading"><div><span>DISCUSSÃO AUDITÁVEL</span><h3>Histórico da rodada</h3></div><b>{activeReview.comments.length} registro{activeReview.comments.length === 1 ? "" : "s"}</b></div>
                  <div className="review-timeline">
                    {activeReview.comments.map((comment) => <article className={`kind-${comment.kind}`} key={comment.id}><span>{comment.kind === "approved" ? "✓" : comment.kind === "changes_requested" ? "↺" : comment.kind === "rejected" ? "×" : "•"}</span><div><b>{comment.authorName}</b><small>{new Date(comment.createdAt).toLocaleString("pt-BR")}</small><p>{comment.body}</p></div></article>)}
                    {!activeReview.comments.length && <p className="review-no-comments">Ainda não há registros nesta rodada.</p>}
                  </div>
                  <div className="review-comment-composer"><textarea maxLength={1000} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Registre uma conferência, evidência ou pergunta para a equipe." /><button type="button" onClick={() => void addReviewComment()} disabled={reviewMutating || reviewComment.trim().length < 2}>Comentar</button></div>
                </section>

                {activeReview.status === "pending" && activeReview.assignedReviewerUserId === user.id && activeReview.preparedByUserId !== user.id && reviewPermissions.canReview && <footer className="review-decision-bar"><div><small>DECISÃO DO REVISOR DESIGNADO</small><b>Sua decisão ficará vinculada a esta versão.</b></div><button className="request-changes" type="button" onClick={() => { setReviewDecision({ review: activeReview, decision: "changes_requested" }); setDecisionNote(""); }}>Solicitar correções</button><button className="reject" type="button" onClick={() => { setReviewDecision({ review: activeReview, decision: "rejected" }); setDecisionNote(""); }}>Rejeitar</button><button className="approve" type="button" onClick={() => openResponsibleApproval(activeReview.scenario)} disabled={activeReview.scenario.integrityStatus !== "verified"}>Revisar e aprovar</button></footer>}
                {activeReview.status === "changes_requested" && activeReview.preparedByUserId === user.id && <footer className="review-correction-bar"><div><small>PRÓXIMA RODADA</small><b>Crie uma nova versão; a devolvida continuará intacta.</b></div><button type="button" onClick={() => startCorrectedVersion(activeReview)}>Criar versão corrigida</button></footer>}
              </article> : <div className="review-detail-empty"><span>✓</span><h2>Selecione uma revisão</h2><p>O cenário, a responsabilidade e toda a conversa aparecerão aqui.</p></div>}
            </section>
          </div>
        )}

        {section === "team" && workspace.type === "individual" && (
          <div className="page-content team-page individual-mode-page">
            <div className="page-heading"><div><p className="kicker">MODO CONTADOR INDEPENDENTE</p><h1>Seu espaço profissional individual</h1><p>Você prepara, revisa e assume a responsabilidade pelas próprias versões, com esse limite declarado em cada relatório.</p></div><span className="office-plan-badge individual"><small>PLANO SUGERIDO</small><b>Profissional</b><em>beta gratuito</em></span></div>
            {message && <div className="toast" role="status">{message}</div>}
            <section className="mode-comparison-grid">
              <article className="current"><span>MODO ATUAL</span><h2>Contador independente</h2><p>Uma conta concentra preparação e revisão responsável. O relatório não chama isso de revisão independente.</p><ul><li>Carteira e versões privadas</li><li>Assinatura do responsável</li><li>Plano Profissional sugerido</li></ul></article>
              <article><span>EVOLUIR PARA</span><h2>Escritório contábil</h2><p>Ative equipe, convide profissionais e passe a exigir outra pessoa na aprovação.</p><form onSubmit={(event) => { event.preventDefault(); void upgradeToOffice(); }}><label>Nome do escritório<input required minLength={2} maxLength={120} value={officeUpgradeName} onChange={(event) => setOfficeUpgradeName(event.target.value)} placeholder="Ex.: Horizonte Contabilidade" /></label><button className="primary-button" disabled={upgradingWorkspace || officeUpgradeName.trim().length < 2}>{upgradingWorkspace ? "Ativando…" : "Ativar modo escritório"}</button></form><small>A carteira e o histórico atuais serão preservados. Depois de convidar revisores, versões novas exigirão segregação.</small></article>
            </section>
          </div>
        )}

        {section === "team" && workspace.type === "office" && (
          <div className="page-content team-page">
            <div className="page-heading">
              <div><p className="kicker">MODO ESCRITÓRIO CONTÁBIL</p><h1>Equipe e segregação de revisão</h1><p>Defina quem prepara, quem revisa e preserve a autoria de cada versão entregue.</p></div>
              <span className="office-plan-badge"><small>PLANO SUGERIDO</small><b>Escritório</b><em>beta gratuito</em></span>
            </div>

            {message && <div className="toast" role="status">{message}</div>}

            <section className="team-summary-grid">
              <article><span>ESPAÇO DE TRABALHO</span><strong>{workspace.name}</strong><small>Carteira compartilhada com controle por papel</small></article>
              <article><span>MEMBROS ATIVOS</span><strong>{teamMembers.length || (teamLoading ? "…" : 1)}</strong><small>{teamMembers.filter((member) => member.role === "reviewer" || member.role === "admin" || member.role === "owner").length} aptos por papel a revisar</small></article>
              <article className="protected"><span>REGRA DE APROVAÇÃO</span><strong>Dupla pessoa</strong><small>Preparador nunca aprova a própria versão</small></article>
            </section>

            <section className="team-governance panel">
              <div><span>01</span><p><small>PREPARAÇÃO</small><b>Um membro congela a versão</b><em>Autoria gravada no cenário e na auditoria.</em></p></div>
              <i>→</i><div><span>02</span><p><small>REVISÃO</small><b>Outro membro confere e assina</b><em>O servidor bloqueia preparador = revisor.</em></p></div>
              <i>→</i><div><span>03</span><p><small>ENTREGA</small><b>O relatório identifica os dois</b><em>Revisão interna, sem alegação de independência externa.</em></p></div>
            </section>

            <div className="team-layout">
              <section className="panel team-members-panel">
                <div className="panel-heading"><div><span className="eyebrow">PESSOAS E PAPÉIS</span><h3>Membros do escritório</h3></div><span>{teamLoading ? "Atualizando…" : `${teamMembers.length} ativos`}</span></div>
                <div className="team-member-list">
                  {teamMembers.map((member) => <article key={member.id}><span className="team-avatar">{member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><p><b>{member.name}{member.userId === user.id ? " · você" : ""}</b><small>{member.email}</small></p>{canManageTeam && member.role !== "owner" && member.userId !== user.id ? <div className="team-member-actions"><select aria-label={`Papel de ${member.name}`} value={member.role} onChange={(event) => void changeTeamMemberRole(member, event.target.value as TeamInvitation["role"])}><option value="reviewer">Revisor</option><option value="preparer">Preparador</option><option value="admin">Administrador</option></select><button type="button" onClick={() => void removeTeamMember(member)}>Remover</button></div> : <em className={`role-${member.role}`}>{member.role === "owner" ? "Proprietário" : member.role === "admin" ? "Administrador" : member.role === "reviewer" ? "Revisor" : "Preparador"}</em>}</article>)}
                  {!teamMembers.length && !teamLoading && <div className="empty-state"><span>◎</span><b>Carregando estrutura da equipe</b><p>Atualize a página se os membros não aparecerem.</p></div>}
                </div>
              </section>

              <aside className="panel team-invite-panel">
                <div className="panel-heading"><div><span className="eyebrow">CONVITE SEGURO</span><h3>Adicionar profissional</h3></div></div>
                {canManageTeam ? <form onSubmit={(event) => { event.preventDefault(); void inviteTeamMember(); }}>
                  <label>E-mail profissional<input type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="revisor@escritorio.com.br" /></label>
                  <label>Papel no escritório<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as TeamInvitation["role"])}><option value="reviewer">Revisor</option><option value="preparer">Preparador</option><option value="admin">Administrador</option></select></label>
                  <div className="role-explainer"><b>{inviteRole === "reviewer" ? "Revisor" : inviteRole === "preparer" ? "Preparador" : "Administrador"}</b><span>{inviteRole === "reviewer" ? "Confere e aprova versões preparadas por outras pessoas." : inviteRole === "preparer" ? "Cadastra clientes e cria versões, mas não aprova a própria versão." : "Gerencia equipe, prepara e revisa versões de outras pessoas."}</span></div>
                  <button className="primary-button" disabled={teamLoading || !inviteEmail.trim()}>{teamLoading ? "Criando convite…" : "Gerar convite de 7 dias"}</button>
                  {createdInviteUrl && <div className="created-invite"><span>LINK CRIADO E COPIADO</span><input readOnly value={createdInviteUrl} onFocus={(event) => event.currentTarget.select()} /></div>}
                </form> : <div className="team-readonly"><span>i</span><p><b>Gestão somente para administradores</b><small>Seu papel permite trabalhar na carteira, mas não convidar novos membros.</small></p></div>}
                {teamInvitations.length > 0 && <div className="pending-invites"><span>CONVITES PENDENTES</span>{teamInvitations.map((invitation) => <article key={invitation.id}><p><b>{invitation.email}</b><small>{invitation.role} · expira {new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}</small></p>{canManageTeam && <button type="button" onClick={() => void revokeTeamInvitation(invitation)}>Revogar</button>}</article>)}</div>}
              </aside>
            </div>
          </div>
        )}

        {section === "intelligence" && <FiscalIntelligence />}

        {section === "rules" && (
          <div className="page-content fiscal-rules-page">
            <div className="page-heading">
              <div><p className="kicker">GOVERNANÇA DO MOTOR FISCAL</p><h1>Catálogo fiscal versionado</h1><p>Nenhuma regra entra nos cálculos sem fonte, integridade, casos de referência e aprovação explícita.</p></div>
              <a className="secondary-button" href="/metodologia">Ver metodologia</a>
            </div>

            {rulesError && <div className="toast" role="alert">{rulesError}</div>}
            {!fiscalCatalog && !rulesError && <section className="panel rules-loading"><span className="loading-spinner" /><div><b>Verificando regras e casos de referência…</b><p>O conteúdo armazenado está sendo comparado ao hash registrado.</p></div></section>}

            {fiscalCatalog && <>
              <section className="rules-metrics" aria-label="Indicadores do catálogo fiscal">
                <article><span>Versões registradas</span><strong>{fiscalCatalog.metrics.totalRules}</strong><small>Conteúdo imutável por versão</small></article>
                <article><span>Fontes oficiais</span><strong>{fiscalCatalog.metrics.totalSources}</strong><small>Com data de conferência</small></article>
                <article className="protected"><span>Casos aprovados</span><strong>{fiscalCatalog.metrics.passedCases}/{fiscalCatalog.metrics.totalCases}</strong><small>Resultado esperado reproduzido</small></article>
                <article className={fiscalCatalog.metrics.executionEnabled ? "protected" : "risk"}><span>Regras em produção</span><strong>{fiscalCatalog.metrics.executionEnabled}</strong><small>{fiscalCatalog.metrics.executionEnabled ? "Liberadas para cálculo" : "Motor fiscal bloqueado"}</small></article>
              </section>

              <div className="rules-stack">{fiscalCatalog.rules.map((rule) => {
                const statusLabel = rule.executionEnabled ? "Em produção" : rule.status === "in_review" ? "Em revisão" : rule.status === "approved" ? "Aprovada, mas bloqueada" : rule.status === "retired" ? "Retirada" : "Rascunho";
                return <article className="panel fiscal-rule-card" key={rule.id}>
                  <div className="rule-card-heading">
                    <div><span className="eyebrow">{rule.code} · VERSÃO {rule.version}</span><h2>{rule.name}</h2><p>Brasil · vigência de {new Date(`${rule.effectiveFrom}T12:00:00`).toLocaleDateString("pt-BR")} a {new Date(`${rule.effectiveTo}T12:00:00`).toLocaleDateString("pt-BR")}</p></div>
                    <div className="rule-badges"><span className={`rule-status ${rule.executionEnabled ? "enabled" : "blocked"}`}><i />{statusLabel}</span><code>#{rule.contentFingerprint}</code></div>
                  </div>

                  <div className="rule-control-grid">
                    <section>
                      <span className="rule-section-label">PARÂMETROS DE REFERÊNCIA</span>
                      <div className="rule-rate-grid">{rule.components.map((component) => <article key={component.tax}><span>{component.tax}</span><strong>{(component.rateBps / 100).toFixed(2).replace(".", ",")}%</strong><small>alíquota de destaque</small></article>)}</div>
                      <div className="rule-safety-note"><span>!</span><p><b>Sem cálculo automático de valor a recolher</b>Esta versão apenas reproduz destaques brutos e o tratamento normativo de referência. Não classifica a operação nem apura saldo líquido.</p></div>
                    </section>
                    <section className="rule-gate">
                      <span className="rule-section-label">PORTÃO DE EXECUÇÃO</span>
                      <div className="gate-check"><span className={rule.integrityStatus === "verified" ? "pass" : "fail"}>{rule.integrityStatus === "verified" ? "✓" : "×"}</span><p><b>Integridade do conteúdo</b><small>{rule.integrityStatus === "verified" ? "Hash confere" : "Divergência detectada"}</small></p></div>
                      <div className="gate-check"><span className={rule.testsPassed ? "pass" : "fail"}>{rule.testsPassed ? "✓" : "×"}</span><p><b>Casos de referência</b><small>{rule.testsPassed ? "Todos reproduzidos" : "Falha de regressão"}</small></p></div>
                      <div className="gate-check"><span className={rule.status === "approved" ? "pass" : "wait"}>{rule.status === "approved" ? "✓" : "…"}</span><p><b>Homologação profissional</b><small>{rule.status === "approved" ? "Aprovada" : "Pendente"}</small></p></div>
                      {!rule.executionEnabled && <div className="execution-lock"><b>Execução bloqueada</b><small>{rule.blockingReasons.join(" · ")}</small></div>}
                    </section>
                  </div>

                  <div className="rule-detail-grid">
                    <section><span className="rule-section-label">CASOS DE REFERÊNCIA</span><div className="reference-case-list">{rule.referenceCases.map((referenceCase) => <article key={referenceCase.code}><span className={referenceCase.passed ? "case-pass" : "case-fail"}>{referenceCase.passed ? "✓" : "×"}</span><div><b>{referenceCase.title}</b><small>{referenceCase.input ? `Base ${preciseCurrency.format(referenceCase.input.taxableBaseCents / 100)}` : "Entrada inválida"}</small></div><strong>{referenceCase.actual ? preciseCurrency.format(referenceCase.actual.totalHighlightedCents / 100) : "Falhou"}<small>total destacado</small></strong></article>)}</div></section>
                    <section><span className="rule-section-label">FONTES NORMATIVAS</span><div className="rule-source-list">{rule.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span>↗</span><p><b>{source.title}</b><small>{source.publisher} · conferida em {new Date(`${source.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")}</small></p></a>)}</div></section>
                  </div>

                  <details className="rule-limitations"><summary>Ver limites explícitos desta regra</summary><ul>{rule.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></details>
                </article>;
              })}</div>
            </>}
          </div>
        )}

        {section === "determination" && (
          <div className="page-content determination-page">
            <div className="page-heading determination-heading">
              <div><p className="kicker">APURAÇÃO ASSISTIDA · MODELO EM HOMOLOGAÇÃO</p><h1>Apuração líquida sob controle</h1><p>Do documento ao fechamento: cada débito, crédito, ajuste e pagamento precisa ser explicado antes de formar um valor a recolher.</p></div>
              <span className="determination-lock-badge"><i /> Cálculo produtivo bloqueado</span>
            </div>

            {determinationError && <div className="toast" role="alert">{determinationError}</div>}
            {!taxDetermination && !determinationError && <section className="panel rules-loading"><span className="loading-spinner" /><div><b>Verificando o livro fiscal e os portões de fechamento…</b><p>Casos adversos, segregação dos tributos e evidências estão sendo conferidos.</p></div></section>}

            {taxDetermination && <>
              <section className="determination-metrics" aria-label="Indicadores do modelo de apuração">
                <article className="protected"><span>Motor de referência</span><strong>{taxDetermination.integrityStatus === "verified" ? "Íntegro" : "Falha"}</strong><small>#{taxDetermination.fingerprint}</small></article>
                <article className="protected"><span>Regressões</span><strong>{taxDetermination.referenceCases.filter((item) => item.passed).length}/{taxDetermination.referenceCases.length}</strong><small>{taxDetermination.casesPassed ? "Todos os casos reproduzidos" : "Existem falhas"}</small></article>
                <article><span>Competências abertas</span><strong>{taxDetermination.workspace.totalPeriods}</strong><small>Escrita desativada nesta fase</small></article>
                <article className="risk"><span>Valor a recolher</span><strong>Bloqueado</strong><small>Aguardando homologação contábil</small></article>
              </section>

              <section className="panel determination-hero">
                <div className="determination-hero-copy"><span className="eyebrow">FÓRMULA CONTROLADA · {taxDetermination.engineVersion}</span><h2>O número final só aparece depois que a prova fecha.</h2><p>{taxDetermination.blueprint.legalBoundary}</p><code>{taxDetermination.blueprint.formula}</code></div>
                <div className="determination-final-lock"><span>VALOR LÍQUIDO A RECOLHER</span><strong>—</strong><b>Não liberado</b><small>{taxDetermination.execution.reasons[0]}</small></div>
              </section>

              <section className="determination-workflow" aria-label="Fluxo de apuração">
                {taxDetermination.blueprint.stages.map((stage) => <article key={stage.code}><span>{stage.code}</span><div><h3>{stage.title}</h3><p>{stage.description}</p></div></article>)}
              </section>

              <div className="determination-main-grid">
                <section className="panel ledger-preview-panel">
                  <div className="panel-heading"><div><span className="eyebrow">EXEMPLO SINTÉTICO · COMPETÊNCIA {taxDetermination.simulationExample.period}</span><h3>Dois livros, dois saldos independentes</h3></div><span className="simulation-chip">Sem efeito jurídico</span></div>
                  <div className="ledger-card-grid">{[taxDetermination.simulationExample.cbs, taxDetermination.simulationExample.ibs].map((ledger) => <article key={ledger.tax}>
                    <div className="ledger-title"><span>{ledger.tax}</span><small>{ledger.tax === "CBS" ? "Federal" : "Estadual + municipal"}</small></div>
                    <dl>
                      <div><dt>Débitos documentados</dt><dd>{preciseCurrency.format((ledger.grossDebitsCents + ledger.debitAdjustmentsCents) / 100)}</dd></div>
                      <div><dt>Créditos elegíveis</dt><dd>− {preciseCurrency.format((ledger.openingCreditCents + ledger.eligibleCreditsCents + ledger.creditAdjustmentsCents) / 100)}</dd></div>
                      <div><dt>Extinções confirmadas</dt><dd>− {preciseCurrency.format(ledger.confirmedExtinguishmentsCents / 100)}</dd></div>
                    </dl>
                    <div className="ledger-preliminary"><span>Saldo preliminar devedor</span><strong>{preciseCurrency.format(ledger.preliminaryDebitBalanceCents / 100)}</strong><small>não é valor a pagar</small></div>
                    <div className="ledger-final"><span>Líquido exigível</span><strong>—</strong><small>portão fechado</small></div>
                  </article>)}</div>
                  <p className="synthetic-warning"><b>Importante:</b> os números acima existem somente para testar a mecânica do livro. Em 2026, o motor mantém o resultado líquido como nulo.</p>
                </section>

                <aside className="panel determination-gates">
                  <div className="panel-heading"><div><span className="eyebrow">PORTÃO DE FECHAMENTO</span><h3>O que ainda impede a execução</h3></div><span className="rule-status blocked"><i />Fechado</span></div>
                  <div className="determination-gate-list">
                    <article className="done"><span>✓</span><p><b>Motor e casos de regressão</b><small>Integridade e cálculos-base conferidos</small></p></article>
                    <article className="done"><span>✓</span><p><b>Segregação CBS × IBS</b><small>Compensação cruzada não é permitida</small></p></article>
                    {taxDetermination.execution.reasons.slice(0, 3).map((reason) => <article className="pending" key={reason}><span>…</span><p><b>{reason}</b><small>Obrigatório antes do fechamento</small></p></article>)}
                  </div>
                  <button type="button" disabled>Iniciar competência — após homologação</button>
                </aside>
              </div>

              <section className="panel reconciliation-panel">
                <div className="panel-heading"><div><span className="eyebrow">CONCILIAÇÃO EM TRÊS VIAS</span><h3>O saldo precisa bater em três fontes</h3></div><span className="simulation-chip">Arquitetura preparada</span></div>
                <div className="reconciliation-grid">
                  <article><span>01</span><div><small>LIVRO INTERNO</small><b>DF-e, DeRE e eventos</b><p>Chave única, classificação e memória de cada lançamento.</p></div><em className="ready">Modelo pronto</em></article>
                  <article><span>02</span><div><small>ERP + CONTABILIDADE</small><b>Razão e saldos contábeis</b><p>Conferência por competência, documento e conta de tributo.</p></div><em>Pendente integração</em></article>
                  <article><span>03</span><div><small>FONTE OFICIAL</small><b>Apuração Assistida</b><p>Débitos, créditos, pagamentos e pagamentos a fornecedores via relatórios ou APIs.</p></div><em>Pendente integração</em></article>
                </div>
                <div className="exception-queue"><span>FILA DE EXCEÇÕES</span><p><b>Crédito pendente</b> não reduz o saldo</p><p><b>Documento duplicado</b> não entra duas vezes</p><p><b>Ajuste sem vínculo</b> bloqueia fechamento</p><p><b>Extinção sem confirmação</b> não reduz o débito</p></div>
              </section>

              <div className="determination-detail-grid">
                <section className="panel entry-matrix-panel"><div className="panel-heading"><div><span className="eyebrow">MATRIZ DE LANÇAMENTOS</span><h3>Critério de entrada no saldo</h3></div></div><div className="entry-matrix">{taxDetermination.blueprint.entryMatrix.map((entry) => <article key={entry.kind}><span>{entry.kind}</span><p><b>{entry.source}</b><small>{entry.inclusion}</small></p></article>)}</div></section>
                <section className="panel determination-cases-panel"><div className="panel-heading"><div><span className="eyebrow">CASOS ADVERSOS</span><h3>Regressões obrigatórias</h3></div><span className="case-count">{taxDetermination.referenceCases.length}</span></div><div className="determination-case-list">{taxDetermination.referenceCases.map((referenceCase) => <article key={referenceCase.code}><span className={referenceCase.passed ? "case-pass" : "case-fail"}>{referenceCase.passed ? "✓" : "×"}</span><p><b>{referenceCase.title}</b><small>{referenceCase.closingReady ? "Fechamento permitido apenas neste caso produtivo sintético" : "Bloqueio reproduzido como esperado"}</small></p></article>)}</div></section>
              </div>

              <section className="panel determination-sources-panel">
                <div className="panel-heading"><div><span className="eyebrow">BASE TÉCNICA</span><h3>Fontes que governam o modelo</h3></div><code>#{taxDetermination.fingerprint}</code></div>
                <div className="determination-source-grid">{taxDetermination.blueprint.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span>↗</span><p><b>{source.title}</b><small>{source.publisher} · conferida em {new Date(`${source.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")}</small></p></a>)}</div>
              </section>
            </>}
          </div>
        )}

        {section === "academy" && (
          <div className="page-content academy-page">
            <div className="page-heading academy-page-heading">
              <div><p className="kicker">CENTRAL DE DEMONSTRAÇÕES</p><h1>Aprenda fazendo, no seu ritmo</h1><p>Reproduza jornadas curtas com capítulos, legendas e a interface do próprio produto.</p></div>
              <span className="academy-badge"><i /> 3 vídeos interativos</span>
            </div>

            <section className="academy-layout">
              <article className="demo-player-panel">
                <div className="demo-player-heading">
                  <div><span className={`demo-accent ${activeDemo.accent}`} /> <small>{activeDemo.level.toUpperCase()}</small><h2>{activeDemo.title}</h2></div>
                  <span>{activeDemo.duration}</span>
                </div>

                <div className={`demo-player-screen ${activeDemo.accent}`} aria-live="polite">
                  <div className="demo-screen-top"><span><i>mc</i> margem<b>clara</b></span><small>DEMONSTRAÇÃO GUIADA</small><em>{demoStep + 1}/{activeDemo.steps.length}</em></div>
                  <div className="demo-screen-body">
                    <aside>{activeDemo.steps.map((step, index) => <span className={index === demoStep ? "active" : index < demoStep ? "done" : ""} key={step.title}><i>{index < demoStep ? "✓" : index + 1}</i><b>{step.label.replace(/PASSO \d · /, "")}</b></span>)}</aside>
                    <div className="demo-scene" key={`${demoIndex}-${demoStep}`}>
                      <span className="scene-label">{activeDemoStep.label}</span>
                      <h3>{activeDemoStep.title}</h3>
                      <p>{activeDemoStep.description}</p>
                      <div className="scene-result"><small>{activeDemoStep.metricLabel}</small><strong>{activeDemoStep.metric}</strong><span className="scene-spark"><i /><i /><i /><i /><i /></span></div>
                      <button type="button" onClick={() => setDemoStep((current) => Math.min(current + 1, activeDemo.steps.length - 1))}>{activeDemoStep.action}<span>→</span></button>
                    </div>
                  </div>
                  {!demoPlaying && <button className="demo-overlay-play" type="button" aria-label={demoStep === activeDemo.steps.length - 1 ? "Reproduzir novamente" : "Reproduzir demonstração"} onClick={toggleDemoPlayback}><span>{demoStep === activeDemo.steps.length - 1 ? "↻" : "▶"}</span><b>{demoStep === activeDemo.steps.length - 1 ? "Assistir novamente" : "Continuar demonstração"}</b></button>}
                </div>

                <div className="demo-controls">
                  <button type="button" aria-label="Capítulo anterior" onClick={() => { setDemoPlaying(false); setDemoStep((current) => Math.max(0, current - 1)); }}>‹</button>
                  <button className="main-play" type="button" aria-label={demoPlaying ? "Pausar" : "Reproduzir"} onClick={toggleDemoPlayback}>{demoPlaying ? "Ⅱ" : "▶"}</button>
                  <button type="button" aria-label="Próximo capítulo" onClick={() => { setDemoPlaying(false); setDemoStep((current) => Math.min(activeDemo.steps.length - 1, current + 1)); }}>›</button>
                  <div className="demo-timeline" aria-label="Capítulos da demonstração">{activeDemo.steps.map((step, index) => <button type="button" aria-label={`Ir para ${step.title}`} className={index <= demoStep ? "viewed" : ""} onClick={() => { setDemoStep(index); setDemoPlaying(false); }} key={step.title}><i style={{ width: index < demoStep ? "100%" : index === demoStep ? "55%" : "0%" }} /></button>)}</div>
                  <span>0{demoStep}:2{demoStep * 3} / {activeDemo.duration}</span>
                </div>
                <p className="demo-caption"><b>Legenda:</b> {activeDemoStep.description}</p>
              </article>

              <aside className="demo-playlist">
                <div className="playlist-heading"><span>TRILHA ESSENCIAL</span><b>{productDemos.length} demonstrações</b></div>
                {productDemos.map((demo, index) => (
                  <button type="button" className={index === demoIndex ? "active" : ""} onClick={() => selectDemo(index)} key={demo.title}>
                    <span className={`playlist-thumb ${demo.accent}`}><i>{index === demoIndex && demoPlaying ? "Ⅱ" : "▶"}</i><small>{demo.duration}</small></span>
                    <span><small>{demo.level}</small><b>{demo.title}</b><em>{demo.description}</em></span>
                  </button>
                ))}
                <div className="playlist-tip"><span>i</span><p><b>Dica rápida</b>Você pode clicar em qualquer capítulo da linha do tempo para rever uma etapa.</p></div>
              </aside>
            </section>

            <section className="academy-next-grid">
              <article><span>01</span><div><small>PRATIQUE AGORA</small><h3>Crie um cenário de teste</h3><p>Use uma empresa fictícia e acompanhe a recomendação aparecer em tempo real.</p></div><button type="button" onClick={() => setSection("simulator")}>Abrir simulador →</button></article>
              <article><span>02</span><div><small>APLIQUE NA CARTEIRA</small><h3>Cadastre a próxima empresa</h3><p>Organize o cliente e mantenha todos os cenários no contexto correto.</p></div><button type="button" onClick={() => { setSection("companies"); setShowCompanyForm(true); }}>Adicionar empresa →</button></article>
            </section>
          </div>
        )}

        {section === "documents" && (
          <div className="page-content documents-page">
            {message && <div className="toast" role="status">{message}</div>}
            <NfeAuditWorkbench companyId={activeCompanyId} companyName={activeCompany?.name ?? null} onUseTotal={useAuditedInvoiceTotal} />
          </div>
        )}
      </section>

      {reviewSubmissionScenario && <div className="approval-modal-backdrop" role="presentation" onMouseDown={() => !reviewMutating && setReviewSubmissionScenario(null)}>
        <section className="approval-modal review-submission-modal" role="dialog" aria-modal="true" aria-labelledby="submission-title" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><span>NOVA RODADA DE REVISÃO</span><h2 id="submission-title">Designar responsável e prazo</h2></div><button type="button" onClick={() => setReviewSubmissionScenario(null)} disabled={reviewMutating} aria-label="Fechar envio">×</button></header>
          <div className="approval-scenario-summary"><span>VERSÃO CONGELADA</span><strong>{reviewSubmissionScenario.name}</strong><small>{activeCompany?.name} · preparado por {reviewSubmissionScenario.preparerName ?? user.displayName} · hash #{reviewSubmissionScenario.inputHash?.slice(0, 12)}</small></div>
          <div className="approval-boundary"><b>O revisor precisa ser outra pessoa.</b><p>Depois do envio, esta versão não poderá ser excluída nem editada. Se houver correções, o sistema criará uma nova versão vinculada.</p></div>
          <div className="review-submission-grid">
            <label>Revisor designado<select value={submissionReviewerId ?? ""} onChange={(event) => setSubmissionReviewerId(Number(event.target.value))}><option value="">Selecione outro profissional</option>{eligibleReviewers.filter((reviewer) => reviewer.userId !== reviewSubmissionScenario.preparedByUserId).map((reviewer) => <option value={reviewer.userId} key={reviewer.userId}>{reviewer.name} · {reviewer.role}</option>)}</select></label>
            <label>Prazo da revisão<input type="date" min={dateInputValue(1)} value={submissionDueDate} onChange={(event) => setSubmissionDueDate(event.target.value)} /></label>
          </div>
          <label>Orientação inicial (opcional)<textarea maxLength={1000} value={submissionNote} onChange={(event) => setSubmissionNote(event.target.value)} placeholder="Indique documentos conferidos, pontos sensíveis ou o que merece atenção." /></label>
          {!eligibleReviewers.some((reviewer) => reviewer.userId !== reviewSubmissionScenario.preparedByUserId) && <p className="review-modal-warning">Convide um revisor, administrador ou proprietário diferente do preparador antes de enviar.</p>}
          <footer><button type="button" className="secondary-button" onClick={() => setReviewSubmissionScenario(null)} disabled={reviewMutating}>Cancelar</button><button type="button" className="primary-button" onClick={() => void submitScenarioReview()} disabled={reviewMutating || !submissionReviewerId || !submissionDueDate}>{reviewMutating ? "Enviando…" : "Enviar para revisão"}</button></footer>
        </section>
      </div>}

      {reviewDecision && <div className="approval-modal-backdrop" role="presentation" onMouseDown={() => !reviewMutating && setReviewDecision(null)}>
        <section className="approval-modal review-decision-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><span>{reviewDecision.decision === "changes_requested" ? "DEVOLUÇÃO CONTROLADA" : "REJEIÇÃO DA VERSÃO"}</span><h2 id="decision-title">{reviewDecision.decision === "changes_requested" ? "Solicitar uma nova versão corrigida" : "Rejeitar esta versão congelada"}</h2></div><button type="button" onClick={() => setReviewDecision(null)} disabled={reviewMutating} aria-label="Fechar decisão">×</button></header>
          <div className="approval-scenario-summary"><span>VERSÃO #{reviewDecision.review.scenarioId}</span><strong>{reviewDecision.review.scenario.name}</strong><small>{reviewDecision.review.company?.name} · preparado por {reviewDecision.review.preparerName}</small></div>
          <div className="approval-boundary"><b>{reviewDecision.decision === "changes_requested" ? "A versão atual será preservada e marcada como devolvida." : "A rejeição é definitiva para esta versão."}</b><p>{reviewDecision.decision === "changes_requested" ? "O preparador poderá copiar as premissas para uma nova versão ligada a esta rodada." : "Se o trabalho continuar, deverá partir de uma nova análise, sem apagar este registro."}</p></div>
          <label>Justificativa obrigatória<textarea autoFocus minLength={10} maxLength={1000} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Descreva objetivamente o erro, a evidência faltante ou o motivo da decisão." /></label>
          <footer><button type="button" className="secondary-button" onClick={() => setReviewDecision(null)} disabled={reviewMutating}>Cancelar</button><button type="button" className={`primary-button ${reviewDecision.decision === "rejected" ? "danger-action" : ""}`} onClick={() => void decideReview()} disabled={reviewMutating || decisionNote.trim().length < 10}>{reviewMutating ? "Registrando…" : reviewDecision.decision === "changes_requested" ? "Solicitar correções" : "Confirmar rejeição"}</button></footer>
        </section>
      </div>}

      {approvalScenario && <div className="approval-modal-backdrop" role="presentation" onMouseDown={() => approvingScenarioId === null && setApprovalScenario(null)}>
        <section className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><span>{workspace.type === "office" ? "SEGUNDA REVISÃO INTERNA" : "REVISÃO DO RESPONSÁVEL"}</span><h2 id="approval-title">{workspace.type === "office" ? "Revisar uma versão preparada por outra pessoa" : "Assumir responsabilidade por esta versão"}</h2></div><button type="button" onClick={() => setApprovalScenario(null)} disabled={approvingScenarioId !== null} aria-label="Fechar revisão">×</button></header>
          <div className="approval-scenario-summary"><span>VERSÃO CONGELADA</span><strong>{approvalScenario.name}</strong><small>{approvalScenario.companyName ?? activeCompany?.name} · hash #{approvalScenario.inputHash?.slice(0, 12)}</small></div>
          <div className="approval-boundary"><b>{workspace.type === "office" ? `Preparado por ${approvalScenario.preparerName ?? "outro membro do escritório"}; revisado por você.` : "Este é o modo para contador responsável ou profissional que trabalha sozinho."}</b><p>{workspace.type === "office" ? "O sistema registrará duas contas distintas e apresentará isso como revisão interna do escritório — não como revisão independente externa nem como validação do CFC." : "O sistema registrará que preparador e revisor são a mesma conta. Isso não será apresentado como revisão independente nem como validação do CFC."}</p></div>
          <label className={professionalRegistration && !professionalRegistrationIsValid(professionalRegistration) ? "approval-field-invalid" : ""}>Registro profissional declarado<input value={professionalRegistration} onChange={(event) => { setProfessionalRegistration(event.target.value); setApprovalError(""); }} maxLength={40} placeholder="Ex.: CRC SP-123456/O-7" aria-invalid={professionalRegistration ? !professionalRegistrationIsValid(professionalRegistration) : undefined} autoFocus /><small>Precisa conter letras e números, como “CRC SP-123456/O-7”.</small></label>
          <label>Nota da revisão (opcional)<textarea value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} maxLength={400} placeholder="Registre conferências, ressalvas ou documentos utilizados." /></label>
          <label className="approval-declaration"><input type="checkbox" checked={approvalAcknowledged} onChange={(event) => { setApprovalAcknowledged(event.target.checked); setApprovalError(""); }} /><span>Eu, <b>{user.displayName}</b>, declaro que revisei as premissas, a origem da alíquota, o resultado congelado e os limites metodológicos desta versão{workspace.type === "office" ? " preparada por outro membro" : ""}.</span></label>
          {approvalError && <div className="approval-inline-error" role="alert"><b>A aprovação não foi concluída</b><span>{approvalError}</span></div>}
          <div className="approval-release-note"><span>4</span><p><b>Liberação da entrega</b>O botão “Entregar ao cliente” será habilitado depois que esta assinatura for confirmada novamente pelo servidor.</p></div>
          <footer><button type="button" className="secondary-button" onClick={() => setApprovalScenario(null)} disabled={approvingScenarioId !== null}>Cancelar</button><button type="button" className="primary-button" onClick={() => void approveAsResponsible()} disabled={approvingScenarioId !== null || !approvalAcknowledged || !professionalRegistrationIsValid(professionalRegistration)}>{approvingScenarioId !== null ? "Assinando revisão…" : workspace.type === "office" ? "Aprovar como segundo revisor" : "Aprovar e assinar versão"}</button></footer>
        </section>
      </div>}
    </main>
  );
}
