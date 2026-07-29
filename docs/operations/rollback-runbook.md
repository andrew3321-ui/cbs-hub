# Rollback e recuperação

## Rollback de código

1. Identificar no `/api/health` e nos logs o `release.id` que iniciou a falha.
2. Pausar novos deploys e registrar o request ID de uma ocorrência.
3. No Cloudflare, selecionar a versão anterior conhecida e criar um deployment com 100% do tráfego nela.
4. Confirmar `/api/health`, login, cálculo, relatório e faturamento com `npm run smoke:production`.
5. Corrigir por nova pull request; não reescrever a migration ou o commit já publicado.

O rollback de código não desfaz schema. Mudanças de banco devem ser compatíveis com pelo menos a versão imediatamente anterior do Worker.

## Recuperação do D1

1. Não importar sobre produção durante o diagnóstico.
2. Exportar e verificar o banco com `npm run backup:verify`.
3. Criar ou esvaziar um D1 dedicado exclusivamente ao ensaio.
4. Executar:

```text
D1_RESTORE_TEST_DATABASE=<banco-dedicado>
D1_RESTORE_CONFIRM=RESTORE_DEDICATED_TEST_DATABASE
node scripts/d1-backup-verify.mjs --restore-test
```

5. Verificar tabelas essenciais e executar o smoke contra um Worker temporário ligado ao banco restaurado.
6. Registrar data, commit, migration, checksum e resultado em `docs/security/backup-test-log.md`.
7. Somente depois de validar a cópia, decidir entre Time Travel ou restauração controlada de produção.

O script recusa explicitamente usar `margem-clara-production` como banco de ensaio.

