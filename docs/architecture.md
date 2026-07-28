# Arquitetura e invariantes

## Fluxo de uma análise

1. Um membro com papel de preparação registra as premissas recebidas do cliente com um identificador idempotente.
2. A API valida vínculo ativo com o espaço de trabalho, papel, empresa e limites de entrada.
3. O servidor executa o motor financeiro e normaliza o snapshot.
4. As entradas recebem um hash SHA-256.
5. Entradas, snapshot, empresa, proprietário estável do espaço e versões recebem assinatura HMAC.
6. O cenário é persistido como rascunho imutável e gera um evento de auditoria.
7. O preparador inicia a revisão interna. No modo independente, a própria conta assume a revisão; no escritório, escolhe outra conta apta, prazo e orientação inicial.
8. O escritório cria uma rodada única para a versão congelada. Comentários, reatribuições e decisões são append-only e permanecem ligados à versão.
9. O revisor designado aprova, solicita correções ou rejeita. Aprovação e mudança de estado ocorrem atomicamente; devolução preserva a versão e exige uma nova versão vinculada.
10. A aprovação recebe assinatura própria, ligada ao hash e à assinatura do cenário.
11. A entrega ao cliente só avança quando as duas assinaturas são válidas.

## Limites de confiança

- O hash identifica uma combinação de entradas; não autentica sozinho a origem.
- A assinatura HMAC detecta divergência do registro, mas não substitui validação fiscal.
- `ready_for_review` significa apenas que as premissas foram fechadas pelo preparador.
- Nenhum fluxo atual atribui o estado “validado” ou “homologado”.
- `office_second_person_review` comprova segregação interna de contas, mas não independência externa nem validação do conselho profissional.

## Modelo de dados

- `accounting_workspaces`: espaço individual ou escritório, proprietário estável e plano sugerido.
- `workspace_members`: vínculo único do usuário com o espaço, papel e estado.
- `workspace_invitations`: convite com token armazenado somente como hash, expiração, papel e aceite.
- `companies`: carteira isolada pelo espaço; `owner_user_id` é preservado como proprietário estável para assinatura e compatibilidade.
- `scenarios`: entrada, versões, snapshot, assinatura, chave idempotente, identidade explícita de quem preparou e vínculo opcional com a versão substituída.
- `scenario_approvals`: decisão append-only, identidade declarada do responsável, nível de garantia e assinatura vinculada à versão revisada.
- `scenario_review_rounds`: responsável designado, prazo, número da rodada, estado e decisão para cada versão do escritório.
- `scenario_review_comments`: conversa e eventos append-only de cada rodada.
- `audit_events`: eventos append-only de cenário e compartilhamento.
- `report_shares`: tokens revogáveis e com expiração.
- `users` e `sessions`: autenticação e sessão da aplicação.
- `billing_accounts`: estado de cobrança desacoplado do motor fiscal.
- `fiscal_rule_sets`: conteúdo normativo versionado, vigência, estado e hash de integridade.
- `fiscal_reference_cases`: entradas e saídas esperadas usadas como regressão de cada versão fiscal.
- `fiscal_knowledge_bases`: bases de pesquisa manual imutáveis por código/versão, com escopo, fontes, data de conferência e hash de integridade.
- `tax_periods`: contêiner da competência por empresa, regime, efeito jurídico e revisão ativa.
- `tax_ledger_entries`: livro append-only de débitos, créditos, ajustes e extinções, sempre vinculado à evidência de origem.
- `tax_reconciliation_snapshots`: capturas assináveis das três fontes de conciliação: livro interno, contabilidade e ambiente oficial.
- `tax_period_closures`: snapshots imutáveis do fechamento, com versão, hash, assinatura e referência do revisor.

Toda consulta de dados privados deve aplicar `workspace_id` e vínculo ativo no servidor. IDs recebidos do cliente nunca são autorização. Escritas também validam o papel; o navegador não é fonte de autorização.

## Escalabilidade

- A carteira carrega a empresa e o último cenário em uma consulta; aprovações são buscadas em lote, sem N+1.
- Listagens extensas usam cursor por ID, sem custo crescente de `OFFSET`.
- Índices compostos acompanham empresa, data e proprietário nos caminhos quentes.
- A criação de cenário é idempotente e tolera concorrência por índice único.
- A fila de revisão usa índices por espaço/estado/prazo e por revisor/estado; carregamentos relacionados são feitos em lote.
- Logs operacionais são emitidos para a infraestrutura, sem gravar uma linha no D1 por requisição.

## Evolução do motor fiscal

Uma nova regra deve incluir:

1. fonte normativa primária e vigência;
2. versão do motor e da metodologia;
3. casos normais, limites e casos adversos;
4. migração somente quando o formato persistido mudar;
5. preservação da leitura de snapshots antigos;
6. revisão profissional antes de disponibilizar qualquer estado homologado.

Nunca recalcule silenciosamente um relatório histórico com uma versão nova do motor.

### Inteligência fiscal determinística

O motor `cbshub-manual-fiscal-0.1.0` não usa modelo generativo nem embeddings. Ele executa uma sequência verificável:

1. normaliza a pergunta e reconhece termos da ontologia manual;
2. extrai rota, tributo, segmento, NCM, CEST e condições declaradas;
3. impede a execução quando o recorte não pertence à base ativa;
4. pede os fatos operacionais ausentes, sem preenchê-los por inferência;
5. aplica somente regras e classificações estruturadas da versão armazenada;
6. devolve achados separados por natureza — alíquota própria, âmbito de ST e parâmetro de tabela;
7. apresenta a trilha de decisão e apenas as fontes efetivamente usadas.

A base inicial `ICMS-SP-MG-AUTOPECAS@0.1.0` cobre exclusivamente autopeças remetidas de São Paulo para Minas Gerais. O resultado máximo é `conditional` enquanto a base estiver no nível `pilot_conditional`. Simples Nacional, destinatário não contribuinte, benefício/regime especial, uso não automotivo ou classificação ausente bloqueiam a conclusão operacional.

NCM, CEST, descrição e uso são condições cumulativas para localizar um item de ST. A MVA mostrada é apenas o parâmetro constante da tabela mineira: o motor não a transforma em ICMS-ST a recolher. Uma alteração de fonte, regra, ontologia ou classificação exige nova versão; reutilizar o mesmo código/versão com conteúdo diferente provoca conflito de hash na inicialização.

## Segregação de funções

O estado interno `responsible_approved` representa uma aprovação assinada, mas seu nível de garantia depende do registro append-only:

- `responsible_self_review`: modo independente; preparador e revisor são a mesma conta;
- `office_second_person_review`: modo escritório; o servidor exige revisor distinto do preparador e papel `owner`, `admin` ou `reviewer`.

Ambos usam credencial profissional `self_declared` nesta fase. O segundo nível é uma revisão interna segregada, não uma revisão independente externa nem uma credencial verificada pelo CFC/CRC. O relatório público distingue os dois casos e identifica preparador e revisor quando aplicável.

O estado `delivered` registra que uma versão já aprovada gerou um link para o cliente. Versões aprovadas não podem ser excluídas pela operação comum; qualquer correção cria uma nova versão e uma nova aprovação.

No escritório, qualquer versão enviada à revisão é preservada, mesmo devolvida ou rejeitada. `changes_requested` encerra a rodada atual; o preparador cria um novo cenário com `supersedes_scenario_id`, e a rodada anterior passa a `superseded`. O índice único desse vínculo impede duas correções concorrentes para a mesma versão.

Uma futura revisão **externa independente** exigirá escopo próprio, convite externo e ausência de vínculo operacional com o escritório; não deve reutilizar o rótulo de segunda revisão interna.

### Papéis do escritório

- `owner`: administra o espaço, prepara e revisa versões de outras pessoas;
- `admin`: convida membros, prepara e revisa versões de outras pessoas;
- `preparer`: cadastra clientes, cria versões e inicia revisão;
- `reviewer`: consulta a carteira e aprova versões preparadas por outras pessoas, sem criar ou entregar cenários.

Convites expiram em sete dias, guardam apenas SHA-256 do token e são aceitos somente pelo e-mail convidado. Nesta fase, um usuário pertence a um único espaço de trabalho e convites aceitam apenas e-mails ainda sem conta.

### Portão de execução fiscal

O catálogo é separado do simulador financeiro. Uma regra só pode ser considerada executável quando, simultaneamente:

1. o conteúdo armazenado reproduz o hash SHA-256 da versão;
2. todos os casos de referência persistidos reproduzem a saída esperada;
3. o modo da versão é `calculation`;
4. o estado da versão é `approved`.

A regra inicial `RTC-BR-2026-TEST@1.0.0` permanece em `reference_only` e `in_review`. Ela reproduz apenas os destaques brutos de CBS e IBS do ano-teste e sempre retorna `netPayableCents: null`. Alterar conteúdo mantendo o mesmo par código/versão provoca conflito e bloqueia a inicialização do catálogo; qualquer mudança normativa exige uma nova versão.

### Livro de apuração assistida

O motor `cbshub-tax-ledger-0.1.0` modela o saldo líquido em cinco camadas:

1. ingestão de DF-e, DeRE, eventos e saldos de abertura com chave única;
2. classificação explícita de incidência, regime e elegibilidade do crédito;
3. livros independentes de CBS e IBS, sem compensação cruzada;
4. conciliação do livro interno com a contabilidade e a Apuração Assistida oficial;
5. fechamento imutável por competência, seguido de ajustes ou estornos em vez de alteração retroativa.

Débitos pendentes entram de forma conservadora e bloqueiam o fechamento. Créditos pendentes, rejeitados ou sem evidência não reduzem o saldo. Pagamentos, split payment e outras extinções só reduzem o débito depois de confirmação na fonte oficial.

O valor `netPayableCents` só pode deixar de ser `null` quando a competência tem efeito produtivo, todos os controles estão completos, não há bloqueadores, a regra foi aprovada e existe revisor independente. O endpoint desta fase é somente leitura; a criação de competências e fechamentos permanece desativada até homologação profissional.

## Rotação de assinatura

A versão atual é `hmac-sha256-v2:k1`, que também cobre `supersedes_scenario_id`. A leitura de `hmac-sha256-v1:k1` permanece compatível somente quando esse vínculo é nulo. Uma rotação deve adicionar uma nova chave e manter a anterior disponível para leitura. Não reutilize o mesmo identificador de versão com outro segredo; isso invalidaria todo o histórico.
