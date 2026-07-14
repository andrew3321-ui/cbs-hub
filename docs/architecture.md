# Arquitetura e invariantes

## Fluxo de uma análise

1. O cliente envia as premissas com um identificador idempotente.
2. A API valida propriedade da empresa e limites de entrada.
3. O servidor executa o motor financeiro e normaliza o snapshot.
4. As entradas recebem um hash SHA-256.
5. Entradas, snapshot, empresa, proprietário e versões recebem assinatura HMAC.
6. O cenário é persistido como rascunho imutável e gera um evento de auditoria.
7. Revisão e compartilhamento só avançam após verificação da assinatura.

## Limites de confiança

- O hash identifica uma combinação de entradas; não autentica sozinho a origem.
- A assinatura HMAC detecta divergência do registro, mas não substitui validação fiscal.
- `ready_for_review` significa apenas que as premissas foram fechadas pelo autor.
- Nenhum fluxo atual atribui o estado “validado” ou “homologado”.

## Modelo de dados

- `companies`: raiz de isolamento da carteira por proprietário.
- `scenarios`: entrada, versões, snapshot, assinatura e chave idempotente.
- `audit_events`: eventos append-only de cenário e compartilhamento.
- `report_shares`: tokens revogáveis e com expiração.
- `users` e `sessions`: autenticação e sessão da aplicação.
- `billing_accounts`: estado de cobrança desacoplado do motor fiscal.
- `fiscal_rule_sets`: conteúdo normativo versionado, vigência, estado e hash de integridade.
- `fiscal_reference_cases`: entradas e saídas esperadas usadas como regressão de cada versão fiscal.
- `tax_periods`: contêiner da competência por empresa, regime, efeito jurídico e revisão ativa.
- `tax_ledger_entries`: livro append-only de débitos, créditos, ajustes e extinções, sempre vinculado à evidência de origem.
- `tax_reconciliation_snapshots`: capturas assináveis das três fontes de conciliação: livro interno, contabilidade e ambiente oficial.
- `tax_period_closures`: snapshots imutáveis do fechamento, com versão, hash, assinatura e referência do revisor.

Toda consulta de dados privados deve aplicar o proprietário no servidor. IDs recebidos do cliente nunca são autorização.

## Escalabilidade

- A carteira carrega a empresa e o último cenário em uma única consulta.
- Listagens extensas usam cursor por ID, sem custo crescente de `OFFSET`.
- Índices compostos acompanham empresa, data e proprietário nos caminhos quentes.
- A criação de cenário é idempotente e tolera concorrência por índice único.
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

### Portão de execução fiscal

O catálogo é separado do simulador financeiro. Uma regra só pode ser considerada executável quando, simultaneamente:

1. o conteúdo armazenado reproduz o hash SHA-256 da versão;
2. todos os casos de referência persistidos reproduzem a saída esperada;
3. o modo da versão é `calculation`;
4. o estado da versão é `approved`.

A regra inicial `RTC-BR-2026-TEST@1.0.0` permanece em `reference_only` e `in_review`. Ela reproduz apenas os destaques brutos de CBS e IBS do ano-teste e sempre retorna `netPayableCents: null`. Alterar conteúdo mantendo o mesmo par código/versão provoca conflito e bloqueia a inicialização do catálogo; qualquer mudança normativa exige uma nova versão.

### Livro de apuração assistida

O motor `mc-tax-ledger-0.1.0` modela o saldo líquido em cinco camadas:

1. ingestão de DF-e, DeRE, eventos e saldos de abertura com chave única;
2. classificação explícita de incidência, regime e elegibilidade do crédito;
3. livros independentes de CBS e IBS, sem compensação cruzada;
4. conciliação do livro interno com a contabilidade e a Apuração Assistida oficial;
5. fechamento imutável por competência, seguido de ajustes ou estornos em vez de alteração retroativa.

Débitos pendentes entram de forma conservadora e bloqueiam o fechamento. Créditos pendentes, rejeitados ou sem evidência não reduzem o saldo. Pagamentos, split payment e outras extinções só reduzem o débito depois de confirmação na fonte oficial.

O valor `netPayableCents` só pode deixar de ser `null` quando a competência tem efeito produtivo, todos os controles estão completos, não há bloqueadores, a regra foi aprovada e existe revisor independente. O endpoint desta fase é somente leitura; a criação de competências e fechamentos permanece desativada até homologação profissional.

## Rotação de assinatura

A versão atual é `hmac-sha256-v1:k1`. Uma rotação deve adicionar uma nova chave e manter a anterior disponível para leitura. Não reutilize o mesmo identificador de versão com outro segredo; isso invalidaria todo o histórico.
