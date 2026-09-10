# Segurança de repositórios GitHub

Versão inicial: `repository-security.2026-09-09.v1`.

## Fluxo entregue

O administrador instala uma GitHub App nos repositórios selecionados e conecta sua identidade GitHub ao workspace pelo OAuth da App. O callback consome um state de uso único, válido por dez minutos e vinculado ao usuário e workspace autenticados. Apenas os repositórios nos quais o usuário tem permissão administrativa são importados. A instalação só pode pertencer a um workspace. Importar não autoriza análise: o usuário ativa cada projeto explicitamente. Reconectar pausa os projetos e exige nova ativação.

As autorizações duram 90 dias. O token de usuário é usado apenas durante o callback e não é persistido. Tokens de instalação são emitidos com acesso a um único repositório e permissões de leitura para o scanner. Escrita de conteúdo e pull requests é pedida somente ao publicar uma correção aprovada. O cliente pode desconectar a instalação no painel; a remoção/suspensão no GitHub também desativa os projetos via webhook assinado.

## Análise

O Cloudflare Worker `cbs-hub-repository-runner` consome uma fila própria. Ele inspeciona conteúdo pela API do GitHub em um SHA imutável. Não clona nem executa código, scripts de instalação ou testes do cliente. O Worker não recebe a chave OpenAI nem credenciais de cobrança.

- Até 40 arquivos, 512 KB por arquivo, 4 MB de conteúdo e 150 pacotes por análise.
- Até 30 análises por workspace em 24 horas.
- Dependências: versões exatas de package-lock npm v2/v3, com consulta à OSV. Não há suporte completo a outros ecossistemas, monorepos grandes ou histórico Git nesta versão.
- Segredos: padrões de tokens e cabeçalhos de chave privada. Os valores encontrados não são armazenados ou usados; a evidência contém regra, arquivo e linha. São candidatos a revisão, não credenciais confirmadas.
- Código: heurísticas de validação TLS desativada e eval. Não equivale a SAST abrangente.
- Quando há limite, lockfile não suportado ou árvore truncada, a cobertura é parcial. A ausência de um achado não pode resolvê-lo nessa execução.
- Reanálise completa que não observa mais um achado marca `resolved`. Isso não prova que uma credencial antiga foi revogada; a recomendação de rotação permanece necessária.

Push na branch principal gera reanálise se o cliente ativou monitoramento. Push durante um job solicita nova análise após sua conclusão. Uma rotina a cada dez minutos recolhe esses pedidos e encerra jobs interrompidos. Webhooks duplicados têm identificação persistida; falhas transitórias recebem erro para permitir reentrega.

## Correções

A receita inicial cobre uma dependência npm direta com versão exata, mesma versão principal, sem dependências adicionais, sem scripts de instalação e sem mudança de engines. O scanner propõe a versão corrigida a partir da OSV; o preparo consulta novamente a versão proposta e obtém tarball/integridade do registro npm. Package.json e package-lock são alterados juntos e validados estruturalmente.

Propostas expiram em 24 horas. Antes de publicar, o SHA da branch principal deve continuar igual à base revisada. A autorização explícita cria uma branch `cbshub/security-*` e um PR em rascunho. Nenhum merge é executado. O PR informa as verificações feitas e que os testes do projeto devem rodar no CI do cliente. Não existe geração livre de patches por IA nesta versão.

Se a publicação falhar após começar a escrever, a proposta fica em revisão. Não há repetição automática que possa duplicar a alteração. O operador deve conferir a branch e eventual PR. Após abrir o PR, o conteúdo temporário dos arquivos é apagado do D1. Ao receber o fechamento do PR, o webhook registra merge/fechamento; o push resultante faz a revalidação quando habilitada.

## Ativação da GitHub App

Criar a App em GitHub → Settings → Developer settings → GitHub Apps:

- Nome/slug: escolher um nome disponível para a CBSHub.
- Homepage: `https://cbshub.com.br`.
- User authorization callback: `https://cbshub.com.br/api/github/callback`.
- Webhook: `https://cbshub.com.br/api/github/webhook`, ativo e com segredo aleatório de no mínimo 32 caracteres.
- Permissões de repositório: Metadata Read, Contents Read and write, Pull requests Read and write.
- Eventos: Push, Pull request. Instalação e alterações dos repositórios também são tratadas.
- A App precisa permitir instalação nas contas dos clientes para uso externo.
- Gerar chave privada da App e client secret para OAuth. O ID da App é diferente do Client ID.

Valores do runtime principal: `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`. O runner recebe apenas `GITHUB_APP_ID` e `GITHUB_APP_PRIVATE_KEY`. Chaves PKCS#1 e PKCS#8 são convertidas com a compatibilidade Node do Worker. Nenhum segredo fica no frontend, Git ou documentação.

Depois de publicar os Workers, fornecer os valores por ambiente seguro e executar `node scripts/configure-github-app.mjs`. O script envia os segredos pelo stdin do Wrangler e não imprime seus valores. A instalação em conta real e o consentimento OAuth precisam ser realizados pelo administrador no GitHub. Sem configuração, o painel mostra integração aguardando ativação.

## Dados e verificação

Migration: `0063_github_repository_security.sql`. Exportação de conta inclui conexões, projetos, análises, evidências, validações e auditoria; exclusão do workspace remove todos esses registros. Estados OAuth expiram em dez minutos e são limpos diariamente; entregas de webhook são retidas por 30 dias; eventos por 365 dias. Patches temporários expiram em 24 horas e são apagados após publicação.

Testes automatizados cobrem state/replay, isolamento de workspace, filtragem por administração do repositório, assinatura de webhook, revogação, escopo do token, leitura por SHA, redaction de segredos, cobertura parcial, consistência do lockfile e publicação de PR sem atualizar a branch principal. A homologação real depende da App configurada e instalada; testes com APIs simuladas não comprovam permissões reais no GitHub.

Referências primárias: [GitHub App OAuth](https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-a-login-with-github-button-with-a-github-app), [tokens de instalação](https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app), [assinatura de webhooks](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), [OSV querybatch](https://google.github.io/osv.dev/post-v1-querybatch/).
