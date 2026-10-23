# Catálogo de bugs corrigidos

Formato: **bug** → causa → onde foi blindado. Todo bug novo entra aqui com o teste que o cobre.
Legenda: ✅ coberto por teste · ⚠️ corrigido mas **sem teste** (dívida: a lógica não é pura/testável ainda).

## Recorrência

| Bug | Causa | Blindagem |
|---|---|---|
| "Dia sim, dia não" caía todo dia nos hábitos | Cópia da lógica em `useHabits` ignorava `interval` no modo diário | ✅ `recurrence.test.ts` › diário |
| Séries de eventos com prazo nunca terminavam | Cópia em `useEvents` ignorava `end_date` | ✅ `recurrence.test.ts` › end_date |
| Item do dia 31 sumia em fev/abr/jun/set/nov | Comparava dia do mês sem prender ao tamanho do mês | ✅ `recurrence.test.ts` › mensal/anual |
| Intervalos escorregavam meio dia com mudança de fuso | Variantes por duração do date-fns (blocos de 24h) | ⚠️ decisão registrada em `decisoes.md`; teste de fuso pendente |

## Status por data

| Bug | Causa | Blindagem |
|---|---|---|
| Marcar um dia mexia em outros (cache otimista) | Escrevia o status em todos os dias do cache | ⚠️ lógica dentro do hook (`useHabits`) |
| Override do dashboard chaveado só por id | Faltava a data na chave | ⚠️ lógica dentro de componente |
| `failed` em data passada zerava a ofensiva de hoje | Atualizava a ofensiva sem checar se a data era hoje | ⚠️ parcial: `habitSchedule.test.ts` cobre o cálculo; a regra de "só hoje" está no hook |
| Status do Trabalho vazando entre dias | — | ✅ `work.test.ts` › "status é por data" |

## Firestore / dados

| Bug | Causa | Blindagem |
|---|---|---|
| Campos esvaziados na edição não eram apagados | Firestore rejeita `undefined`; o campo era ignorado | ⚠️ usar `deleteField()` (ver `armadilhas.md`) |
| Wizard de Finanças perguntava a cada acesso | Flag só no `localStorage` | ⚠️ agora em `settings/{uid}.finance_onboarded` |
| Resumo de Finanças somava valor de face | Não convertia semanal/quinzenal/anual para mensal | ⚠️ sem teste |

## IA

| Bug | Causa | Blindagem |
|---|---|---|
| 4 endpoints de IA retornando 500 | Groq/Gemini aposentaram modelos fixos no código | ⚠️ `lib/ai/models.ts` com cascata; sem teste da cascata |
| Modelo errava o dia da semana | Calculava datas sozinho | ⚠️ prompt recebe calendário de 21 dias pré-calculado |

## Categorias

| Bug | Causa | Blindagem |
|---|---|---|
| Modais de hábito/agenda/metas mostravam categorias de trabalho | Coleção compartilhada sem filtro por escopo | ⚠️ `useCategories('escopo')` |

## Interface

| Bug | Causa | Blindagem |
|---|---|---|
| Banner "Nenhum dado encontrado para seu usuário" para toda conta nova, sobreposto ao relógio e sem como fechar | `FirestoreDiagnostic` tratava coleção de hábitos vazia como erro | ✅ `firestoreDiagnostic.test.ts` (`diagnoseProbe`) |

## Próximos testes a escrever (dívida priorizada)

1. Extrair o **carry-over do Trabalho** para função pura e testar (janela de 60 dias, só a ocorrência mais recente em séries).
2. Extrair a **regra "só hoje altera a ofensiva"** do `useHabits` para função pura e testar.
3. Cascata de modelos de IA (`lib/ai/models.ts`) com cliente simulado.
4. Conversão de ciclos de Finanças para mensal.

## Segurança (auditoria de 2026-10-21)

| Bug | Causa | Blindagem |
|---|---|---|
| Qualquer pessoa forjava o uid de outra (`/v1/keys`, Google Calendar) | `authWithFirebaseToken` decodificava o JWT **sem verificar assinatura** quando o Admin SDK falhava | ✅ `app/api/v1/__tests__/auth.test.ts` (token forjado = `null`; falha fechada) |
| Plano Pro por centavos ou para outro uid | Checkout aceitava `userId` e `price` do corpo; webhook sem `x-signature` | ✅ `lib/server/__tests__/payments.test.ts` (valor, moeda, assinatura, replay, referência) |
| `/mcp` mandava a API key para o host do header `Host` | URL interna montada com `req.headers.host` | ✅ `lib/server/__tests__/origin.test.ts` |
| Rotas de IA abertas (custo + dados) | Sem auth nem limite | ✅ `lib/server/__tests__/guard.test.ts` (401/413/429/400) |
| Usuário se dava `is_paid` / reiniciava o teste grátis; reatribuía doc a outro uid | `firestore.rules`: `write` livre em `profiles`; `update` sem travar `user_id` | ⚠️ regras compilam (`--dry-run`), **sem teste automatizado** (não há emulador); verificar à mão com a conta de teste |
| Rota `admin/fix-rules` pública sobrescrevia as regras | Rota de manutenção sem auth | removida (e o `FirestoreDiagnostic` parou de chamá-la) |
| Leituras do Firestore negadas em produção (`permission-denied` em tudo) | Regra `isOwnerByField` usava `request.resource` em read/delete, onde ele não existe | ⚠️ sem teste (sem emulador); corrigido separando `update` (`userIdUnchanged`) das demais operações; armadilha 27 |
