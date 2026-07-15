# Margem Clara

SaaS para contadores independentes e escritórios contábeis versionarem premissas, revisarem análises com responsabilidade explícita e entregarem resultados rastreáveis aos clientes.

## Stack

- Vinext/React em Cloudflare Workers
- Cloudflare D1 com Drizzle ORM
- autenticação própria por sessão segura
- snapshots financeiros em centavos e pontos-base
- assinatura HMAC de registros críticos
- catálogo fiscal versionado com hash e casos de referência
- livro de apuração CBS/IBS com conciliação e fechamento imutável

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
8. Nenhuma regra fiscal alimenta cálculos antes de passar integridade, regressão, modo de execução e aprovação.
9. CBS e IBS são apurados em livros separados; crédito ou extinção sem evidência nunca reduz o saldo.
10. Competências fechadas são snapshots imutáveis; correções posteriores usam lançamentos de ajuste ou estorno.
11. No modo independente, “revisão do responsável” registra autodeclaração e ausência de segregação de funções; nunca é apresentada como revisão independente.
12. No modo escritório, o servidor exige `reviewer_user_id !== prepared_by_user_id` e um papel apto a revisar; isso é segunda revisão interna, não independência externa.
13. A entrega ao cliente exige duas assinaturas válidas: a da versão calculada e a da aprovação aplicável ao modo de trabalho.
14. O plano Profissional ou Escritório é apenas sugerido no cadastro durante o beta gratuito; nenhuma cobrança nasce automaticamente dessa escolha.

## Modos de trabalho

- **Contador independente:** espaço individual, plano Profissional sugerido e revisão feita pela própria conta responsável, com essa limitação explícita no relatório.
- **Escritório contábil:** carteira compartilhada, plano Escritório sugerido, convites de sete dias e papéis de proprietário, administrador, preparador e revisor.
- Contas individuais existentes podem ativar o modo escritório sem perder empresas ou versões.
- Um usuário pertence a um único espaço de trabalho nesta fase. Convites são destinados a e-mails ainda não cadastrados.

## Operação

`GET /api/health` verifica banco, assinatura criptográfica e versões ativas sem expor segredos. Responde `200` quando saudável e `503` em modo degradado.

`GET /api/fiscal-rules` exige sessão e expõe o catálogo com fontes, vigência, fingerprint, regressões e motivos de bloqueio. A API não oferece escrita nem homologação automática.

`GET /api/tax-determination` exige sessão e expõe o blueprint do livro fiscal, casos adversos e portões de fechamento. Nesta fase, `writesEnabled` e `netPayableEnabled` permanecem falsos.

A chave `SCENARIO_SIGNING_KEY_V1` vive apenas no ambiente publicado. Nunca deve ser gravada no repositório ou enviada ao navegador.

Consulte [Arquitetura e invariantes](docs/architecture.md) antes de alterar o motor fiscal, as rotas de cenário ou o fluxo de revisão.
