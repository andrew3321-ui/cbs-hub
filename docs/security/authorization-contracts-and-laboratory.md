# Contratos executáveis de autorização — primeiro incremento

Pré-requisito de publicação: aplicar a migration `0071_authorization_contracts.sql`, que depende das migrations 0068–0070, antes de publicar o Worker principal e o runner atualizado. Nenhuma infraestrutura nova, serviço pago ou modelo adicional é necessário neste incremento.

## O que está implementado

Uma análise autenticada concluída, com marcador sintético presente para a conta dona e ausência na resposta anônima, pode ser salva como contrato. O operador confirma que anônimo e outra identidade não devem acessar esse recurso. A versão `authorization-contract.1` fixa domínio por escopo, rota GET, modo vertical/horizontal, hash do marcador e expectativa de acesso. A especificação possui hash SHA-256 canônico; não inclui título, token, corpo de resposta ou texto de IA. Ela é imutável e duplicações no mesmo workspace são idempotentes. Há até 50 contratos por workspace.

O contrato não cria permissão de execução permanente. Cada verificação reutiliza o fluxo autenticado existente: login e entitlement do workspace, permissão de gestor, confirmação do operador, autorização vigente do domínio, TXT reconfirmado pelo runner, dois tokens temporários distintos, marcador igual ao da referência, DNS público antes de cada leitura, três GETs sem redirecionamento e no máximo 64 KiB de leitura por resposta. O limite de uma análise por domínio a cada dez minutos continua valendo. Não há execução automática nem retenção de credenciais para repetição futura.

O banco também rejeita execuções cuja rota, workspace, escopo, modo ou hash de marcador não correspondam ao contrato. Não se pode associar retroativamente uma análise antiga a uma nova regra. A referência original fica separada do histórico de execuções vinculadas. Ela pode expirar pela retenção de 365 dias sem apagar a especificação.

## Resultado determinístico, não opinião do modelo

- `respected`: anônimo e outra conta respondem 401/403 sem marcador; a conta dona responde 2xx com marcador.
- `violated`: com controle positivo válido da conta dona, uma resposta 2xx anônima ou da outra conta contém o marcador sintético que o operador declarou restrito.
- `inconclusive`: execução incompleta, credencial expirada, ausência do controle positivo, redirecionamento, resposta genérica 2xx sem marcador, 404, indisponibilidade, leitura incompleta ou evidência contraditória.

Esses estados referem-se apenas à amostra. Ausência de reprodução não fecha achados automaticamente e não comprova correção em um commit/deploy. A identidade real e o papel das duas contas ainda dependem da declaração do operador; tokens diferentes não provam sozinhos que sejam usuários diferentes.

## Interface e pacote de evidências

Na validação autenticada, o operador salva uma regra a partir de uma análise, escolhe `Usar contrato`, fornece novos tokens e o mesmo marcador. Rota e modo ficam bloqueados para edição. O histórico mostra os resultados determinísticos e a exportação contém até vinte execuções recentes, IDs, datas, códigos HTTP e presença booleana do marcador. Não contém o marcador, seu hash, tokens, corpo de resposta nem prompts. O hash da especificação não é assinatura digital ou certificação independente.

Rotas:

- `GET /api/security/auth-contracts`: contratos do workspace autenticado.
- `POST /api/security/auth-contracts`: salva contrato com `baselineReviewId`, `title` e `confirmed: true`.
- `GET /api/security/auth-contracts?contractId=sac_...`: pacote de evidências; `download=1` solicita arquivo JSON.
- `POST /api/security/auth-review`: aceita `contractId` opcional e exige correspondência exata antes de encaminhar credenciais ao runner.

Exportação/exclusão de conta inclui contratos, e a saída de um membro anonimiza o ator de criação. Não coloque dados pessoais ou credenciais nos títulos.

## Laboratório sem rede

`npm run security:lab` executa o executor de produção com um transporte inteiramente em memória. As aplicações simuladas têm identidades, papéis, empresas e um recurso sintético. O controle de acesso pode ser vulnerável, corrigido e reintroduzido sem trocar a fixture. Não existe servidor acessível, socket, alvo externo, conta real ou chamada de modelo.

Há dezoito cenários: falta/correção de checagem de papel e empresa, acesso anônimo inesperado, 2xx genérico, controle positivo ausente, token dono expirado, redirecionamento externo, 429/503, DNS privado, mudança de DNS antes do envio de credenciais, marcador além de 64 KiB, marcador dividido em chunks, instrução hostil no corpo, conteúdo contraditório em resposta negada e falha de leitura. O teste falha se o resultado divergir, ultrapassar o orçamento, sair da rota aprovada ou retornar o marcador/tokens no resultado. Esse laboratório integra o gate de CI.

Um teste de integração passa pela assinatura HMAC, runner, banco e exportação para reproduzir a sequência vulnerabilidade → correção → regressão → amostra inconclusiva. Isso avalia a execução e classificação determinísticas desse recorte, não inteligência dos modelos nem descoberta em uma aplicação real.

## Próximos incrementos ainda não implementados

1. Mapear o contrato ao repositório, arquivo e SHA com relação domínio/projeto expressamente confirmada.
2. Identificar a versão realmente implantada; não aceitar um SHA informado como prova de deploy.
3. Gerar testes de regressão revisáveis e correções suportadas por PR, com validação no CI do cliente.
4. Expandir para aplicações de laboratório reais isoladas e browser autenticado antes de ampliar técnicas.
5. Avaliar os agentes com chamadas reais, revisão humana e pilotos autorizados; depois oferecer execução contínua com mecanismo seguro de credenciais temporárias.

Este incremento não é um pentest completo, não faz exploração genérica, shell, alterações em produção ou merge automático.
