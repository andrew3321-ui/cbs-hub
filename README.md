# Margem Clara

SaaS de inteligência tributária para versionar premissas, calcular impacto em margem e preparar análises para revisão profissional.

## Stack

- Vinext/React em Cloudflare Workers
- Cloudflare D1 com Drizzle ORM
- autenticação própria por sessão segura
- snapshots financeiros em centavos e pontos-base
- assinatura HMAC de registros críticos

## Desenvolvimento

Requer Node.js `>=22.13.0`.

```bash
npm install
npm run dev
npm test
```

Comandos principais:

- `npm run build`: gera o artefato de produção;
- `npm test`: executa build e regressões;
- `npm run lint`: análise estática completa;
- `npm run db:generate`: gera uma migração após alteração em `db/schema.ts`.

## Regras de engenharia

1. Valores monetários persistidos usam centavos inteiros; percentuais usam pontos-base.
2. O navegador mostra uma prévia, mas o servidor recalcula e congela o resultado ao salvar.
3. Cenários salvos são imutáveis; correções geram uma nova versão.
4. Uma assinatura inválida bloqueia revisão, compartilhamento e relatório público.
5. Toda alteração de esquema exige migração Drizzle inspecionada e teste de produção.
6. Escritas acionadas pelo navegador devem ser idempotentes.
7. Toda rota crítica emite `X-Request-Id` e log estruturado sem dados fiscais ou pessoais.

## Operação

`GET /api/health` verifica banco, assinatura criptográfica e versões ativas sem expor segredos. Responde `200` quando saudável e `503` em modo degradado.

A chave `SCENARIO_SIGNING_KEY_V1` vive apenas no ambiente publicado. Nunca deve ser gravada no repositório ou enviada ao navegador.

Consulte [Arquitetura e invariantes](docs/architecture.md) antes de alterar o motor fiscal, as rotas de cenário ou o fluxo de revisão.
