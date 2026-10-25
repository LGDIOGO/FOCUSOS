// Regra única da ofensiva (streak) de hábito. Função PURA: sem Firebase/React e
// sem relógio interno; `today` (yyyy-MM-dd, fuso LOCAL) é sempre injetado.
//
// Regra real (preservada das duas cópias antigas em useHabits):
//  - Data futura: nada muda (ofensiva é sobre o que já aconteceu).
//  - Data passada (qualquer status, inclusive `failed`): nunca zera nem
//    incrementa; pede recálculo a partir dos logs. Se o status não for `done`,
//    a data marcada é excluída do cálculo.
//  - Hoje + `failed`: ofensiva 0 e last_completed_date null.
//  - Hoje + `done` (antes != done): sem última data -> 1; última == hoje ->
//    mantém; última == ocorrência agendada anterior -> +1; senão -> 1.
//  - Hoje + desfazer `done` (novo != done/failed): recalcula excluindo hoje.
//  - Demais casos de hoje (repetir a mesma marcação etc.): mantém.
// `prevScheduledDate` vem de getPrevScheduledDate (habitSchedule), que já
// respeita a recorrência; aqui não existe motor de recorrência.

export interface StreakInput {
  targetDate: string
  today: string
  status: string
  previousStatus: string
  currentStreak: number
  lastCompletedDate: string | null
  // lazy: só é consultada nos ramos que precisam (como nas cópias antigas)
  prevScheduledDate: () => string | null
}

export type StreakAction =
  | { type: 'keep' }
  | { type: 'set'; streak: number; lastDate: string | null }
  | {
      type: 'recompute'
      // data a excluir do recálculo a partir dos logs (undefined = nenhuma)
      excludeDate: string | undefined
      // valor aproximado para a UI otimista; null = não mexer até o servidor responder
      approximate: { streak: number; lastDate: string | null } | null
    }

export function decideStreakUpdate(i: StreakInput): StreakAction {
  if (i.targetDate > i.today) return { type: 'keep' }

  if (i.targetDate !== i.today) {
    return {
      type: 'recompute',
      excludeDate: i.status === 'done' ? undefined : i.targetDate,
      approximate: null,
    }
  }

  if (i.status === 'failed') return { type: 'set', streak: 0, lastDate: null }

  if (i.status === 'done' && i.previousStatus !== 'done') {
    let streak: number
    if (!i.lastCompletedDate) streak = 1
    else if (i.lastCompletedDate === i.targetDate) streak = i.currentStreak
    else if (i.lastCompletedDate === i.prevScheduledDate()) streak = i.currentStreak + 1
    else streak = 1
    return { type: 'set', streak, lastDate: i.targetDate }
  }

  if (i.previousStatus === 'done' && i.status !== 'done') {
    let approximate: { streak: number; lastDate: string | null } | null = null
    if (i.lastCompletedDate === i.targetDate) {
      const streak = Math.max(0, i.currentStreak - 1)
      approximate = { streak, lastDate: streak > 0 ? i.prevScheduledDate() : null }
    }
    return { type: 'recompute', excludeDate: i.targetDate, approximate }
  }

  return { type: 'keep' }
}
