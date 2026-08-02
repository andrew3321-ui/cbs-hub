import Link from "next/link";
import BrandMark from "./BrandMark";

export function TaxContentNavigation() {
  return <header className="tax-content-nav">
    <Link className="cbs-lockup" href="/" aria-label="CBSHub — início"><BrandMark /><span className="cbs-wordmark"><strong>CBS</strong>Hub</span></Link>
    <nav><Link href="/conteudos">Conteúdos</Link><Link href="/metodologia">Metodologia</Link><Link href="/planos">Planos</Link><Link href="/entrar">Entrar</Link></nav>
    <Link className="tax-content-nav-cta" href="/cadastro?utm_source=google&utm_medium=organic&utm_campaign=conteudo_tributario">Testar por 5 dias →</Link>
  </header>;
}
