# Margem Clara

SaaS para contadores independentes e escritórios contábeis versionarem premissas, revisarem análises com responsabilidade explícita e entregarem resultados rastreáveis aos clientes.

## Stack

- Vinext/React em Cloudflare Workers
- Cloudflare D1 com Drizzle ORM
- autenticação própria por sessão segura
- snapshots financeiros em centavos e pontos-base
- assinatura HMAC de registros críticos
- catálogo fiscal versionado com hash e casos de referência
- inteligência fiscal determinística com ontologia, regras manuais e fontes oficiais
- auditoria estrutural de NF-e XML no servidor, com minimização de dados e confronto com dossiês
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
14. A escolha feita no cadastro define o modo de trabalho, não o preço. O primeiro cadastro elegível recebe um trial de 5 dias, 10 empresas e todos os recursos; depois, o gratuito permite 1 empresa. O plano Margem Clara custa R$ 450/mês, inclui 30 empresas e permite blocos adicionais de 10 por R$ 100/mês, com limite atômico no servidor.
15. No escritório, toda revisão congelada tem um responsável designado, prazo e rodada; somente o responsável distinto do preparador pode decidir.
16. Comentários e decisões são append-only. Uma solicitação de correção nunca reabre a versão: cria outro cenário ligado por `supersedes_scenario_id`.
17. A pesquisa fiscal não inventa fatos: qualquer condição ausente, fora da cobertura ou ainda não modelada bloqueia a conclusão operacional.
18. XML fiscal é processado apenas em memória: o arquivo bruto e a chave de acesso completa não são persistidos; ficam hash, chave mascarada e evidências estruturadas.
19. Totais de produtos, ICMS, ICMS-ST e FCP-ST precisam fechar exatamente em centavos; qualquer divergência bloqueia o documento.

## Modos de trabalho

- **Contador independente:** espaço individual e revisão feita pela própria conta responsável, com essa limitação explícita no relatório.
- **Escritório contábil:** carteira compartilhada, convites de sete dias e papéis de proprietário, administrador, preparador e revisor. O modo colaborativo está incluído no plano Margem Clara.
- Contas individuais existentes podem ativar o modo escritório sem perder empresas ou versões.
- Um usuário pertence a um único espaço de trabalho nesta fase. Convites são destinados a e-mails ainda não cadastrados.

## Operação

`GET /api/health` verifica banco, assinatura criptográfica e versões ativas sem expor segredos. Responde `200` quando saudável e `503` em modo degradado.

`GET /api/fiscal-rules` exige sessão e expõe o catálogo com fontes, vigência, fingerprint, regressões e motivos de bloqueio. A API não oferece escrita nem homologação automática.

`GET /api/tax-determination` exige sessão e expõe o blueprint do livro fiscal, casos adversos e portões de fechamento. Nesta fase, `writesEnabled` e `netPayableEnabled` permanecem falsos.

`GET /api/fiscal-intelligence` expõe o escopo e a integridade da base manual ativa. `POST /api/fiscal-intelligence` extrai fatos da pergunta, aplica apenas regras estruturadas e devolve pendências, achados, trilha de decisão e fontes usadas. A versão inicial cobre ICMS de autopeças em operações SP→MG e nunca rotula a resposta como definitiva.

`POST /api/national-coverage/auto-parts` calcula somente o produto controlado CEST 01.075.00/NCM 8708 nas dez rotas ativas e devolve um dossiê prévio. Os nove fatos exigem regime, papéis, finalidade de revenda, condição do consumidor, benefícios e documentos explícitos. `saveDossier: true` recalcula no servidor e persiste um snapshot imutável com hash, fontes, vigência, MVA, alíquotas, FCP, redução afastada, memória em centavos e bloqueadores. Rotas, produtos ou datas fora do recorte permanecem sem valor final.

`POST /api/national-coverage/beverages/sp-destination` controla 35 células exatas de PMPF nas sete origens prioritárias com destino a São Paulo. `POST /api/national-coverage/beverages/sp-origin` controla dez células exatas de São Paulo para Minas Gerais e Rio de Janeiro. Ambos exigem finalidade de revenda, consumidor, regime, benefícios e redução explicitamente confirmados, produzem prévia e aceitam `saveDossier: true`; pauta afastada, perfil divergente, vigência inválida ou fato ausente gera dossiê parcial/não suportado, nunca um cálculo presumido. O relatório autenticado em `/relatorio-fiscal/:id` reconstrói dossiês de autopeças e bebidas e bloqueia snapshots cujo SHA-256 não confere.

`GET /api/fiscal-documents` lista auditorias e evidências no espaço contábil. `POST /api/fiscal-documents` aceita uma NF-e XML UTF-8 de até 5 MB, recusa estruturas inseguras, valida chave/protocolo/itens/totais e pode confrontar o documento com um dossiê V22 do mesmo cliente. O perfil é estrutural: ainda não executa XSD integral, validação criptográfica da cadeia do certificado nem consulta automática de eventos posteriores.

`GET /api/reviews` lista a fila do escritório, métricas de prazo, revisores elegíveis e a conversa de cada rodada. `POST /api/reviews` adiciona comentários, reatribui itens ou registra devolução/rejeição; a aprovação assinada continua em `POST /api/scenarios/approve`.

`GET/POST /api/admin/billing` exige que o e-mail autenticado conste em `PLATFORM_ADMIN_EMAILS` (ou no legado `LEGACY_OWNER_EMAIL`). A central concilia assinaturas, pagamentos e pendências de NFS-e. Ela nunca recebe tokens pelo navegador e não emite nota automaticamente.

O modo beta é persistido em D1 e somente o administrador da plataforma pode alterá-lo. Com o beta ativo, o servidor registra interesse, mas não cria cobranças. A ativação comercial exige credencial de produção, conciliação oficial, CPF válido do fornecedor, endereço legal, canal de privacidade e `SECURITY_HASH_KEY` com pelo menos 32 caracteres. O webhook HMAC é uma camada opcional; a confirmação pela API oficial continua obrigatória.

O plano efetivo pertence ao responsável pelo espaço profissional e é resolvido no servidor a partir do estado conciliado da assinatura. Pagamento pendente, cartão pausado e Pix vencido não liberam benefícios. Ao atingir ou ultrapassar a capacidade contratada, a carteira existente permanece íntegra e acessível, mas novos cadastros são recusados com o código `PLAN_COMPANY_LIMIT`. O plano Margem Clara libera todos os módulos e a colaboração; os blocos adicionais alteram somente o número máximo de empresas.

O trial começa no cadastro do proprietário do espaço, termina exatamente após 5 dias e não exige cartão. Um ledger em D1 impede nova concessão para o mesmo identificador de instalação, ambiente técnico ou identidade de e-mail. O navegador conserva um marcador local e outro HttpOnly; o servidor armazena somente HMACs pseudonimizados. Convites de equipe herdam o acesso do escritório e nunca abrem outro trial. Depois da expiração, a conta retorna ao gratuito mesmo que o modo beta legado permaneça ligado.

`PLATFORM_OWNER_TAX_ID`, `PLATFORM_OWNER_LEGAL_ADDRESS` e `PLATFORM_PRIVACY_CONTACT_EMAIL` alimentam a identificação comercial publicada apenas quando pagamentos estiverem ativos. `SECURITY_HASH_KEY` deve ter pelo menos 32 caracteres e pseudonimiza os marcadores de rede, limitação de abuso e concessão única do trial.

A cobrança usa `MERCADO_PAGO_ACCESS_TOKEN` somente no servidor e oferece dois fluxos separados: cartão recorrente por `/preapproval` e Pix mensal por `/v1/payments`. O Pix é idempotente, expira em 24 horas e só ativa ou prorroga o acesso quando a consulta oficial confirma referência, plano, valor, BRL, método `pix` e estado `approved`. QR Code, Copia e Cola e link de pagamento vêm do Mercado Pago; a chave Pix do fornecedor não é armazenada nem publicada. `MERCADO_PAGO_WEBHOOK_SECRET` permanece opcional para HMAC, e `/api/billing/webhook` aceita `payment`, `subscription_preapproval` e `subscription_authorized_payment` quando a assinatura oficial estiver configurada.

A chave `SCENARIO_SIGNING_KEY_V1` vive apenas no ambiente publicado. Nunca deve ser gravada no repositório ou enviada ao navegador.

Consulte [Arquitetura e invariantes](docs/architecture.md) antes de alterar o motor fiscal, as rotas de cenário ou o fluxo de revisão.
