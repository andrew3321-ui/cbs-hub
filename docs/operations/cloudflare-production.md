# Publicação de produção no Cloudflare

## Fonte e ambientes

- Repositório: GitHub `andrew3321-ui/cbs-hub`.
- Branch de produção: `main`.
- Worker de produção: `cbs-hub`.
- URL canônica: `https://cbshub.com.br`.
- Preview por branch e deploy de pull request: bloqueados. Pull requests executam apenas o gate do GitHub.
- Produção recebe uma versão somente depois do merge em `main`.

## Workers Builds

Configure o gatilho de produção com:

```text
Branch includes: main
Build command: npm run ci:build
Deploy command: npm run ci:deploy
```

`ci:build` executa varredura de segredos, lint, validação da sequência de migrations, testes e build. `ci:deploy` recusa branch diferente de `main`, aplica as migrations D1 pendentes, publica o Worker e executa o smoke test. Uma falha interrompe a sequência.

O Wrangler registra migrations já aplicadas em `d1_migrations`. Por isso uma reexecução aplica somente arquivos pendentes. Nunca alterar uma migration que já chegou ao remoto; toda mudança de esquema recebe um novo número.

## Variáveis por ambiente

Variáveis de runtime ficam em **Worker > Settings > Variables and Secrets**. Segredos de build e smoke ficam em **Settings > Build > Build Variables and Secrets**.

| Nome | Ambiente | Secreto | Finalidade |
|---|---|---:|---|
| `PUBLIC_APP_URL` | runtime | não | URL canônica usada em retorno, webhook e compartilhamentos |
| `OBSERVABILITY_SLOW_REQUEST_MS` | runtime | não | limite para alerta estruturado de latência |
| `SECURITY_HASH_KEY` | runtime | sim | HMAC de antifraude e limitação de abuso |
| `SCENARIO_SIGNING_KEY_V1` | runtime | sim | assinatura de cenários e decisões |
| `MERCADO_PAGO_ACCESS_TOKEN` | runtime | sim | conciliação e cobrança |
| `MERCADO_PAGO_WEBHOOK_SECRET` | runtime | sim | autenticação HMAC do webhook |
| `SMOKE_TEST_EMAIL` | build | sim | conta técnica dedicada |
| `SMOKE_TEST_PASSWORD` | build | sim | credencial da conta técnica |
| `SMOKE_REPORT_TOKEN` | build | sim | relatório estável e não sensível da conta técnica |
| `SMOKE_STRICT` | build | não | usar `1` para exigir todos os fluxos autenticados |

Nenhum valor secreto deve ser salvo no Git, D1, logs ou documentação.

## Observabilidade

`GET /api/health` verifica D1 e assinatura de cenários e expõe o ID da versão Cloudflare. Todas as respostas recebem `X-Request-Id` e `X-CBSHub-Version`. Os logs são JSON e produzem:

- `edge.request` para status e duração;
- `edge.alert.error` para HTTP 5xx;
- `edge.alert.latency` quando a duração excede o limite;
- `edge.error` para exceções não tratadas.

No painel Cloudflare, crie notificações para aumento de erros 5xx e latência. A versão e o request ID permitem correlacionar o incidente com o deploy.

## Smoke pós-deploy

O modo estrito valida login real, cálculo determinístico, leitura do faturamento e relatório público sem iniciar cobrança:

```text
SMOKE_BASE_URL=https://cbshub.com.br
SMOKE_STRICT=1
SMOKE_TEST_EMAIL=<build-secret>
SMOKE_TEST_PASSWORD=<build-secret>
SMOKE_REPORT_TOKEN=<build-secret>
npm run smoke:production
```

Sem esses segredos o script entra no modo de fronteira: valida páginas públicas e confirma que cálculo e faturamento permanecem protegidos por autenticação. Esse modo é útil localmente, mas não substitui a evidência estrita da produção.
