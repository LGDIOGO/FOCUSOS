import { Habit, Task, CalendarEvent } from '@/types'

/**
 * Calcula o progresso de um conjunto de itens (hábitos, tarefas, eventos)
 * Seguindo a regra: (Concluídos + Parciais * 0.5) / Total
 * Itens falhados, remarcados ou em branco contam no denominador mas não no numerador.
 */
export function calculateProgress(
  habits: { status: string }[] = [],
  tasks: { status?: string, done?: boolean }[] = [],
  events: { status: string }[] = []
) {
  let successPoints = 0
  let totalCount = 0

  // 1. Hábitos
  habits.forEach(h => {
    totalCount += 1
    if (h.status === 'done') successPoints += 1
    else if (h.status === 'partial') successPoints += 0.5
  })

  // 2. Tarefas / Rascunhos
  tasks.forEach(t => {
    totalCount += 1
    // Suportando tanto o campo .done quanto o status 'done'/'partial'
    if (t.status === 'done' || t.done === true) successPoints += 1
    else if (t.status === 'partial') successPoints += 0.5
  })

  // 3. Compromissos / Eventos
  events.forEach(e => {
    totalCount += 1
    if (e.status === 'done') successPoints += 1
    else if (e.status === 'partial') successPoints += 0.5
    // 'failed' e 'reschedule' (remarcados) não somam pontos, mas contam no total
  })

  if (totalCount === 0) return 0
  return Math.round((successPoints / totalCount) * 100)
}

/**
 * Calcula o progresso semanal acumulado
 */
export function calculateWeeklyProgress(
  daysData: { habits: any[], tasks: any[], events: any[] }[]
) {
  let totalSuccessPoints = 0
  let totalOverallCount = 0

  daysData.forEach(day => {
    const { habits, tasks, events } = day
    
    // Hábitos
    habits.forEach(h => {
      totalOverallCount += 1
      if (h.status === 'done') totalSuccessPoints += 1
      else if (h.status === 'partial') totalSuccessPoints += 0.5
    })

    // Tarefas
    tasks.forEach(t => {
      totalOverallCount += 1
      if (t.status === 'done' || t.done === true) totalSuccessPoints += 1
      else if (t.status === 'partial') totalSuccessPoints += 0.5
    })

    // Eventos
    events.forEach(e => {
      totalOverallCount += 1
      if (e.status === 'done') totalSuccessPoints += 1
      else if (e.status === 'partial') totalSuccessPoints += 0.5
    })
  })

  if (totalOverallCount === 0) return 0
  return Math.round((totalSuccessPoints / totalOverallCount) * 100)
}
