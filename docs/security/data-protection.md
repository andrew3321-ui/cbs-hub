# Governança de dados pessoais

Versão operacional: `2026.07.26-v1`.

O inventário executável está em `domain/privacy-governance.ts` e é publicado na página de privacidade. Cada categoria informa exemplos, finalidade, base legal, armazenamento, retenção e comportamento de exclusão.

Revisão obrigatória:

- mensalmente durante o desenvolvimento;
- antes de coletar um novo dado ou integrar um novo operador;
- depois de incidente, mudança legal ou alteração material de finalidade;
- com registro de versão no pull request.

Dados novos não entram em produção sem finalidade, base legal, prazo e regra de exclusão. XML fiscal bruto permanece proibido no banco. Exceções de retenção precisam indicar obrigação legal concreta; “pode ser útil” não é justificativa.

Os pedidos de acesso, correção e exclusão geram eventos pseudonimizados com request ID e retenção de 24 meses. Membros de escritório recebem somente os próprios dados pessoais; o conteúdo fiscal e empresarial pertence ao espaço e só entra no export do responsável.

