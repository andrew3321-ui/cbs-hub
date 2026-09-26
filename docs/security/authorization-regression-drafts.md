# Receitas de regressão de autorização — terceiro incremento

Pré-requisito de publicação: migrations `0072_authorization_code_maps.sql` e `0073_authorization_regression_drafts.sql` antes do Worker principal. Não exige outro Worker, plano pago, modelo ou segredo. O runner não muda neste incremento.

## Entregue

Na aba **Projetos**, o administrador seleciona uma regra cujo mapa de código corresponde ao SHA do último scan concluído, confirma revisão/fixture isolada e prepara um pacote determinístico. Não há chamada ao GitHub, IA, alteração em repositório ou execução no alvo durante o preparo. A interface permite revisar o conteúdo e baixar ZIP.

O pacote contém quatro arquivos, sob `.cbshub/authorization/<contractId>/`:

- `profile.json`: rota, modo, IDs e hashes de contrato/mapa/commit, com `requiresAdapter: true`, `testsExecutedByPlatform: false` e `deploymentVerified: false`.
- `authorization.test.mjs`: teste do Node.js 22+ que exige controle positivo da conta dona e negação explícita para anônimo e outra identidade.
- `adapter.mjs`: contrato de integração com a aplicação real; o placeholder lança `CBSHUB_ADAPTER_REQUIRED`. Não há skip ou teste verde de fachada.
- `README.md`: comando do teste, instruções de fixture e integração humana no CI existente, limites e checagem falha → correção → regressão.

Não são alterados `package.json`, workflows, branch ou PR. O conteúdo é uma receita com expectativas prontas, NÃO um adaptador inferido do código ou um teste já integrado ao projeto. Não existe botão de publicação automática para estes rascunhos nesta versão. O fluxo anterior de PRs para dependências permanece separado e não aceita esses arquivos como patch genérico.

## O que o teste exige

O adaptador deve criar um recurso sintético isolado e invocar o handler, a sessão e a política reais da aplicação. Deve identificar duas contas sintéticas diferentes: empresas diferentes no modo horizontal ou papéis diferentes no vertical. Não se deve implementar uma política artificial somente no adaptador — isso testaria o adaptador, não o produto.

O teste gera um marcador NOVO por fixture; o pacote não contém o marcador original nem seu hash ou tokens. Trata-se da mesma expectativa de acesso e rota, não de uma repetição exata da amostra remota original. Um 2xx da conta dona deve conter o marcador. Anônimo e outra identidade devem responder 401/403 sem marcador. 404, redirect, 429, 5xx, sucesso genérico sem marcador, controle positivo ausente, leitura inválida ou corpo acima de 64 KiB não passam. Mensagens da receita não exibem o corpo ou o marcador.

O teste tem timeout de 15 segundos; setup/requisição recebem AbortSignal de 10 segundos. Cancelamento e limpeza dependem da implementação do adaptador. Ele deve honrar os sinais, remover fixtures e não usar rede externa, produção, conta real, base compartilhada ou credenciais reais. A receita NÃO é uma sandbox que possa tornar seguro um adaptador arbitrário. Não é executada pelo Worker.

Para habilitar no CI, um humano adapta a fixture, executa `node --test .cbshub/authorization/<contractId>/authorization.test.mjs`, verifica que remover a checagem real causa falha e então adiciona o comando ao workflow existente por revisão/PR. Um relatório futuro do CI precisará ser vinculado ao SHA testado; este incremento não ingere resultados, não declara correção ou deploy e não fecha achados.

## Integridade e acesso

- Somente workspace com acesso liberado e proprietário/administrador podem preparar; POST exige mesma origem e limita leitura a 1.000 bytes.
- Domínio e repositório devem estar autorizados, conexão ativa, repositório habilitado, mapa concluído íntegro e último scan no mesmo commit. O INSERT do banco revalida tudo para bloquear revogação entre leitura e persistência.
- No máximo 10 novos rascunhos em 24 horas por workspace. Preparo repetido ou concorrente reutiliza contrato/mapa/versão sem gerar duplicata.
- Receita versionada `authorization-regression.1`, pacote SHA-256, vínculos e conteúdo são imutáveis; anonimização do ator continua permitida.
- Download revalida hash e compara o conteúdo completo com a receita determinística. Payload corrompido, arquivo inesperado ou caminho de ZIP arbitrário não é aceito.
- Histórico é restrito ao workspace. Uma receita antiga pode ser exportada após revogação como registro anteriormente autorizado; não autoriza nova leitura/preparo ou qualquer ação externa. Um scan mais novo mostra que a base é histórica.
- Pacote de evidências `cbshub-authorization-proof.3` inclui até 20 metadados de receitas, explicitamente não executadas. LGPD inclui conteúdo gerado, anonimização, exportação, exclusão e retenção de 365 dias. Nunca guarda fonte do cliente.

Rotas:

- `GET /api/security/auth-contracts/regression?repositoryId=srp_...`: mapas candidatos atuais e últimos 20 rascunhos.
- `POST /api/security/auth-contracts/regression`: `{ codeMapId: "scm_...", reviewConfirmed: true }`.
- `GET /api/security/auth-contracts/regression?draftId=srg_...`: pacote e arquivos; `download=zip` baixa o ZIP.

Ao evoluir o gerador, use nova versão e preserve a validação da receita anterior enquanto existir histórico. Não mude silenciosamente arquivos já vinculados a um hash.

## Validação feita

Os testes executam o arquivo GERADO em subprocessos Node com adaptador de laboratório em memória. Nos modos horizontal e vertical, a mesma receita detecta política vulnerável, passa após a checagem de papel/empresa e falha quando ela é reintroduzida. Também rejeita placeholder, identidade repetida, dono sem marcador, sucesso genérico, redirect, marcador em resposta negada e leitura excessiva. Não há alvo externo nem chamada de modelo.

SQLite real em memória verifica isolamento entre workspaces, integridade, cache/concorrência/quota, scan novo, revogação no INSERT, imutabilidade, exportação e bloqueio de conteúdo adulterado mesmo com hash recalculado. Testes não comprovam integração no repositório do cliente, revisão humana, CI real ou versão implantada.

Próximo incremento: integrar um adaptador real para um stack suportado num projeto-piloto autorizado, validar no CI e só depois oferecer um PR de teste revisável. Conectar build/deploy ao SHA é necessário antes de afirmar proteção em produção.
