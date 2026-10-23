---
description: Roda UM ciclo do time de agentes (um item do backlog, do planejamento ao PR). Uso - /ciclo [item opcional]
---

Rode **um único ciclo** do time do FocusOS. Argumento opcional (item do backlog a priorizar): $ARGUMENTS

Siga `docs/time-agentes.md`. Regras de custo: um item por ciclo, um agente por vez, passe a cada agente só o que ele precisa e exija respostas curtas.

1. **gerente-produto**: escolhe o item (ou usa o do argumento) e escreve o critério de pronto em `docs/backlog.md`. Se o item for `[BLOQUEADO: Diogo]`, escolha outro.
2. **dev-features**: implementa em branch a partir de `develop` (testes primeiro em bug), com `tsc` e `npm test` verdes. Não pule para o próximo passo se estiverem vermelhos.
3. **qa-testes**: só se o item tocou lógica com cobertura fraca; amplia os testes da área.
4. **revisor-codigo**: revisa o diff. Se **BLOQUEADO**, volte ao dev-features (máx. 1 retorno; depois pare e reporte).
5. **seguranca** (se mexeu em regras, rotas ou dados) e **ux-designer** (se mexeu em tela): revisão somente leitura.
6. **devops-release**: confirma CI e preview da `develop` e **abre** o PR para `main`. Nunca faz merge.
7. **documentador**: atualiza `docs/`.

Ao final, entregue ao Diogo, em português e no máx. 15 linhas: o que mudou, link do PR, o que foi verificado e o que **não** foi, e a decisão que cabe a ele (revisar o preview e dar o merge).
Pare e pergunte se precisar de credencial, de console de terceiros ou de decisão de produto.
