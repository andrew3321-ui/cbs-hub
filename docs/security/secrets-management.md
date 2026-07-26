# Gestão e rotação de segredos

Segredos de produção devem existir somente em Cloudflare Workers Secrets ou em secrets protegidos do GitHub usados no deploy. Nunca entram em D1, código, `.env` versionado, screenshots, tickets, logs ou respostas da API.

Controles:

1. Executar `npm run security:secrets` antes de commit e no CI.
2. Rotacionar credenciais críticas a cada 90 dias.
3. Rotacionar imediatamente quando um valor for colado em conversa, screenshot, terminal compartilhado ou commit, mesmo que posteriormente apagado.
4. Criar o novo valor, cadastrar no Cloudflare, validar login/pagamento/webhook e somente então revogar o anterior.
5. Registrar data, responsável, sistema e resultado — nunca o valor — no log interno de mudanças.

Segredos abrangidos: token do Cloudflare, Access Token e segredo de webhook do Mercado Pago, `SECURITY_HASH_KEY` e futuras credenciais fiscais. Na rotação de `SECURITY_HASH_KEY`, o valor novo vira a chave atual e as chaves HMAC ainda abrangidas pelos 365 dias da antifraude ficam em `SECURITY_HASH_KEYS_PREVIOUS`. A aplicação consulta até oito versões e grava somente a atual. Depois do prazo, a versão antiga é removida do keyring.
