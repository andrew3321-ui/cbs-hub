import Link from "next/link";
import BrandMark from "../BrandMark";
import { getPlatformOperationState, publicLegalSupplierIdentity } from "../platform-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Termos de uso | CBSHub", description: "Condições do teste, da contratação e da operação comercial do CBSHub." };

export default async function TermsPage() {
  const operation = await getPlatformOperationState();
  const supplier = await publicLegalSupplierIdentity();
  return <main className="legal-shell">
    <header className="legal-nav"><Link className="landing-brand" href="/"><BrandMark /><span className="cbs-wordmark"><strong>CBS</strong>Hub</span></Link><div><Link href="/privacidade">Privacidade</Link><Link className="ownership-app-link" href="/app">Abrir plataforma →</Link></div></header>
    <section className="legal-hero"><span>TERMOS DE USO · V2</span><h1>Contratação clara, capacidade previsível.</h1><p>Estes termos registram o período gratuito, a renovação, os limites do produto, o cancelamento e a responsabilidade profissional.</p></section>
    <section className={`terms-mode ${operation.paymentsEnabled ? "live" : "beta"}`}><span>{operation.paymentsEnabled ? "PAGAMENTOS ATIVOS" : "PAGAMENTOS BLOQUEADOS"}</span><strong>{operation.paymentsEnabled ? "O checkout pode criar assinaturas no Mercado Pago." : "Nenhuma nova assinatura paga pode ser criada pelo servidor."}</strong></section>
    {supplier ? <section className="supplier-identity"><span>IDENTIFICAÇÃO DO FORNECEDOR</span><h2>{supplier.name}</h2><p>CPF {supplier.cpf}</p><p>{supplier.address}</p><a href={`mailto:${supplier.email}`}>{supplier.email}</a></section> : <section className="supplier-identity pending"><span>IDENTIFICAÇÃO COMERCIAL</span><h2>Ainda não publicada</h2><p>A operação paga só poderá ser ativada depois que CPF, endereço, canal de atendimento e credenciais de produção forem configurados.</p></section>}
    <section className="legal-list">
      <article><h2>1. Finalidade</h2><p>A plataforma auxilia contadores a organizar informações e produzir análises rastreáveis. Ela não substitui julgamento profissional, legislação vigente, documentos oficiais ou revisão do responsável técnico.</p></article>
      <article><h2>2. Conta e segurança</h2><p>O usuário deve proteger sua senha, manter dados corretos e comunicar suspeitas. Ações relevantes são vinculadas à conta e podem gerar trilha de auditoria.</p></article>
      <article><h2>3. Teste gratuito</h2><p>O primeiro cadastro elegível libera todos os recursos por 5 dias, com até 10 empresas e sem cobrança automática. O benefício é concedido uma vez por aparelho. Identificadores técnicos pseudonimizados podem ser usados para impedir a repetição abusiva, conforme a política de privacidade. Criar outra conta não reinicia o prazo.</p></article>
      <article><h2>4. Pagamentos, capacidade e renovação</h2><p>Quando ativado, o plano CBSHub custa R$ 450 por mês e inclui até 30 empresas. Blocos adicionais de 10 empresas custam R$ 100 mensais cada. O total e a capacidade são apresentados antes da confirmação. O cartão renova automaticamente pelo valor contratado até o cancelamento; a próxima data é exibida na área de planos. O Pix é mensal, não é débito automático e só ativa ou prorroga o acesso após confirmação oficial do Mercado Pago.</p></article>
      <article><h2>5. Cancelamento, arrependimento e reembolso</h2><p>O proprietário do espaço pode cancelar a renovação do cartão na área de planos antes da próxima cobrança. Não oferecemos reembolso comercial voluntário após a disponibilização ou uso do serviço, exceto em cobranças indevidas, duplicadas, falha imputável à plataforma ou demais hipóteses obrigatórias. Esta regra não limita direitos legais indisponíveis. Quando a contratação caracterizar relação de consumo à distância, o direito de arrependimento será atendido no prazo e nas condições do artigo 49 do Código de Defesa do Consumidor. O teste gratuito não elimina direitos previstos em lei. Solicitações podem ser feitas pelo canal de atendimento publicado na identificação do fornecedor.</p></article>
      <article><h2>6. Dados e documentos</h2><p>O usuário deve ter autorização para inserir dados de clientes. Informações fiscais devem ser limitadas ao necessário e tratadas conforme a política de privacidade.</p></article>
      <article><h2>7. Responsabilidade fiscal</h2><p>Resultados parciais, não homologados ou dependentes de premissas não devem ser usados como conclusão definitiva. A entrega ao cliente exige revisão e responsabilidade profissional identificada.</p></article>
    </section>
    <footer className="legal-footer"><span>CBSHub · Termos de uso</span><div><Link href="/privacidade">Privacidade</Link><Link href="/responsavel">Responsável</Link><Link href="/">Início</Link></div></footer>
  </main>;
}
