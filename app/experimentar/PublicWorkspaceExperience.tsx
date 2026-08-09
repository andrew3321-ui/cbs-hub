"use client";

import Link from "next/link";
import BrandMark from "../BrandMark";
import LandingFiscalPreview from "../LandingFiscalPreview";

type PublicWorkspaceExperienceProps = { registerHref: string; loginHref: string };

export default function PublicWorkspaceExperience({ registerHref, loginHref }: PublicWorkspaceExperienceProps) {
  return <main className="public-workspace">
    <header className="public-workspace-topbar">
      <Link className="public-workspace-brand" href="/" aria-label="CBSHub — início"><BrandMark /><span><strong>CBS</strong>Hub</span></Link>
      <div className="public-workspace-context"><i /> Ambiente de experimentação</div>
      <nav aria-label="Acesso à conta"><Link href={loginHref}>Já tenho conta</Link><Link className="public-workspace-register" href={registerHref}>Criar acesso <span>→</span></Link></nav>
    </header>

    <div className="public-workspace-layout">
      <aside className="public-workspace-sidebar" aria-label="Recursos demonstrados">
        <div><small>EXPERIMENTE AGORA</small><strong>Inteligência fiscal</strong><span>Faça uma pergunta real e veja o sistema estruturar o recorte.</span></div>
        <ul>
          <li className="active"><b>⌕</b><span>Pesquisa e triagem</span><em>aberto</em></li>
          <li><b>∑</b><span>Cálculo completo</span><em>após cadastro</em></li>
          <li><b>◇</b><span>Memória e fontes</span><em>após cadastro</em></li>
          <li><b>≡</b><span>Dossiê para o cliente</span><em>após cadastro</em></li>
        </ul>
        <p><i>✓</i><span>Este ambiente não acessa empresas, contas ou documentos de outros usuários.</span></p>
      </aside>

      <section className="public-workspace-stage">
        <div className="public-workspace-heading">
          <span>VEJA O VALOR ANTES DO CADASTRO</span>
          <h1>Comece por uma dúvida que chegou ao seu escritório.</h1>
          <p>Use até duas análises públicas. Ao criar o acesso, sua pergunta segue preenchida para você confirmar os fatos, calcular e gerar a entrega.</p>
        </div>
        <LandingFiscalPreview authenticated={false} surface="workspace" operationLimit={2} />
        <div className="public-workspace-proof" aria-label="Condições da experiência">
          <span><b>Agora</b><small>2 análises sem cadastro</small></span>
          <span><b>Depois</b><small>5 dias de acesso completo</small></span>
          <span><b>Sem risco</b><small>nenhum cartão solicitado</small></span>
        </div>
      </section>
    </div>
  </main>;
}
