import Link from "next/link";
import { getCurrentUser } from "../auth";
import PrivacyActions from "./PrivacyActions";
import { privacyContactEmail } from "../platform-controls";
import { personalDataInventory, PRIVACY_GOVERNANCE_VERSION } from "../../domain/privacy-governance";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacidade e proteção de dados | Margem Clara", description: "Como a Margem Clara minimiza, protege e permite o controle de dados pessoais." };

export default async function PrivacyPage() {
  const user = await getCurrentUser();
  const privacyEmail = privacyContactEmail();
  return <main className="legal-shell">
    <header className="legal-nav"><Link className="landing-brand" href="/"><span className="landing-brand-mark">mc</span><span>margem<strong>clara</strong></span></Link><div><Link href="/termos">Termos</Link><Link className="ownership-app-link" href={user ? "/app" : "/entrar"}>{user ? "Abrir plataforma" : "Entrar"} →</Link></div></header>
    <section className="legal-hero"><span>PRIVACIDADE · LGPD · V1</span><h1>Dados mínimos, finalidade clara e controle do titular.</h1><p>A Margem Clara trata informações necessárias para contas, escritórios, análises fiscais, segurança, prevenção de abuso do teste gratuito e cobrança. Esta página descreve os controles implementados.</p></section>
    <section className="legal-grid">
      <article><span>01</span><h2>Dados tratados</h2><p>Nome, e-mail, perfil profissional, empresas atendidas, premissas, cenários, decisões, documentos fiscais minimizados e, quando houver teste ou contratação, registros técnicos, financeiros e fiscais necessários.</p></article>
      <article><span>02</span><h2>Finalidades</h2><p>Autenticar usuários, separar carteiras, produzir análises rastreáveis, prevenir fraude, atender direitos do titular, prestar suporte e cumprir obrigações contratuais, fiscais e legais aplicáveis.</p></article>
      <article><span>03</span><h2>Minimização</h2><p>XML bruto de NF-e é processado em memória e descartado. Documentos fiscais e marcadores antifraude são transformados em hashes quando o valor integral não é necessário. Características brutas do aparelho e senhas nunca são armazenadas.</p></article>
      <article><span>04</span><h2>Segurança</h2><p>Sessões HttpOnly, hash de senha com derivação reforçada, bloqueio de origem cruzada, limitação de abuso, assinatura de webhooks, segregação por usuário e cabeçalhos defensivos.</p></article>
      <article><span>05</span><h2>Retenção</h2><p>Sessões expiram em até sete dias. Marcadores pseudonimizados usados para impedir testes repetidos podem ser conservados por até 365 dias, inclusive após a exclusão da conta, sem nome, e-mail bruto ou características brutas do aparelho. Os demais dados permanecem enquanto necessários ou até exclusão, ressalvadas obrigações legais.</p></article>
      <article><span>06</span><h2>Compartilhamento</h2><p>A hospedagem processa a aplicação e o banco. O Mercado Pago só participa quando pagamentos forem ativados. A plataforma não vende dados pessoais e não envia XML fiscal bruto ao provedor de pagamento.</p></article>
    </section>
    <section className="legal-rights"><span>SEUS DIREITOS</span><h2>Acesso, correção e exclusão sem esconder o processo.</h2><p>Você pode consultar e corrigir dados dentro da conta, baixar uma cópia estruturada e solicitar exclusão. Registros sujeitos a dever legal podem exigir conservação limitada e justificada.</p><PrivacyActions signedIn={Boolean(user)} initialName={user?.name ?? ""} initialEmail={user?.email ?? ""} /></section>
    <section className="legal-rights"><span>INVENTÁRIO DE DADOS · {PRIVACY_GOVERNANCE_VERSION}</span><h2>O tratamento é documentado por categoria.</h2><div className="legal-grid">{personalDataInventory.map((item) => <article key={item.category}><h3>{item.category}</h3><p><b>Exemplos:</b> {item.examples.join(", ")}.</p><p><b>Bases:</b> {item.legalBases.join("; ")}.</p><p><b>Retenção:</b> {item.retention}.</p><p><b>Exclusão:</b> {item.deletionBehavior}.</p></article>)}</div></section>
    <section className="legal-boundary"><b>Canal de privacidade e incidentes</b><p>{privacyEmail ? <>Solicitações de titulares e comunicações de segurança podem ser enviadas para <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</> : <>O canal dedicado está em configuração. Direitos autenticados continuam disponíveis dentro da conta.</>}</p></section>
    <section className="legal-boundary"><b>Limite técnico responsável</b><p>Nenhuma aplicação conectada à internet é invulnerável. Os controles reduzem risco e criam barreiras em camadas; monitoramento, atualização, resposta a incidentes e revisão profissional continuam obrigatórios.</p></section>
    <footer className="legal-footer"><span>Margem Clara · Privacidade desde a concepção</span><div><Link href="/responsavel">Responsável</Link><Link href="/termos">Termos</Link><Link href="/">Início</Link></div></footer>
  </main>;
}
