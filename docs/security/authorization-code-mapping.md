# Autorização → implementação no commit — segundo incremento

Antes de publicar o Worker principal, aplique `0072_authorization_code_maps.sql` após a 0071. O runner não muda neste incremento. Nenhum serviço de computação, credencial ou modelo novo é necessário. A implementação local não é evidência de publicação em produção.

## Fluxo

1. Salve uma regra de acesso na validação autenticada.
2. Em **Projetos**, conecte um repositório autorizado e conclua um scan.
3. No cartão da regra, selecione **Relacionar ao código**. O catálogo cruza a rota GET com o inventário do último scan concluído de cada repositório autorizado do mesmo workspace.
4. Um gestor seleciona o arquivo candidato e confirma que esse repositório implementa a rota do domínio. A declaração não comprova o deploy.
5. O serviço relê o commit exato do scan, sua árvore e até quatro blobs regulares. Confere o SHA-1 do objeto Git e registra SHA-256 da fonte sem armazená-la. A declaração GET da rota deve existir no arquivo; documentação OpenAPI não substitui implementação.
6. A interface apresenta arquivos, linhas e referências lexicais de autenticação, permissões e conta/proprietário, com links para o commit no GitHub. Um scan mais novo torna visível que o mapa é histórico.

## Orçamento e escopo real

- Até 4 fontes de 40.000 bytes, árvore completa de até 10.000 entradas e até 24 imports estáticos candidatos da rota; leitura de somente um nível, sem percorrer imports dos helpers.
- Até 12 referências por arquivo; 10 novas tentativas por workspace em 24 horas, incluindo falhas. Reserva e quota são atômicas; chamadas concorrentes reutilizam a reserva.
- Até 7 chamadas ao GitHub: token de instalação restrito ao repositório, commit, árvore e 4 blobs. Token pede apenas `contents: read` e `metadata: read`. Nunca escreve em branch, arquivo ou PR.
- Zero chamadas a modelos; cache por contrato/repositório/commit/arquivo/versão. Nenhum comando de código é executado.
- Cada chamada revalida autorização vigente do domínio e repositório, conexão, identidade da instalação e habilitação. O banco revalida antes de concluir. Prazo de 60 segundos conferido antes de chamadas e persistência, com timeout individual de 15 segundos; não inicia novas chamadas depois do prazo.
- Árvore truncada, symlink, fonte excessiva, objeto divergente, rota inexistente ou autorização revogada não produzem mapa concluído. Reserva interrompida há mais de 10 minutos pode ser marcada como falha em uma nova solicitação explícita; não há retry automático.

Não resolve aliases, módulos externos, imports dinâmicos, extensões ambíguas ou dependências transitivas. O inventário atual cobre arquivos Next App Router com GET identificável; Pages Router sem método explícito e frameworks não inventariados não são tratados como implementação comprovada. Ausência de referências reconhecidas não significa ausência de controle. Nomes/linhas reconhecidos não provam que uma checagem seja executada ou correta. Não há análise semântica, fluxo de dados, patch automático, teste de exploração ou confirmação da versão implantada.

## API, evidência e privacidade

- `GET /api/security/auth-contracts/code-map?contractId=sac_...`: catálogo e últimos 20 registros do workspace, sem leitura externa.
- `POST /api/security/auth-contracts/code-map`: `contractId`, `repositoryId`, `sourceJobId`, `sourceFile`, `relationshipConfirmed: true`. Exige login, acesso liberado, gestão do workspace e mesma origem. Payload limitado a 2.000 bytes durante a leitura.
- O pacote `cbshub-authorization-proof.2` inclui até 20 mapas além das execuções; hashes são verificadores de conteúdo, não assinatura independente. `deploymentVerified: false` é explícito.
- Banco guarda IDs, commit, caminhos, linhas/categorias, hashes, limites e estado. Não guarda código-fonte, literais, tokens GitHub, marcador, corpos ou prompts. As fontes ficam apenas na memória da solicitação e não são enviadas à IA.
- Retenção dos mapas: 365 dias. Exportação/exclusão do workspace inclui registros; exclusão de membro anonimiza o ator. A história pode continuar existindo após revogação como registro do acesso anteriormente autorizado, sem novas leituras.

## Validação

Os testes usam SQLite real em memória, fontes sintéticas com hashes Git verdadeiros, chave RSA gerada no teste e transporte GitHub simulado. Verificam isolamento, quota/cache/concorrência, limites, declaração de rota, integridade dos blobs, revogação entre leituras e antes de persistir, imutabilidade e minimização. Não testam uma instalação real do cliente, deploy em produção nem descoberta semântica de vulnerabilidades.

O [terceiro incremento](authorization-regression-drafts.md) gera uma receita revisável com adaptador obrigatório, prévia e ZIP na aba Projetos. Integração ao CI real, PR de teste e prova de deploy continuam pendentes. Antes de declarar uma vulnerabilidade corrigida em produção, será necessário ligar o resultado ao deploy real.
