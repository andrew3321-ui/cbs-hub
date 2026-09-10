# Arquitetura do agente defensivo

## Fronteiras

O produto para clientes usa o modelo geral já configurado na API. Modelos condicionados ao Trusted Access for Cyber não fazem parte do runtime downstream da CBSHub. Um eventual uso desses modelos deve permanecer em uma superfície interna, separada e acessível somente a operadores aprovados.

O Cloudflare Worker é o plano de controle: autentica o workspace, valida a autorização, limita volume, agenda trabalhos e entrega resultados. Ele não transforma texto do usuário em comandos de sistema e não executa exploração, força bruta, evasão ou negação de serviço.

## Fluxo atual

1. O proprietário ou administrador declara que controla o domínio ou possui autorização expressa.
2. A CBSHub exige um TXT exclusivo no DNS e volta a verificá-lo antes de cada coleta.
3. A declaração de autorização vale por 90 dias e precisa ser renovada explicitamente.
4. A API grava um job `queued` no D1 e publica somente seus identificadores na Cloudflare Queue.
5. O consumidor adquire um lease idempotente, executa a coleta passiva e limita cada job a três tentativas.
6. Evidências estruturadas seguem primeiro para `gpt-5.6-terra`, com raciocínio médio, `store: false`, esquema JSON fechado e instruções defensivas.
7. Um roteador determinístico aciona `gpt-5.6-sol` com raciocínio alto somente diante de baixa confiança, criticidade, alta densidade de riscos ou conflito entre evidência e conclusão. O Sol revisa a evidência e a avaliação primária; ele não escolhe quando será chamado.
8. Evidência, avaliação final, modelos usados, razão do escalonamento, contagens agregadas de tokens e eventos operacionais ficam vinculados ao workspace. Prompts e raciocínio interno não são persistidos.

Se o revisor falhar, o resultado do Terra continua válido e auditado. Se a análise primária falhar ou a chave não estiver configurada, o motor determinístico local produz a priorização conservadora. Assim, indisponibilidade de modelo não interrompe a coleta nem remove os guardrails.

Estados do job: `queued -> running -> completed`; falhas transitórias retornam a `queued`, e falhas terminais chegam a `failed`. Mensagens irrecuperáveis seguem para `cbs-hub-security-scans-dlq`.

## Plano de execução separado

A primeira camada de especialização e triagem manual de blue team está descrita em [security-operations-development.md](security-operations-development.md). Os jobs `blue_team` usam contagens declaradas, com origem explícita, e compartilham o processamento em fila; não executam coleta web nem alteram a agenda passiva.

Testes ativos não são acrescentados ao coletor passivo. O Worker `cbs-hub-security-runner` recebe somente um manifesto HMAC por service binding, repete as validações e executa crawl HTTPS seguro em fila própria. O teto atual é de 25 requisições, sem query, cookies, credenciais, payloads ou comandos livres. Resultados persistidos são agregados e retornam ao plano de controle por conciliação.

Autorização, ativo, janela, técnicas, limites e prazo são obrigatórios antes do despacho. A interface descreve o recurso como validação ativa limitada, não como pentest completo.

As campanhas e os limites do runner estão descritos em [controlled-pentest-and-remediation.md](controlled-pentest-and-remediation.md). O painel de projetos usa uma GitHub App independente e o Worker `cbs-hub-repository-runner` para inspeção estática por SHA, consulta de dependências à OSV e evidências de possíveis segredos. Correções suportadas são preparadas e publicadas em PR em rascunho após aprovação; nenhuma integração realiza merge automático. A configuração e os limites estão em [github-repository-security.md](github-repository-security.md).
