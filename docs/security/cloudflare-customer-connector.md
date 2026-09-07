# Conector Cloudflare por cliente

O conector nativo associa uma zona Cloudflare a um escopo que já passou pela verificação DNS e mantém uma declaração de autorização vigente. A zona retornada pela API precisa ter exatamente o mesmo nome do domínio autorizado; autorizar apenas um subdomínio não permite conectar silenciosamente a zona superior.

## Credencial mínima

Crie um API Token dedicado, limitado a uma única zona, com:

- leitura de Zona;
- leitura de Rulesets/WAF.

A primeira versão é estritamente `observe_only`: não cria, edita nem remove regras. Permissões de escrita não são presumidas e a capacidade `rulesetsEdit` permanece falsa até existir um fluxo separado de elevação, aprovação humana e rollback.

## Proteção da credencial

`SECURITY_CONNECTOR_ENCRYPTION_KEY` deve ser um segredo aleatório e exclusivo, com no mínimo 32 caracteres, configurado apenas no Worker. O token é cifrado com AES-GCM, IV aleatório e dados autenticados que vinculam a credencial ao conector, ao escopo e à zona. A API nunca devolve o token depois da conexão.

Rotacionar o token substitui imediatamente o ciphertext anterior. Desconectar marca o conector como revogado e apaga ciphertext e IV. Nunca registre token, payload de autenticação ou plaintext em logs.

## Estados e auditoria

- `active`: token, zona e domínio foram validados;
- `error`: o teste de saúde falhou e o código sanitizado foi persistido;
- `paused`: ingestão pausada sem apagar a credencial;
- `revoked`: credencial apagada e conector encerrado.

Eventos de conexão, rotação, teste de saúde e desconexão entram em `security_defense_events`. O teste de saúde relê a zona e as capacidades; não executa mutações externas.

## Próxima etapa controlada

Antes de habilitar proteção externa, adicionar um fluxo explícito de elevação para WAF Edit, preview da regra, aprovação de proprietário/administrador, idempotência por regra, TTL, verificação pós-aplicação, revogação e rollback. Até essa etapa estar validada, todo domínio de cliente permanece em observação.

