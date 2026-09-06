# Defesa contínua do CBSHub

## Limite desta versão

O plano defensivo recebe sinais agregados e assinados de controles que já observam o ativo. Ele não substitui WAF, proteção DDoS, SIEM ou EDR. Um domínio externo permanece em `observe_only` até que um conector de enforcement daquele ambiente seja instalado. Somente o domínio servido pelo próprio Worker do CBSHub pode usar `cbshub_edge` nesta versão.

## Ingestão assinada

O proprietário ou administrador cria um conector para um domínio verificado. O segredo HMAC é derivado de `SECURITY_INGEST_SIGNING_KEY`, exibido uma vez e nunca persistido no D1. Cada requisição usa:

- `X-CBSHub-Connector-Id` com o identificador do conector;
- `X-CBSHub-Timestamp` com o horário Unix em segundos;
- `X-CBSHub-Signature` com `sha256=<HMAC-SHA256(segredo, timestamp + "." + corpo JSON bruto)>`.

Assinaturas fora da janela de cinco minutos são recusadas. `eventId` é idempotente por conector. Endereço IP é transformado por HMAC antes de ser persistido; o valor bruto não é salvo.

## Decisão e autonomia

A política `security-defense-policy.2026-09-05.v1` usa uma lista fechada de tipos de sinal. Somente três respostas podem gerar contenção automática, sempre com origem identificada, confiança alta e limiar mínimo:

| Sinal | Limiar | Resposta máxima |
|---|---:|---:|
| falhas concentradas de autenticação | 20 em até 5 minutos | bloqueio por 15 minutos |
| volume anormal de requisições | 600 em até 1 minuto | bloqueio por 10 minutos |
| tentativas repetidas de exploração | 10 em até 5 minutos | bloqueio por 30 minutos |

Persistência, evasão, exfiltração, malware, elevação de privilégio e atividade destrutiva criam incidente e ação pendente de investigação. Não existe execução automática de shell, isolamento permanente, exclusão, rotação de credenciais ou mudança de firewall.

Os bloqueios ativos expiram por cron a cada cinco minutos e podem ser revogados imediatamente na interface. Toda criação, rotação, pausa, contenção, revogação e expiração gera evento de auditoria.

## Formato mínimo do sinal

```json
{
  "eventId": "waf:event:00000001",
  "occurredAt": "2026-09-05T12:00:00.000Z",
  "type": "auth_failure_burst",
  "confidence": "high",
  "count": 30,
  "windowSeconds": 120,
  "sourceIp": "203.0.113.9",
  "resource": "/api/auth/login",
  "summary": "Falhas concentradas na mesma origem.",
  "attributes": { "provider": "cloudflare", "rule": "auth-rate" }
}
```

Não enviar logs brutos, credenciais, tokens, corpos de requisição ou dados pessoais desnecessários em `summary` e `attributes`.

## Próxima integração

Para proteger domínios de clientes será necessário um conector Cloudflare por zona, com autorização de menor privilégio. A aplicação deve registrar o identificador externo da regra, confirmar a propagação, manter rollback e nunca armazenar o token do cliente em texto puro no D1.

