# Política de backup e restauração

Escopo: banco D1 de produção, migrations, código e configuração declarativa. Segredos não entram no backup SQL.

- Exportação remota e verificação estrutural: semanal.
- Teste de restauração em banco D1 dedicado e vazio: mensal.
- Teste extraordinário: antes de migration destrutiva ou depois de incidente de integridade.
- Retenção dos exports cifrados: 30 dias, com acesso restrito.
- Repositório Git: histórico do código e migrations; não substitui o backup do D1.

`npm run backup:verify` exporta para diretório temporário, verifica tabelas essenciais, registra tamanho e SHA-256 e apaga o SQL local ao terminar. O log nunca contém os dados.

Para restauração controlada:

```text
D1_RESTORE_TEST_DATABASE=<banco-dedicado-vazio>
D1_RESTORE_CONFIRM=RESTORE_DEDICATED_TEST_DATABASE
node scripts/d1-backup-verify.mjs --restore-test
```

O script bloqueia o uso do banco de produção como destino. Depois do teste, registrar data, commit, migration mais recente, checksum, duração e resultado em `docs/security/backup-test-log.md`. Falha de export, tabela ausente ou consulta inválida abre incidente e impede migration destrutiva.

