# Search Console e funil orgânico

## Configuração segura

1. Crie uma conta de serviço dedicada no Google Cloud e habilite a Search Console API.
2. Adicione o e-mail da conta de serviço como usuário da propriedade `sc-domain:cbshub.com.br` na Search Console.
3. Cadastre `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` e `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` como segredos do Worker. A propriedade pode ficar em `GOOGLE_SEARCH_CONSOLE_SITE_URL`.
4. O servidor solicita exclusivamente `https://www.googleapis.com/auth/webmasters.readonly`. A chave privada nunca integra respostas da API, HTML ou JavaScript do navegador.

## Rotina automática

- O agendamento diário importa 28 dias finalizados de Search Analytics, com dimensões de data, consulta, página, país e dispositivo.
- Todas as páginas públicas do sitemap são verificadas pela URL Inspection API.
- Uma sincronização também pode ser solicitada pelo proprietário no painel. Falhas salvam apenas um código controlado, nunca a resposta bruta do provedor.
- Métricas de busca são mantidas por 486 dias, inspeções por 180 dias e execuções por 730 dias.

## Rotina semanal de decisão

1. Conferir alertas de cliques, impressões, posição, indexação e conversão.
2. Priorizar consultas com muitas impressões, CTR abaixo de 5% e posição alcançável.
3. Comparar páginas de entrada e CTAs antes de alterar título, descrição ou conteúdo.
4. Verificar se a mudança preserva canonical, sitemap, schema e a intenção específica da página.
5. Registrar a decisão no cartão de conteúdo e revisar a métrica novamente após sete dias com dados finalizados.

## Privacidade e atribuição

Consultas da Search Console permanecem agregadas e nunca recebem identificador de usuário, visitante ou sessão. O funil orgânico é calculado separadamente: um cadastro é atribuído quando o mesmo navegador pseudonimizado teve uma visita orgânica nos 30 dias anteriores. Trial e pagamento são conciliados pelo usuário operacional depois do cadastro, sem ligar a pessoa à consulta digitada no Google. IP e user-agent brutos não são persistidos.
