# Plano de resposta a incidentes

## Papéis

- Comandante: administrador da plataforma.
- Técnico: responsável por contenção, evidências e recuperação.
- Privacidade: responsável por avaliar dados pessoais e comunicações.
- Jurídico/contábil: consultado quando houver obrigação regulatória ou impacto fiscal.

Uma pessoa pode acumular papéis no início, mas cada decisão precisa constar no registro de incidentes.

## Fluxo

1. Detectar e abrir o incidente em `/api/admin/security/incidents`, preservando request IDs e horários.
2. Classificar severidade, categoria, sistemas, workspaces e dados possivelmente envolvidos.
3. Conter sem apagar evidências: revogar sessão, bloquear origem, girar credencial ou desativar funcionalidade.
4. Investigar usando logs mascarados. Não copiar XML, senha, token ou documento pessoal para o registro.
5. Avaliar comunicações à autoridade e aos titulares conforme a regulamentação vigente e orientação responsável.
6. Recuperar a partir de versão e backup verificados; validar autorização, integridade fiscal e faturamento.
7. Resolver somente depois de registrar causa, impacto, medidas e decisões de notificação.
8. Fazer revisão pós-incidente e transformar correções em testes.

Meta interna: incidente crítico reconhecido em até 30 minutos; avaliação inicial de privacidade em até 24 horas. Esses objetivos internos não substituem os prazos legais vigentes.

Se houver suspeita de segredo exposto, a rotação é obrigatória. Se houver risco de cálculo fiscal incorreto, resultados afetados devem ser invalidados até nova validação.

