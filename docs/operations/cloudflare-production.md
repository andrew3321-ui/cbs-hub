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

`ci:build` executa varredura de segredos, lint, validação da sequência de migrations, testes e build. `ci:deploy` recusa branch diferente de `main`, aplica as migrations D1 pendentes, garante as filas do runner, publica o Worker isolado, sincroniza uma nova chave HMAC entre os dois Workers, publica o controle principal e executa o smoke test. Uma falha interrompe a sequência.

O arquivo raiz `wrangler.jsonc` identifica exclusivamente o Worker web e também fornece os bindings ao plugin Cloudflare durante o build. Ele protege o deploy automático contra a descoberta acidental das configurações dos runners em subdiretórios. O `vite.config.ts` acrescenta somente o entry point TypeScript usado pelo build, sem redeclarar bindings. Os runners continuam sendo publicados apenas com `--config` explícito.

Em Workers Builds (`WORKERS_CI=1`), o deploy publica exclusivamente o Worker web. O ambiente gerenciado vincula a credencial ao serviço `cbs-hub` e pode ignorar o nome presente em configurações aninhadas; por isso os runners e a rotação de sua chave compartilhada ficam restritos ao fluxo operacional executado fora do build automático.

O Wrangler registra migrations já aplicadas em `d1_migrations`. Por isso uma reexecução aplica somente arquivos pendentes. Nunca alterar uma migration que já chegou ao remoto; toda mudança de esquema recebe um novo número.

## Variáveis por ambiente

Variáveis de runtime ficam em **Worker > Settings > Variables and Secrets**. Segredos de build e smoke ficam em **Settings > Build > Build Variables and Secrets**.

| Nome | Ambiente | Secreto | Finalidade |
|---|---|---:|---|
| `PUBLIC_APP_URL` | runtime | não | URL canônica usada em retorno, webhook e compartilhamentos |
| `OBSERVABILITY_SLOW_REQUEST_MS` | runtime | não | limite para alerta estruturado de latência |
| `SECURITY_HASH_KEY` | runtime | sim | HMAC de antifraude e limitação de abuso |
| `SECURITY_INGEST_SIGNING_KEY` | runtime | sim | deriva credenciais HMAC individuais dos conectores de telemetria |
| `SECURITY_RUNNER_SIGNING_KEY` | runtime | sim | assina manifests enviados ao runner isolado |
| `SCENARIO_SIGNING_KEY_V1` | runtime | sim | assinatura de cenários e decisões |
| `MERCADO_PAGO_ACCESS_TOKEN` | runtime | sim | conciliação e cobrança |
| `MERCADO_PAGO_WEBHOOK_SECRET` | runtime | sim | autenticação HMAC do webhook |
| `OPENAI_API_KEY` | runtime | sim | análise estruturada do agente defensivo; somente no Worker |
| `OPENAI_SECURITY_PRIMARY_MODEL` | runtime | não | análise padrão; default `gpt-5.6-terra` com raciocínio médio |
| `OPENAI_SECURITY_REVIEW_MODEL` | runtime | não | revisão escalonada; default `gpt-5.6-sol` com raciocínio alto |
| `FISCAL_ISSUER_ADAPTER` | runtime | não | `manual` até a seleção de um emissor oficial/provedor |
| `FISCAL_ISSUER_MUNICIPALITY_CODE` | runtime | não | código do município do prestador |
| `FISCAL_ISSUER_MUNICIPAL_REGISTRATION` | runtime | sim | inscrição municipal do prestador; exibida somente mascarada |
| `FISCAL_ISSUER_SERVICE_CODE` | runtime | não | código padrão conferido no emissor oficial |
| `FISCAL_ISSUER_SERVICE_DESCRIPTION` | runtime | não | descrição padrão da assinatura |
| `SMOKE_TEST_EMAIL` | build | sim | conta técnica dedicada |
| `SMOKE_TEST_PASSWORD` | build | sim | credencial da conta técnica |
| `SMOKE_REPORT_TOKEN` | build | sim | relatório estável e não sensível da conta técnica |
| `SMOKE_STRICT` | build | não | usar `1` para exigir todos os fluxos autenticados |

Nenhum valor secreto deve ser salvo no Git, D1, logs ou documentação.

Os crons versionados executam expiração de contenções e conciliação de campanhas do runner a cada cinco minutos, rotinas operacionais às 08:15 UTC e o monitor passivo às 12:45 UTC. O service binding `SECURITY_ACTIVE_RUNNER` aponta exclusivamente para `cbs-hub-security-runner`, que não recebe chaves da OpenAI, cobrança ou conectores de clientes. A chave HMAC compartilhada é rotacionada durante a publicação e não é escrita em arquivo ou log.

O executor usa a fila `cbs-hub-active-security-runs` e a DLQ correspondente. Antes de publicar, `npm run runner:check` precisa compilar o Worker separado. O runner compartilha somente o D1 operacional para registrar estado e resultado agregado; o processo separado não recebe acesso aos demais segredos do controle principal.

### Ativação do agente de segurança

Crie uma chave de projeto dedicada na OpenAI, defina limite de gasto no projeto e grave o valor diretamente como segredo do Worker `cbs-hub`. Não cole a chave em conversa, arquivo `.env` versionado ou variável pública:

```text
npx wrangler secret put OPENAI_API_KEY --config wrangler.jsonc
```

As variáveis de modelo são opcionais: os defaults são `gpt-5.6-terra` e `gpt-5.6-sol`. O Terra produz a análise normal; o Sol só é acionado quando uma regra determinística identifica criticidade, alta densidade de riscos, conflito entre evidência e conclusão ou baixa confiança. A variável antiga `OPENAI_SECURITY_MODEL` não é mais usada e pode ser removida depois do rollout.

Sem `OPENAI_API_KEY`, o produto continua emitindo a priorização determinística e identifica na interface que a análise da OpenAI não está ativa. Se a revisão com Sol falhar, a avaliação válida do Terra é preservada; se a chamada primária falhar, o motor determinístico assume. A chave nunca é devolvida por API nem persistida no D1. O D1 guarda somente modelos usados, motivo do escalonamento e contagens agregadas de tokens — nunca o prompt ou raciocínio interno.

## Observabilidade

`GET /api/health` verifica D1 e disponibilidade do runner isolado e expõe o ID da versão Cloudflare. Todas as respostas recebem `X-Request-Id` e `X-CBSHub-Version`. Os logs são JSON e produzem:

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
