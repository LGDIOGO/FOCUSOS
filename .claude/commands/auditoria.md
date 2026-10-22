---
description: Auditoria somente leitura do projeto (segurança, UX, comercial, testes). Barata - não altera código. Uso - /auditoria [seguranca|ux|comercial|testes|tudo]
---

Rode uma auditoria **somente leitura** do FocusOS. Foco: $ARGUMENTS (se vazio, rode apenas `seguranca` e `testes`, que são as de maior risco).

- `seguranca` -> agente **seguranca**
- `ux` -> agente **ux-designer** (peça as 3 telas mais usadas: Resumo, Hábitos, Trabalho)
- `comercial` -> agente **estrategista-comercial** (atualiza só `docs/comercial.md`)
- `testes` -> agente **qa-testes**, em modo análise: liste lacunas de cobertura por risco, **sem escrever testes**
- `tudo` -> os quatro, um de cada vez

Depois chame o **gerente-produto** UMA vez para transformar os achados em itens priorizados de `docs/backlog.md` (máx. 15 abertos). Entregue ao Diogo um resumo de no máx. 15 linhas, com os 3 achados mais importantes. Não implemente nada.
