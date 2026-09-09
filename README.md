# CBSHub Cybersecurity

Plataforma defensiva para mapear a superfície externa de organizações, comprovar autorização dos ativos e transformar sinais públicos em prioridades de correção rastreáveis.

## Produto atual

- landing pública com diagnóstico passivo sem cadastro;
- workspace autenticado para autorizar domínios por DNS;
- coleta passiva de DNS, e-mail, HTTPS e defesas do navegador;
- fila assíncrona no Cloudflare Queues;
- Worker separado e fila dedicada para validações HTTPS ativas, estritamente limitadas;
- avaliação estruturada por modelo primário e revisão seletiva;
- monitoramento diário de escopos verificados;
- trilha de auditoria, limites de uso e expiração da autorização;
- exportação e exclusão de dados compatíveis com a LGPD.

O agente não explora vulnerabilidades, não executa força bruta, evasão, varredura de portas ou DoS. A validação ativa limita-se a crawl HTTPS seguro e sinais agregados de transporte. Todo escopo persistente exige declaração expressa e comprovação por TXT no DNS.

## Arquitetura

- Vinext/React em Cloudflare Workers;
- Cloudflare D1 com migrações Drizzle versionadas;
- Cloudflare Queues para execuções assíncronas;
- autenticação própria por sessão segura;
- OpenAI chamada exclusivamente no Worker;
- Mercado Pago e emissão de NFS-e mantidos para conciliar contratos existentes.

As tabelas históricas do produto tributário permanecem apenas nas migrações e no fluxo de acesso/exclusão de dados. Elas não alimentam páginas, cálculos ou APIs do produto atual e não devem ser removidas da produção sem uma política formal de retenção e migração.

## Desenvolvimento

Requer Node.js `>=22.13.0`.

```bash
npm install
npm run dev
npm test
```

Verificações principais:

- `npm run build`: gera o Worker e exporta as páginas públicas;
- `npm run test:unit`: executa as regressões atuais;
- `npm run lint`: análise estática;
- `npm run migrations:verify`: confere a sequência das migrações;
- `npm run security:secrets`: procura credenciais incluídas por engano;
- `npm run performance:budget`: valida o orçamento de assets públicos.

## Invariantes de segurança

1. A chave da OpenAI nunca chega ao navegador, ao D1 ou aos logs.
2. Consultas persistentes só rodam em escopos verificados e com autorização vigente.
3. Toda consulta ao D1 é isolada por `workspace_id`.
4. Prompts e respostas seguem esquema fechado e limites de tamanho.
5. Falhas de modelo mantêm um diagnóstico local conservador.
6. O monitor diário pausa quando a prova DNS ou a autorização expira.
7. Exclusão do proprietário remove escopos, jobs e eventos do workspace.
8. Mudanças de esquema são feitas somente por migrações versionadas.

Leia [a arquitetura do agente](docs/security/security-agent-architecture.md) e [o runbook de produção](docs/operations/cloudflare-production.md) antes de alterar execução, modelos ou bindings.
