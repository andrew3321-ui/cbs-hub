# Orçamento público de performance e rastreabilidade

O gate público do CBSHub usa dois conjuntos de evidências complementares:

- Campo real, no percentil 75 e separado entre mobile e desktop: LCP até 2.500 ms, INP até 200 ms e CLS até 0,1.
- Laboratório e build: JavaScript inicial até 330 KiB, CSS público até 330 KiB, HTML por rota até 180 KiB, nenhum link quebrado, nenhum redirecionamento em cadeia e cobertura exata de sitemap/canonical/robots.

INP não é inferido pelo laboratório. O Lighthouse fornece LCP e CLS e o TBT é usado somente como guarda de regressão, sem ser apresentado como equivalente a INP. O painel do proprietário preserva ausência de amostras como “dados insuficientes”.

As rotas públicas são verificadas como navegador comum e Googlebot. APIs privadas, workspace e autenticação permanecem `noindex` e `no-store`. Assets com hash são imutáveis. Animações respeitam `prefers-reduced-motion`, e o diagnóstico público só carrega código necessário à interação.

Fontes metodológicas: [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds), [Web Vitals field measurement](https://web.dev/articles/vitals) e [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).
