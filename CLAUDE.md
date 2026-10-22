# FocusOS — regras para o Claude Code

Responda em português do Brasil, direto. Interface do app toda em português.
Este arquivo é curto de propósito. O detalhe está em [`docs/`](docs/README.md): **leia o doc do tema antes de mexer nele.**

## Fluxo (inegociável)

1. Trabalhe em **`develop`** (ou branch dela). **Nunca** faça push direto na `main` sem o Diogo pedir.
2. Antes de commitar: `npx tsc --noEmit` (tem de dar 0 erros) e `npm test` (tem de passar).
3. **Bug corrigido = teste de regressão.** Escreva primeiro o teste que reproduz o bug (ele falha), depois conserte (ele passa). Registre em [`docs/bugs-corrigidos.md`](docs/bugs-corrigidos.md).
4. `develop` → deploy de preview (ambiente de dev). Validado, abre PR `develop` → `main`. Push na `main` **publica em produção sozinho**.
5. Antes de qualquer ação irreversível ou que publique além do fluxo acima, **pergunte**.
6. Entregue completo, diga o que ficou de fora e por quê. "Não consegui verificar X" vale mais que afirmação sem prova.
7. Bug novo no caminho: conserte e conte, mas não amplie o escopo sem avisar.

## Nunca

- Executar `sync.bat` / `git-sync.sh` (fazem `git add .` + push direto na `main`).
- Commitar ou imprimir valores do `.env.local`. Não pedir nem manusear `FIREBASE_PRIVATE_KEY`.
- `vercel --prod` (o push já faz o deploy; o token da CLI expira).
- `curl` em loop no site de produção (dispara o Vercel Security Checkpoint). Use o navegador.
- Mexer nas branches antigas (`claude/*`, `feature/*`) sem pedido.
- Commitar `app/zzpreview/` (página temporária de verificação; apague junto com `.next/types/app/zzpreview`).
- Criar outro motor de recorrência. Só existe `lib/utils/recurrence.ts` (`occursOn`).

## Armadilhas técnicas (resumo — completo em [`docs/armadilhas.md`](docs/armadilhas.md))

- `tsconfig` target ES5: sem spread de `Map`/`Set`; use `Array.from`.
- Arquivos CRLF: edição multilinha por script falha em silêncio; use Edit com trecho exato.
- Firestore: um único `where('user_id','==',uid)` + filtro no cliente (evita índice composto). `undefined` é rejeitado; para apagar campo use `deleteField()`.
- `window.confirm()` não funciona no PWA instalado; confirme dentro da UI.
- Status é **por data** (`{id}_{yyyy-MM-dd}`). Marcar outro dia nunca altera o estado de hoje.
- Texto com acento no bundle de produção aparece escapado (`\xfa`); ao procurar string no deploy, use trecho sem acento.
- Mudou `firestore.rules`/`storage.rules`? O push **não** publica regras: `npx firebase-tools deploy --only firestore:rules` (ou `storage`), apontando para o projeto certo (dev ou prod).
- Telas logadas não são testáveis por você (sem credenciais). Use `app/zzpreview/page.tsx` com dados sintéticos, inspecione, apague.
- Modelos de IA são aposentados com frequência: edite as listas em `lib/ai/models.ts`.

## Mapa rápido

| Quero mexer em… | Veja |
|---|---|
| Recorrência, status por data | `lib/utils/recurrence.ts`, [`docs/armadilhas.md`](docs/armadilhas.md) |
| Módulo Trabalho | [`docs/modulos.md`](docs/modulos.md#trabalho) |
| Google Calendar | [`docs/modulos.md`](docs/modulos.md#google-calendar), `lib/utils/calendarScheduling.ts` |
| IA | [`docs/modulos.md`](docs/modulos.md#ia), `lib/ai/models.ts` |
| Ambientes dev/prod, deploy | [`docs/ambientes.md`](docs/ambientes.md) |
| Testes | [`docs/testes.md`](docs/testes.md) |
| Por que foi feito assim | [`docs/decisoes.md`](docs/decisoes.md) |
| O que está bloqueado | [`docs/pendencias.md`](docs/pendencias.md) |

## Manutenção do conhecimento

Ao terminar uma tarefa: aprendeu uma armadilha? → `docs/armadilhas.md`. Tomou uma decisão com trade-off? → `docs/decisoes.md`. Consertou bug? → `docs/bugs-corrigidos.md` + teste. Pendência mudou? → `docs/pendencias.md`. Doc desatualizado é pior que doc ausente: corrija ao notar.
