import Link from "next/link";
import BrandMark from "./BrandMark";

export function CyberMarketingHeader() {
  return (
    <header className="marketing-nav">
      <Link
        className="marketing-lockup"
        href="/"
        aria-label="CBSHub Cybersecurity — início"
      >
        <BrandMark />
        <span>
          <strong>CBS</strong>Hub <small>Cybersecurity</small>
        </span>
      </Link>
      <nav aria-label="Navegação principal">
        <Link href="/produto">Produto</Link>
        <Link href="/casos-de-uso">Casos de uso</Link>
        <Link href="/seguranca">Segurança</Link>
        <Link href="/precos">Preços</Link>
      </nav>
      <div>
        <Link className="marketing-login" href="/entrar?returnTo=%2Fapp">
          Entrar
        </Link>
        <Link
          className="marketing-button compact"
          href="/cadastro"
          aria-label="Reservar acesso"
        >
          <span className="marketing-cta-label">Reservar acesso</span>
          <span>→</span>
        </Link>
      </div>
    </header>
  );
}

export function CyberMarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-lockup">
        <BrandMark />
        <span>
          <strong>CBS</strong>Hub <small>Cybersecurity</small>
        </span>
      </div>
      <p>
        Operações somente em ativos próprios ou expressamente autorizados.
        <br />
        Suporte:{" "}
        <a href="mailto:supportofficial@cbshub.com.br">
          supportofficial@cbshub.com.br
        </a>
      </p>
      <div>
        <Link href="/produto">Produto</Link>
        <Link href="/casos-de-uso">Casos de uso</Link>
        <Link href="/seguranca">Segurança</Link>
        <Link href="/precos">Preços</Link>
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/termos">Termos</Link>
      </div>
    </footer>
  );
}
