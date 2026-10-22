# Documentação do FocusOS (palácio de memória)

Conhecimento do projeto organizado por **tema**, versionado no git. Vale para qualquer sessão do Claude Code e para qualquer pessoa.
O [`CLAUDE.md`](../CLAUDE.md) na raiz é a porta de entrada: regras curtas + links para cá.

| Doc | Para que serve | Quando atualizar |
|---|---|---|
| [ambientes.md](ambientes.md) | Dev vs. produção, fluxo de deploy, como criar o Firebase de dev | Mudou o fluxo, variáveis ou projetos |
| [testes.md](testes.md) | Como a suíte de regressão funciona e como escrever um teste | Mudou a estratégia de teste |
| [bugs-corrigidos.md](bugs-corrigidos.md) | Catálogo: bug → causa → teste que o blinda | **Toda** correção de bug |
| [armadilhas.md](armadilhas.md) | Pegadinhas técnicas que já custaram tempo | Achou uma nova |
| [decisoes.md](decisoes.md) | Decisões de arquitetura e o porquê (e o que foi descartado) | Decisão com trade-off |
| [modulos.md](modulos.md) | Como cada módulo funciona hoje | Mudou o comportamento de um módulo |
| [pendencias.md](pendencias.md) | Bloqueios e ideias não feitas | Algo foi resolvido ou surgiu |
| [backlog.md](backlog.md) | Fila priorizada de trabalho (mantida pelo gerente-produto) | Todo ciclo |
| [time-agentes.md](time-agentes.md) | Elenco de agentes, fluxo de ciclo, limites e controle de custo | Mudou o time |
| comercial.md | Estratégia comercial (criado pelo `estrategista-comercial`) | Auditoria comercial |

## Princípios

1. **Um fato, um lugar.** Não duplique; linke.
2. **Registre o porquê**, não só o quê. O código já diz o quê.
3. **Bug vira teste.** Se não tem teste, o bug volta.
4. Nada de segredos aqui. Nunca.
