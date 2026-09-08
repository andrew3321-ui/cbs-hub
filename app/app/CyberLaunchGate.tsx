import Link from "next/link";
import BrandMark from "../BrandMark";
import { cyberLaunchOffer, formatCyberPrice } from "../../domain/cyber-commercial";

export default function CyberLaunchGate({ username }: { username: string }) {
  return (
    <main className="cyber-launch-gate">
      <div className="cyber-launch-grid" aria-hidden="true" />
      <header className="cyber-launch-header">
        <Link className="cyber-launch-brand" href="/">
          <BrandMark />
          <span><strong>CBS</strong>Hub <small>Cybersecurity</small></span>
        </Link>
        <div className="cyber-launch-session"><span>@{username}</span><Link href="/sair">Encerrar sessão</Link></div>
      </header>

      <section className="cyber-launch-card">
        <div className="cyber-launch-copy">
          <span className="cyber-launch-eyebrow"><i /> ABERTURA CONTROLADA</span>
          <h1>Seu workspace está reservado.</h1>
          <p>Estamos concluindo os controles de produção antes de liberar operações nos ambientes dos clientes. Sua conta permanece criada e você poderá entrar assim que a abertura for concluída.</p>
          <div className="cyber-launch-status"><i /><span><b>Gate de produção ativo</b><small>Nenhuma análise, automação ou cobrança será iniciada enquanto o acesso estiver fechado.</small></span></div>
        </div>

        <aside className="cyber-launch-offer" aria-label="Oferta de lançamento">
          <span>PLANO DE LANÇAMENTO</span>
          <h2>{formatCyberPrice()}<small>/mês</small></h2>
          <p>Um workspace para monitorar até {cyberLaunchOffer.domainLimit} domínios autorizados.</p>
          <ul>
            <li>Postura externa passiva</li>
            <li>Priorização assistida por IA</li>
            <li>Monitoramento contínuo</li>
            <li>Histórico e evidências rastreáveis</li>
          </ul>
          <strong>Nenhuma cobrança começa agora.</strong>
        </aside>
      </section>

      <footer className="cyber-launch-footer">
        <Link href="/">Voltar ao diagnóstico público</Link>
        <a href="mailto:supportofficial@cbshub.com.br">Falar com a CBSHub</a>
      </footer>
    </main>
  );
}
