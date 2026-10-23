# Time de agentes

Agentes especializados (subagentes do Claude Code) que trabalham no FocusOS **na ausência do Diogo**, sempre dentro das regras do [`CLAUDE.md`](../CLAUDE.md). Definições em `.claude/agents/`, comandos em `.claude/commands/`.

## Elenco

| Agente | Cargo | Faz | Edita | Modelo |
|---|---|---|---|---|
| `gerente-produto` | Gerente de Produto | Prioriza o backlog, escreve a especificação e o critério de pronto | só `docs/backlog.md`, `docs/pendencias.md` | sonnet |
| `dev-features` | Desenvolvedor | Implementa 1 item em branch de `develop`, com testes | código e testes | sonnet |
| `qa-testes` | QA / Testes | Amplia a suíte de regressão, extrai regras para funções testáveis | testes (+ extrações mínimas) | sonnet |
| `revisor-codigo` | Revisor | Revisa o diff antes do PR | nada (leitura) | sonnet |
| `seguranca` | Segurança e privacidade | Audita regras do Firestore, rotas de API, segredos, LGPD | nada (leitura) | sonnet |
| `ux-designer` | UX e acessibilidade | Revisa telas (mobile/PWA), estados vazios e de erro, textos | nada (leitura) | sonnet |
| `devops-release` | DevOps / Release | Confere CI e preview, abre PR `develop` → `main` | nada (leitura + `gh pr create`) | haiku |
| `estrategista-comercial` | Estratégia comercial | Posicionamento, lacunas para vender, planos e preço (hipóteses com fonte) | só `docs/comercial.md` | sonnet |
| `documentador` | Guardião da memória | Mantém `docs/` e `README.md` atualizados | só `.md` | haiku |

## Fluxo de um ciclo (`/ciclo`)

```
gerente-produto → dev-features → [qa-testes] → revisor-codigo → [seguranca] [ux-designer] → devops-release → documentador
   escolhe 1 item    código+testes   cobertura      diff           se tocou regras/rotas/telas     CI + preview + PR     docs
```
Entre colchetes: só quando o item tocou aquela área. O ciclo **termina em um PR aberto**. O Diogo valida o preview e dá o merge (merge = produção).

`/auditoria [seguranca|ux|comercial|testes|tudo]` roda análises **somente leitura** e termina com o backlog priorizado. Não muda código.

## Limites rígidos (valem para todos)

1. Nunca `main`: trabalham em `develop` ou branch derivada. Merge e deploy em produção são do Diogo.
2. Nunca segredos: não leem nem imprimem `.env.local`, não manuseiam chaves, não usam tokens para chamar APIs na mão. Credencial ou console de terceiros → param e pedem ao Diogo.
3. Bug = teste de regressão primeiro. `tsc` e `npm test` verdes antes de qualquer commit.
4. Dizem o que **não** verificaram. Telas logadas só são vistas pelo Diogo no preview.
5. Não ampliam escopo: bug novo no caminho vai para `docs/backlog.md`.
6. O classificador de permissões do Claude Code continua valendo; negativa dele não se contorna.

## Controle de custo (plano básico)

- **Nada roda sozinho.** Só roda o que o Diogo dispara (`/ciclo`, `/auditoria`). Agendamento (`/schedule`) é decisão futura, depois de medir um ciclo.
- Um item por ciclo; um agente por vez; respostas com limite de linhas (estão nas definições).
- Modelo barato (haiku) onde a tarefa é mecânica (documentação, checagem de CI).
- Agentes de análise são somente leitura e curtos. Para economizar, prefira `/auditoria seguranca` a `/auditoria tudo`.
- Auditorias repetem achados se nada mudou: rode só depois de mudanças relevantes.

## Como calibrar a frequência (a testar)

1. Rode **um** `/ciclo` e observe o consumo do plano ao fim (use `/cost` ou o painel de uso).
2. Com esse número real, decida: manual por sessão, ou agendado (ex.: semanal) via `/schedule`, ou só `/auditoria` agendada (mais barata).
3. Anote o resultado em [decisoes.md](decisoes.md) (quanto custou, cadência escolhida). **Sem medir, não há estimativa confiável.**

## Evolução

- Novos agentes só quando houver trabalho recorrente que nenhum atual cubra. Cada agente novo custa contexto.
- Staging (terceiro ambiente), Playwright para UI e emulador do Firestore são os passos naturais de maturidade; ver [backlog.md](backlog.md).
