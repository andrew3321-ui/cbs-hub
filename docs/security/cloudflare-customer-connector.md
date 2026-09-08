# Conector Cloudflare por cliente

O conector nativo associa uma zona Cloudflare a um escopo que já passou pela verificação DNS e mantém uma declaração de autorização vigente. A zona retornada pela API precisa ter exatamente o mesmo nome do domínio autorizado; autorizar apenas um subdomínio não permite conectar silenciosamente a zona superior.

## Credencial mínima

Crie um API Token dedicado, limitado a uma única zona, com:

- `Account Analytics: Read`, para consultar `firewallEventsAdaptive`;
- `Zone: Read`, limitado à zona autorizada;
- `Zone WAF: Read`, para inspecionar os rulesets e as fases do WAF sem alterá-los.

O token de observação permanece estritamente `observe_only`. Para aplicar uma mudança, o administrador precisa conectar um **segundo token**, também limitado à mesma zona, com `Zone: Read`, `Zone WAF: Read` e `Zone WAF: Write`. As duas credenciais usam ciphertexts e AADs diferentes; o token de leitura nunca é promovido ou reutilizado para escrita.

## Proteção da credencial

`SECURITY_CONNECTOR_ENCRYPTION_KEY` deve ser um segredo aleatório e exclusivo, com no mínimo 32 caracteres, configurado apenas no Worker. O token é cifrado com AES-GCM, IV aleatório e dados autenticados que vinculam a credencial ao conector, ao escopo e à zona. A API nunca devolve o token depois da conexão.

Rotacionar o token substitui imediatamente o ciphertext anterior. Desconectar marca o conector como revogado e apaga ciphertext e IV. Nunca registre token, payload de autenticação ou plaintext em logs.

## Estados e auditoria

- `active`: token, zona e domínio foram validados;
- `error`: o teste de saúde falhou e o código sanitizado foi persistido;
- `paused`: ingestão pausada sem apagar a credencial;
- `revoked`: credencial apagada e conector encerrado.

Eventos de conexão, rotação, teste de saúde e desconexão entram em `security_defense_events`. O teste de saúde relê a zona e as capacidades; não executa mutações externas.

## Coleta de eventos

O cron consulta a API GraphQL da Cloudflare a cada cinco minutos, em lotes de até 200 eventos e com dois minutos de sobreposição. O índice único `(connector_id, external_event_id)` elimina repetições. O cursor só avança quando a janela não está saturada; uma janela cheia recebe `CLOUDFLARE_EVENT_WINDOW_SATURATED` em vez de ocultar possível perda. Zonas com esse volume devem evoluir para Logpush.

A consulta solicita apenas ação, país, IP, caminho, horário e origem do mecanismo de segurança. Query string e user-agent não são coletados. O IP existe somente em memória durante a ingestão e é convertido em HMAC antes de chegar ao D1. Auditoria de coleta guarda apenas intervalo e contagens agregadas.

`firewallEventsAdaptive` é uma visão adaptativa e pode ser amostrada pela Cloudflare. O painel trata os registros como eventos observados, não como uma contagem forense exata de todo o tráfego.

Somente ações efetivamente mitigadas (`block`, `drop` e desafios) viram sinais. Elas entram com confiança média e em `observe_only`, portanto alimentam incidentes para investigação, mas nunca alteram automaticamente o WAF do cliente.

## Defense Control Plane — V2

A auditoria de postura lê diariamente os entrypoints `http_request_firewall_custom`, `http_ratelimit` e `http_request_firewall_managed`. O score é determinístico e apresenta separadamente visibilidade de eventos, rulesets gerenciados, rate limiting, controles personalizados e exceções. Ele mede somente a postura observável do edge; não equivale a certificação, pentest nem comprovação de ausência de vulnerabilidades.

Cada execução cria um snapshot com fingerprint da configuração. Expressões de regras, payloads e credenciais não são persistidos: o snapshot armazena apenas contagens controladas e estados necessários para explicar o score.

Lacunas geram propostas em estado `draft`. Somente a categoria `rate_limit` possui aplicação externa na V2, sempre por rota exata, sem curingas ou query string. O servidor constrói a expressão, fixa a ação `managed_challenge`, usa período de 60 segundos e `mitigation_timeout: 0`, comportamento compatível com throttling por desafio nos planos Free, Pro e Business. Limites aceitos ficam entre 20 e 10.000 requisições por minuto.

O fluxo exige aprovação humana e estas transições:

1. auditoria somente leitura e snapshot da configuração;
2. configuração de uma prévia determinística vinculada ao fingerprint do snapshot;
3. aprovação explícita de proprietário/administrador, válida por 30 minutos e ainda sem mutação;
4. nova auditoria imediatamente antes da execução; qualquer drift devolve a proposta a `draft`;
5. criação de uma única regra no entrypoint `http_ratelimit` e leitura pós-aplicação para confirmar ID, ação e propriedade;
6. rollback somente pelo ID exato do ruleset e da regra criados pelo CBSHub.

Conectar a credencial, gerar a prévia e aprovar não enviam `POST`, `PATCH` ou `DELETE` à Cloudflare. Não existe cron de aplicação e a IA não fornece URL, método, expressão, ação ou payload à camada de mutação. Managed Rules, exceções, regras existentes e mudanças de bloqueio continuam informativos e dependem de evolução específica.

Se a API confirmar uma escrita, mas não devolver IDs verificáveis, a proposta entra em `failed`; quando os IDs estiverem disponíveis, o rollback continua acessível. Remover a credencial de escrita não remove regras já aplicadas.

## Próxima etapa controlada

Antes de ampliar a escrita para Managed Rules ou exceções, criar fluxos independentes com allowlists próprias, canário, rollback e testes por plano. Até essa etapa estar validada, a única mutação externa permitida é a regra de rate limiting descrita acima; todo o restante permanece em observação.
