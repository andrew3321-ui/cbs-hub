# Operação da central de conteúdo tributário

Versão do processo: `tax-content.v1.0.0`  
Responsável editorial: CBSHub — Engenharia de regras fiscais

## Objetivo

Manter conteúdo público útil e rastreável sem confundir guia editorial com cálculo, parecer ou cobertura suportada pelo motor fiscal.

## Rotina automática

- Cada guia possui `reviewedAt`, `nextReviewAt`, versão, fontes e data de conferência em `domain/tax-content.ts`.
- A renderização chama `evaluateTaxContentFreshness` em toda requisição.
- Até 14 dias antes da revisão, o guia muda para `revisão próxima`.
- Depois de `nextReviewAt`, ou quando a fonte mais antiga supera 90 dias, o guia muda para `referência suspensa`.
- A suspensão preserva URL e histórico, mas remove qualquer apresentação de atualidade e mostra um aviso explícito.
- O monitor normativo diário continua detectando indisponibilidade ou alteração potencial nas fontes oficiais. Uma detecção não reescreve conteúdo nem cálculo automaticamente; ela abre a necessidade de revisão.

## Revisão após mudança normativa

1. Identificar o ato oficial, autoridade, URL final, publicação e produção de efeitos.
2. Determinar quais guias, regras e exemplos são impactados.
3. Atualizar fatos, limites e fonte sem transformar referência geral em conclusão universal.
4. Incrementar a versão do guia e acrescentar uma entrada no histórico.
5. Atualizar `reviewedAt` e `nextReviewAt` conforme criticidade.
6. Executar testes de catálogo, schema, sitemap, build e links.
7. Publicar uma nova versão; períodos e relatórios já congelados não são reescritos.

## Cadência

- Reforma Tributária: revisão quinzenal enquanto houver atos de transição em publicação.
- PIS/Cofins e retenções: revisão a cada 21 dias durante a transição.
- ICMS/ST, ISS, Simples e IPI/TIPI: revisão mensal, antecipada por alerta do monitor.
- Toda semana: verificar Search Console, páginas não indexadas, CTR, consultas e conversões sem associar consulta a pessoa.

## Critérios de qualidade

- Somente fontes primárias oficiais em HTTPS.
- Vigência, data de conferência, autoria institucional e histórico obrigatórios.
- Exemplo sempre rotulado como não sendo parecer.
- Nenhuma alíquota local, MVA, benefício, crédito ou retenção é herdada por similaridade.
- Conteúdo vencido falha fechado e não recebe selo de atualidade.
