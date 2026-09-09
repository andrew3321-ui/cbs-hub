# Especialização do agente — primeira etapa

Implementação local: `security-operations.v2`, catálogo `security-knowledge.2026-09-05.v1`.

## Capacidades entregues

- Preparação de pentest: procedimentos manuais ligados aos achados passivos, pré-requisitos para testes autenticados e critérios de reteste. O runner separado cobre somente crawl HTTPS seguro; não há exploração nem teste autenticado.
- Blue team: triagem de contagens agregadas informadas pelo operador para um domínio verificado. As métricas cobrem autenticação, MFA, WAF, respostas 5xx e alterações de privilégios. Nenhum conector de SIEM/EDR é anunciado como ativo.
- As análises usam a fila, limite diário, autorização vigente, verificação DNS, lease, retries e auditoria do agente existente. Jobs de blue team não adiam o monitoramento passivo.
- Terra faz a análise; o roteador pode chamar Sol para revisão. O procedimento e os playbooks são enviados em contexto. Respostas são validadas localmente quanto a formato, limites e referências de evidência antes de serem aceitas.
- Sinais de risco ou atenção criam achados deduplicados por ativo e código de evidência. O responsável registra investigação, mitigação, aceitação de risco ou falso positivo, atribui um membro e define prazo. Reaparecimento após mitigação reabre o achado; toda mudança gera evento separado.
- Falha da IA preserva a triagem determinística e identifica o provedor no relatório. Contagens informadas pelo operador têm limitações explícitas; o fallback informa confiança baixa.
- Cada evidência recebe uma entrada versionada que separa interpretação, limite, método de validação e referências oficiais. NIST CSF é objetivo de controle; OWASP WSTG é método de teste; MITRE ATT&CK é somente hipótese de ameaça. Nenhuma dessas referências transforma uma contagem ou cabeçalho em vulnerabilidade ou ataque confirmado.

## Catálogo de conhecimento

O catálogo fica em `domain/security-knowledge.ts` e é enviado ao modelo junto da evidência. O servidor continua aceitando apenas `evidenceCodes` realmente coletados. A interface mostra a base e o limite em cada achado, e os playbooks identificam se a validação depende de observação passiva, revisão manual de logs ou teste manual autorizado.

As referências consultadas são NIST CSF 2.0, OWASP WSTG 4.2/Latest e MITRE ATT&CK Enterprise. Entradas mutáveis do WSTG Latest carregam a data da consulta na versão do catálogo. O catálogo precisa de revisão explícita antes de trocar a versão; atualização de fonte não altera automaticamente regras, severidade ou conclusão.

## Entrada

`POST /api/security-agent`, ação `triage_telemetry`, com `scopeId`, `telemetryAuthorized: true` e `telemetry`:

```json
{
  "start": "2026-09-05T10:00:00Z",
  "end": "2026-09-05T11:00:00Z",
  "coverage": {
    "authentication": "complete",
    "perimeter": "complete",
    "application": "complete",
    "administration": "complete"
  },
  "metrics": {
    "failedLogins": 20,
    "successfulLogins": 3,
    "mfaFailures": 0,
    "wafBlocks": 100,
    "serverErrors": 10,
    "totalRequests": 1000,
    "privilegeChanges": 1
  }
}
```

Use janela de até 24 horas nos últimos 30 dias. A cobertura de cada família deve ser `complete`, `partial` ou `unavailable`; fonte parcial ou indisponível nunca gera sinal positivo. Todas as contagens são inteiras entre zero e um milhão; zero pressupõe cobertura completa, não dado ausente. `totalRequests` inclui bloqueios e 5xx, sem duplicar uma requisição. Campos desconhecidos, texto livre e contagens inconsistentes são recusados. Troque as datas do exemplo por uma janela recente.

Os limiares são heurísticos iniciais: concentração de falhas >=80% com ao menos 20 falhas; >=10 falhas MFA; >=5% respostas 5xx com ao menos 100 requisições. Bloqueios WAF e mudanças de privilégio pedem contexto, não confirmam comprometimento.

## Avaliação reproduzível

`npm run security:eval` executa oito casos sintéticos contra as regras e o fallback. O relatório declara `modelQualityMeasured: false`. Isso não mede qualidade de um modelo real nem resistência real a prompt injection.

`npm run security:eval -- --live` usa `OPENAI_API_KEY` do ambiente e os mesmos modelos/instruções do runtime. Faz chamadas pagas, registra somente resultados dos critérios, modelos e contagens de tokens. Não envia dados de clientes. O script exige referências válidas, alerta para escalonamento de risco desproporcional e verifica cobertura dos sinais esperados. A qualidade semântica ainda requer revisão de um analista; oito cenários não são um benchmark completo de pentest ou SOC.

Não houve fine-tuning dos pesos. A documentação oficial consultada informa que o fine-tuning está sendo descontinuado e fechado para novos usuários: https://developers.openai.com/api/docs/guides/model-optimization. Especialização por contexto, instruções e avaliações é distinta de treinar um modelo. Um dataset futuro deve conter casos revisados e sanitizados, respostas esperadas, proveniência e separação por organização/campanha entre treino e avaliação.

## Próximas etapas para pentest e blue team completos

1. Conectores de telemetria autenticados, cobertura/freshness dos feeds e correlação temporal de eventos, com segregação por workspace.
2. Gestão de achados e incidentes: responsável, SLA, evidências, revisão, contenção autorizada e confirmação de recuperação.
3. Runner isolado de validação ativa: escopo por alvo/técnica/janela, ferramentas e rede limitadas, credenciais temporárias, limites de execução e cancelamento. Iniciar em laboratório próprio; domínio verificado não autoriza testar infraestrutura compartilhada de terceiros.
4. Casos de laboratório com resultados conhecidos para avaliar falsos positivos, falsos negativos, respeito ao escopo, repetibilidade e qualidade de correção antes de habilitar novas ferramentas.

A migration `0054_security_findings_workflow.sql` adiciona achados e seus eventos. O modo adicional dos jobs é `blue_team`; `passive` permanece o modo do cron.
