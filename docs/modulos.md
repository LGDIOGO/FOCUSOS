# Módulos

Stack: Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion 12, TanStack Query, Firebase (Auth, Firestore, Storage no cliente; Admin no servidor), Groq + Gemini.
Módulos: Resumo, Agenda, Hábitos, Metas, Trabalho, Finanças, Aposentadoria/Reservas, Livros, Estudos, Insights, IA.
Acesso a dados: um hook por domínio em `lib/hooks/` (React Query + Firestore). Lógica pura em `lib/utils/`.

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

## Finanças
Wizard de configuração: flag em `settings/{uid}.finance_onboarded`, pulado se já houver dados. Resumo converte semanal/quinzenal/anual para equivalente mensal.

## IA
`/dashboard/ia` e `app/api/ai/*`. Chat com histórico em `localStorage`; recebe hábitos, metas, tarefas e eventos com IDs; cria em massa (`[SUGGESTIONS]`) e modifica/exclui (`[ACTIONS]`). Prompt recebe calendário de 21 dias pré-calculado. Modelos e cascata em `lib/ai/models.ts`.

## Google Calendar
Sincronização automática de **uma via** (app → Google): Compromissos, Trabalho, Hábitos. Série = um evento recorrente (RRULE em `lib/utils/calendarScheduling.ts`). Sem horário = 1h alocada nos vãos, sem sobrepor (hábitos sem hora por `sort_order`). Disparo agrupado e silencioso (`scheduleCalendarSync`). Rotas: `app/api/integrations/google-calendar/*`. Precisa de `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` e três `GOOGLE_CALENDAR_*`.

## Recorrência
Motor único `lib/utils/recurrence.ts` (`occursOn(rule, startISO, targetISO, endISO)`). Ver [decisoes.md](decisoes.md).
