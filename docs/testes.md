# Testes automatizados

## Filosofia

Cada bug corrigido vira um teste que reproduz o bug. Assim ele **não volta** (regressão), qualquer que seja o código mexido depois. A suíte cresce a cada correção e é o que permite andar para frente sem dar um passo adiante e dois para trás.

## Fluxo para corrigir um bug

1. Reproduza o bug **num teste** e rode: tem de **falhar** (prova que o teste enxerga o bug).
2. Corrija o código.
3. Rode de novo: tem de **passar**.
4. Prefixe o nome do teste com `REGRESSÃO:` e registre em [bugs-corrigidos.md](bugs-corrigidos.md).
5. Opcional, mas recomendado: reverta o conserto por um instante e confirme que o teste cai (teste de mutação manual).

## Comandos

```bash
npm test            # roda tudo uma vez (é o que o CI roda)
npm run test:watch  # reroda ao salvar
npx tsc --noEmit    # tipos (o build da Vercel NÃO checa)
```

## O que está coberto

| Arquivo | Cobre |
|---|---|
| `lib/utils/__tests__/recurrence.test.ts` | Motor único de recorrência: intervalos, `end_date` inclusivo, dia 31 em mês curto, bissexto |
| `lib/utils/__tests__/calendarScheduling.test.ts` | Conversão para RRULE; alocação de horários sem sobreposição |
| `lib/utils/__tests__/scoring.test.ts` | Pontuação diária, graça da ofensiva |
| `lib/utils/__tests__/habitSchedule.test.ts` | Ofensiva dos hábitos (cálculo por datas agendadas) |
| `lib/hooks/__tests__/work.test.ts` | Expansão de ocorrências do Trabalho (status por data), relatório |
| `lib/server/__tests__/account.test.ts` | LGPD: export e exclusão de conta; `USER_COLLECTIONS` cobre `lib/hooks`, servidor e `firestore.rules`; export sem segredos; sem `confirm` = 400; falha parcial não apaga o Auth; 401 e 429 |
| `lib/server/__tests__/guard.test.ts` | Guarda de `/api/ai/*`: 401 sem token, 413 corpo grande, 400 JSON inválido, 429 por uid |
| `lib/server/__tests__/payments.test.ts` | Mercado Pago: referência, preço vindo do servidor, valor/moeda do pagamento, assinatura do webhook (`x-signature`) |
| `lib/server/__tests__/origin.test.ts` | URL interna não depende do header `Host` |
| `lib/server/__tests__/rateLimit.test.ts` | Rate limit em memória: limite, janela, chaves independentes |
| `app/api/v1/__tests__/auth.test.ts` | `authWithFirebaseToken`: JWT forjado = 401 (REGRESSÃO); uid só vem do Admin SDK |
| `lib/utils/__tests__/firestoreDiagnostic.test.ts` | Diagnóstico do Firestore: conta nova sem dados não é erro (REGRESSÃO) |

## Onde a suíte NÃO chega (honestidade)

- **Telas e interação** (clicar, modais, PWA): sem teste. Hoje só lógica pura é testada.
- **Firestore real**: sem teste (precisaria do emulador). Lógica que mistura leitura/gravação com regra de negócio deve ser **extraída para função pura** antes de ser testada.
- **Google Calendar real**: RRULE e alocação são testados como lógica; o envio à API não.
- **Carry-over (arraste) de pendências do Trabalho**: a lógica ainda mora dentro de componente; extrair para função pura é o próximo passo para testá-la.
- **Exclusão de conta e Firestore real**: `account.test.ts` usa Admin falso injetado. Prova a lógica e a ordem das etapas, não as regras do Firestore nem a credencial real.

## Como escrever bem

- Teste **comportamento**, não implementação.
- Dados sintéticos e datas fixas (nunca `new Date()` sem controlar o relógio).
- Código que importa Firebase no topo: use `vi.mock('@/lib/firebase/config', ...)` (veja `work.test.ts`).
- Onde der, extraia a regra para `lib/utils/` (pura) em vez de testá-la dentro de um hook.

## CI

`.github/workflows/ci.yml` roda `tsc` + `npm test` em todo push de `develop`/`main` e em PRs para `main`.
Para o CI **bloquear** merges ruins, ative a proteção da `main` (Settings → Branches → exigir o check `verify`). Isso é feito pelo Diogo no GitHub.
