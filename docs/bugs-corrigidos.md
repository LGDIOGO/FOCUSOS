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
| `failed` em data passada zerava a ofensiva de hoje | Atualizava a ofensiva sem checar se a data era hoje | ✅ `streakRule.test.ts` (regra extraída para `lib/utils/streakRule.ts`; `onMutate` e `mutationFn` chamam a mesma `decideStreakUpdate`) |
| Regra "só hoje altera a ofensiva" duplicada em `useHabits` (otimista e gravação) | Duas cópias de `if` sobre data/hoje, podiam divergir | ✅ `streakRule.test.ts` (passada, futura, failed passado, hoje marcar/repetir/desfazer, virada de dia) |
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
| Categorias criadas em outra área (ou sem `type`) não apareciam no seletor de hábito/compromisso (2026-10-23) | Filtro estrito `type === escopo` (commit 7156516) escondia categorias criadas em Configurações (que gravam o escopo escolhido lá) e docs antigos sem `type`. Causa exata não confirmada com dados reais | ✅ `lib/utils/__tests__/categories.test.ts` › `categoriesForScope` (REGRESSÃO: pessoais compartilham, legado visível, Trabalho isolado) |

## Interface

| Bug | Causa | Blindagem |
|---|---|---|
| ESC com sheet, mini-modal ou seletor aberto também fechava o modal de baixo e descartava o formulário | Cada overlay tratava ESC por conta própria, sem pilha | ✅ `lib/utils/__tests__/modalLogic.test.ts` › `createLayerStack` (REGRESSÃO: só o topo) |
| Banner "Nenhum dado encontrado para seu usuário" para toda conta nova, sobreposto ao relógio e sem como fechar | `FirestoreDiagnostic` tratava coleção de hábitos vazia como erro | ✅ `firestoreDiagnostic.test.ts` (`diagnoseProbe`) |
| Falso vazio e falso erro: lista vazia com falha de carregamento, erro de refetch apagando dados, orientação de primeiro uso com erro | Cada tela decidia vazio/erro sozinha, sem separar carregando, erro e vazio. Causa exata por tela não registrada `[verificar]` | ✅ `lib/utils/__tests__/viewState.test.ts` › `resolveViewState` e `isFirstUseSummary` (REGRESSÃO: falha sem dados não vira "primeiro uso"; erro com cache mantém o conteúdo) |

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


## PWA

| Bug | Causa | Blindagem |
|---|---|---|
| Excluir em massa (Agenda, Metas, Hábitos), excluir reserva (Finanças e Aposentadoria) e resetar histórico do Acompanhamento não faziam nada no PWA instalado | `window.confirm()` retorna `false` na hora no PWA (armadilha 12), então a ação nunca executava | ⚠️ trocado por confirmação inline (`DeleteButton`, bandeja "Sim, excluir"/"Cancelar", "Sim, apagar histórico"); sem teste (decisão é só UI); `grep -rn "confirm(" app components lib` deve dar só comentários (hoje: um, em `WorkItemModal.tsx`) |
| Lixeira de Agenda, Hábitos, Finanças e Notificações apagava com um toque, sem confirmação | Botão chamava a exclusão direto no `onClick` | ⚠️ `DeleteButton` (confirmação inline, foco no "Sim", devolve o foco ao cancelar); sem teste (UI). Verificar no PWA e no celular |
| Erro ao salvar e "faça login" (IA e onboarding) sumiam no PWA; copiar a chave de API falhava em silêncio | `alert()` é suprimido no PWA instalado e `navigator.clipboard.writeText` sem tratamento rejeita fora de HTTPS/permissão (iOS) | ✅ `lib/utils/__tests__/friendlySaveError.test.ts` e `copyText.test.ts`; UI trocada por `InlineNotice` (`role="alert"`) e `copyText` com fallback `execCommand` e chave selecionável (`manual`); `err.message` cru nunca é mostrado. UI não verificada no PWA/iOS |
