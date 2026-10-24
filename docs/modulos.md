# Módulos

Stack: Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion 12, TanStack Query, Firebase (Auth, Firestore, Storage no cliente; Admin no servidor), Groq + Gemini.
Módulos: Resumo, Agenda, Hábitos, Metas, Trabalho, Finanças, Aposentadoria/Reservas, Livros, Estudos, Insights, IA.
Acesso a dados: um hook por domínio em `lib/hooks/` (React Query + Firestore). Lógica pura em `lib/utils/`.

## Navegação
- **Celular/tablet retrato:** `components/layout/MobileNav.tsx` com 4 destinos fixos (Resumo, Agenda, Hábitos, Trabalho) e "Mais". O sheet "Mais" tem os demais destinos, Modo Foco, Configurações e Sair (com confirmação, `LogoutConfirm`).
- **Desktop:** `components/layout/Sidebar.tsx` é `hidden lg:flex`; só ícones entre `lg` e `xl`, completa a partir de `xl`. Tem Configurações e Sair também.
- Destinos e ordem em `lib/utils/navItems.ts` (`NAV_DESTINATIONS`, `PRIMARY_HREFS`, `MORE_HREFS`). Sidebar e barra usam a mesma ordem.
- `isRouteActive`: subrota destaca o pai (ex.: `/dashboard/habits/x` marca Hábitos); `/dashboard` só fica ativo na própria rota. `isMoreActive` marca "Mais" quando a rota atual é secundária.
- Tokens em `app/globals.css`: `--nav-h: 64px` (sem safe-area) e `--safe-*` (`env(safe-area-inset-*)`). Alturas de tela usam `dvh`, não `vh`/`h-screen`.
- Botão "Resetar Sistema" foi removido (não fazia nada).

## Modal base
`components/ui/Modal.tsx`: bottom sheet no celular, centralizado a partir de `sm`.
- Cabeçalho, corpo e rodapé fixos; só o corpo rola. Altura máx. `92dvh` (sheet de categoria: `88dvh`). Rodapé com Salvar sempre visível.
- `role="dialog"` e `aria-modal`. Trava o scroll do fundo (`lockBodyScroll`). Acompanha o teclado via `visualViewport` (`lib/utils/visualViewport.ts`).
- **ESC em camadas:** toda camada (modal, sheet, mini-modal, seletor de data, EmojiPicker) entra na mesma pilha (`layerStack` em `lib/utils/modalLogic.ts`, hook `components/ui/useModalLayer.ts`). ESC fecha só o topo.
- Fecha pelo fundo só se o ponteiro desceu e subiu no fundo (arrastar de dentro não fecha). Tab fica preso dentro (`nextFocusIndex`).
- Movimento reduzido: `MotionConfig reducedMotion="user"` em `components/Providers.tsx`.
- Usam o `Modal` base: Hábito, Compromisso, Tarefa, Meta, Trabalho e `CategoryManagerSheet`. `EmojiPicker` (sheet no celular) e `CustomDateTimePicker` usam só a pilha de ESC (`useModalLayer`).
- CPF e Paywall: não importam o base; só ajuste de rolagem em `CpfOnboarding` [verificar se o Paywall precisa de migração].
- Limitação: a animação de saída não roda, porque os chamadores não usam `AnimatePresence` (backlog).
- `GoalModal` e `WorkItemModal` forçam tema escuro (`forceDark`, tokens fixos): provisório, ver [decisoes.md](decisoes.md).

## Hábitos
- Ofensiva com período de graça (1/2/3 dias conforme 0-6 / 7-29 / 30+ de ofensiva) e escudos. Código: `lib/utils/scoring.ts`, `habitSchedule.ts`.
- Grades: `components/dashboard/HabitsMatrix.tsx` (períodos longos), `HabitsWeekGrid.tsx` (semana, quadrados 40px, % por dia).
- Marcar dia passado/futuro nunca afeta hoje.

## Trabalho
Rota `/dashboard/trabalho`. Coleções `work_items`, `work_logs`, `work_notes`. Abas: Hoje (padrão), Semana, Pendências, Relatório.
- Item: tipo, categoria, solicitante/área, data, hora, duração, prioridade, recorrência, data de término.
- **Carry-over:** não respondido reaparece por até 60 dias em "Vieram de dias anteriores"; status gravado na data original.
- Anotações append-only em `work_notes`; imagem via `uploadNoteAttachment` (**exige Storage ativado**).
- Relatório: aproveitamento (parcial = 0,5), por dia/categoria/solicitante; PDF pela impressão; copiar como texto. Só conta ocorrências até hoje.
- Excluir recorrente apaga a série inteira (logs e notas).
- **Tipos e categorias definidos pelo usuário** na coleção `categories` (`work_type`, `work_category`), com cor. `marketplace` = nome legado da categoria; `kind` = nome do tipo.
- Contas novas recebem 3 tipos (Tarefa, Reunião, Prazo) e 3 categorias (Trabalho, Pessoal, Projeto) via `useSeedDefaultLabelsOnce` (3 guardas + `settings.work_labels_seeded`). **Nunca tocar a conta do Diogo.**
- Categoria chamada exatamente **"Todos"** aparece ao filtrar qualquer categoria (exceto "Interno").

## Categorias
Coleção `categories`, escopos `habits | agenda | goals | work_type | work_category` (`lib/hooks/useCategories.ts`).
- **Pessoais compartilham:** `habits`, `agenda` e `goals` veem o mesmo conjunto (categoria criada em Hábitos aparece em Compromissos e Metas). Trabalho (`work_type`, `work_category`) fica isolado. Regra em `categoriesForScope` (`lib/utils/categories.ts`).
- **Legado:** doc sem `type` (ou com `type` desconhecido) aparece nos seletores pessoais. Não some.
- **Nome duplicado bloqueado** no mesmo grupo (`findDuplicateCategory`): ignora caixa, acentos e espaços; renomear não colide consigo mesma. Mensagem em `DUPLICATE_CATEGORY_MESSAGE`.
- **Componente único:** `components/dashboard/CategoryPicker.tsx` (chips roláveis, "+ Nova" inline que já seleciona a criada, "Gerenciar"). Usado por Hábito, Compromisso e Meta.
- **Gerenciar** = `CategoryManagerSheet`: editar (propaga emoji e cor ao modal que chamou), excluir com confirmação dentro da UI (nunca `window.confirm`; ver armadilha 12), ordenar.
- **Ordem:** campo `order` é opcional. Doc sem `order` vai para o fim (por data de criação; empate pela posição original). `sortCategories`, `moveCategory` (renumera tudo, nunca devolve `undefined`) e `selectionAfterDelete` (excluir a selecionada limpa a seleção) em `lib/utils/categories.ts`. Gravação em lote: `useReorderCategories`.
- Configurações (`SettingsModal`) ainda tem gestão própria, sem ordenar (backlog).

## Finanças
Wizard de configuração: flag em `settings/{uid}.finance_onboarded`, pulado se já houver dados. Resumo converte semanal/quinzenal/anual para equivalente mensal.

## IA
`/dashboard/ia` e `app/api/ai/*`. Chat com histórico em `localStorage`; recebe hábitos, metas, tarefas e eventos com IDs; cria em massa (`[SUGGESTIONS]`) e modifica/exclui (`[ACTIONS]`). Prompt recebe calendário de 21 dias pré-calculado. Modelos e cascata em `lib/ai/models.ts`.

## Google Calendar
Sincronização automática de **uma via** (app → Google): Compromissos, Trabalho, Hábitos. Série = um evento recorrente (RRULE em `lib/utils/calendarScheduling.ts`). Sem horário = 1h alocada nos vãos, sem sobrepor (hábitos sem hora por `sort_order`). Disparo agrupado e silencioso (`scheduleCalendarSync`). Rotas: `app/api/integrations/google-calendar/*`. Precisa de `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` e três `GOOGLE_CALENDAR_*`.

## Recorrência
Motor único `lib/utils/recurrence.ts` (`occursOn(rule, startISO, targetISO, endISO)`). Ver [decisoes.md](decisoes.md).

## Conta e LGPD
Exportar e apagar os próprios dados (LGPD art. 18). Na develop, falta PR; não testado no navegador com conta real.
- Rotas: `GET /api/account/export` (JSON para download) e `POST /api/account/delete` com corpo `{"confirm":"APAGAR"}`. Token Firebase verificado (`authWithFirebaseToken`, falha fechada). Rate limit por uid: 5 exportações e 3 exclusões a cada 10 min (`lib/server/rateLimit.ts`, em memória).
- Código: `app/api/account/*` só encaminha; regra HTTP em `lib/server/accountHandlers.ts`; lógica em `lib/server/userData.ts` (Admin injetado, testável); Admin real e Storage em `lib/server/accountAdmin.ts`; UI em `components/dashboard/AccountDataSection.tsx`, dentro de Configurações (`SettingsModal.tsx`).
- Coleções: `USER_COLLECTIONS` (filtro `user_id`), `USER_DOC_COLLECTIONS` (id = uid: profiles, settings, user_integrations), `USER_UID_FIELD_COLLECTIONS` (oauth_states, campo `uid`). Coleção nova com `user_id` entra aqui (armadilha 25).
- Exportação remove segredos (`refresh_token`, `access_token`, `key_hash`) em qualquer nível.
- Exclusão: apaga os dados, os arquivos do Storage por prefixo `work_notes/{uid}/` e, por último, o usuário no Auth. Se uma etapa de dados falha, o Auth não é apagado e a resposta é 500 genérico. `mp_payments` é exportada mas não apagada ([decisoes.md](decisoes.md)).
- Páginas `/privacidade` e `/termos` (`app/privacidade`, `app/termos`, casca em `components/legal/LegalShell.tsx`): públicas, com faixa "Rascunho — revisão jurídica pendente". Linkadas no login, no cadastro e nas Configurações.
- Pendente: reautenticação recente e Storage sem bucket (backlog item 10); e-mail de contato e revisão jurídica (pendências, item 9).
